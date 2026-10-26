import { db } from '../db/connection';
import { approvalWorkflows, disbursementVouchers, userRoles, roles, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { logApprove, logReject } from '../middleware/audit-logger';
import { getSetting } from './settings.service';
import { ledgerService } from './ledger.service';

/** DV statuses in which the approval workflow may still act */
const PENDING_DV_STATUSES: string[] = ['draft', 'pending_budget', 'pending_accounting', 'pending_director'];

/** DV status to set when the given stage becomes the current pending stage */
const STAGE_TO_DV_STATUS = {
  division: 'pending_budget',
  budget: 'pending_budget',
  accounting: 'pending_accounting',
  director: 'pending_director',
} as const;

/**
 * Approval workflow stages in order
 */
export const APPROVAL_STAGES = {
  DIVISION: { name: 'division', order: 1, roleNames: ['division_staff', 'administrator'] },
  BUDGET: { name: 'budget', order: 2, roleNames: ['budget_officer', 'administrator'] },
  ACCOUNTING: { name: 'accounting', order: 3, roleNames: ['accountant', 'administrator'] },
  DIRECTOR: { name: 'director', order: 4, roleNames: ['director', 'administrator'] },
} as const;

export type ApprovalStage = typeof APPROVAL_STAGES[keyof typeof APPROVAL_STAGES]['name'];
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'skipped';

export interface WorkflowStageData {
  id?: number;
  dvId: number;
  stage: ApprovalStage;
  stageOrder: number;
  approverRoleId: number;
  approverUserId?: number | null;
  status: ApprovalStatus | null;
  comments?: string | null;
  actionDate?: Date | null;
}

export class ApprovalService {
  /**
   * Initialize approval workflow for a new DV
   * Creates all workflow stages with pending status
   */
  async initializeWorkflow(dvId: number): Promise<void> {
    // Get role IDs for each stage
    const stageRoles = await this.getStageRoles();

    const workflowStages: WorkflowStageData[] = [
      {
        dvId,
        stage: APPROVAL_STAGES.DIVISION.name,
        stageOrder: APPROVAL_STAGES.DIVISION.order,
        approverRoleId: stageRoles.division,
        status: 'pending',
      },
      {
        dvId,
        stage: APPROVAL_STAGES.BUDGET.name,
        stageOrder: APPROVAL_STAGES.BUDGET.order,
        approverRoleId: stageRoles.budget,
        status: 'pending',
      },
      {
        dvId,
        stage: APPROVAL_STAGES.ACCOUNTING.name,
        stageOrder: APPROVAL_STAGES.ACCOUNTING.order,
        approverRoleId: stageRoles.accounting,
        status: 'pending',
      },
      {
        dvId,
        stage: APPROVAL_STAGES.DIRECTOR.name,
        stageOrder: APPROVAL_STAGES.DIRECTOR.order,
        approverRoleId: stageRoles.director,
        status: 'pending',
      },
    ];

    await db.insert(approvalWorkflows).values(workflowStages);
  }

  /**
   * Get role IDs for workflow stages
   */
  private async getStageRoles(): Promise<Record<string, number>> {
    const allRoles = await db.select().from(roles);

    return {
      division: allRoles.find(r => r.name === 'division_staff')?.id || 1,
      budget: allRoles.find(r => r.name === 'budget_officer')?.id || 2,
      accounting: allRoles.find(r => r.name === 'accountant')?.id || 3,
      director: allRoles.find(r => r.name === 'director')?.id || 4,
    };
  }

  /**
   * Get current pending stage for a DV
   */
  async getCurrentStage(dvId: number): Promise<WorkflowStageData | null> {
    const stages = await db
      .select()
      .from(approvalWorkflows)
      .where(
        and(
          eq(approvalWorkflows.dvId, dvId),
          eq(approvalWorkflows.status, 'pending')
        )
      )
      .orderBy(approvalWorkflows.stageOrder)
      .limit(1);

    return stages[0] || null;
  }

  /**
   * Get all workflow stages for a DV
   */
  async getWorkflowStages(dvId: number): Promise<WorkflowStageData[]> {
    return await db
      .select()
      .from(approvalWorkflows)
      .where(eq(approvalWorkflows.dvId, dvId))
      .orderBy(approvalWorkflows.stageOrder);
  }

  /**
   * Validate that a user may act on the DV's current stage.
   * Returns the stage to act on, or a failure message.
   */
  private async authorizeStageAction(
    dvId: number,
    userId: number
  ): Promise<{ ok: true; stage: WorkflowStageData } | { ok: false; message: string }> {
    const dvRows = await db
      .select({ status: disbursementVouchers.status, createdBy: disbursementVouchers.createdBy })
      .from(disbursementVouchers)
      .where(eq(disbursementVouchers.id, dvId))
      .limit(1);

    const dv = dvRows[0];
    if (!dv) {
      return { ok: false, message: 'Disbursement voucher not found' };
    }

    // A rejected, cancelled, approved or paid DV must never re-enter the workflow
    if (!dv.status || !PENDING_DV_STATUSES.includes(dv.status)) {
      return { ok: false, message: `This DV is not awaiting approval (status: ${dv.status})` };
    }

    const currentStage = await this.getCurrentStage(dvId);
    if (!currentStage) {
      return { ok: false, message: 'No pending approval stage found' };
    }

    const hasPermission = await this.userHasStagePermission(userId, currentStage.approverRoleId);
    if (!hasPermission) {
      return { ok: false, message: 'User does not have permission for this approval stage' };
    }

    if (await getSetting('enforce_segregation_of_duties')) {
      if (dv.createdBy === userId) {
        return {
          ok: false,
          message:
            'Segregation of duties: you prepared this DV and cannot act on its approval. ' +
            'For single-user test environments an administrator can disable this in Admin → Settings → Security.',
        };
      }

      const stages = await this.getWorkflowStages(dvId);
      const priorStage = stages.find(s => s.status === 'approved' && s.approverUserId === userId);
      if (priorStage) {
        return {
          ok: false,
          message: `Segregation of duties: you already approved the ${priorStage.stage} stage of this DV.`,
        };
      }
    }

    return { ok: true, stage: currentStage };
  }

  /**
   * Approve a workflow stage
   */
  async approveStage(
    dvId: number,
    userId: number,
    comments?: string
  ): Promise<{ success: boolean; nextStage?: string; message: string }> {
    const auth = await this.authorizeStageAction(dvId, userId);
    if (!auth.ok) {
      return { success: false, message: auth.message };
    }
    const currentStage = auth.stage;

    const outcome = await db.transaction(async (tx) => {
      // Only transition a stage that is still pending, so two approvers acting at the
      // same moment cannot both succeed
      const [updateResult] = await tx
        .update(approvalWorkflows)
        .set({
          status: 'approved',
          approverUserId: userId,
          comments,
          actionDate: new Date(),
        })
        .where(and(eq(approvalWorkflows.id, currentStage.id!), eq(approvalWorkflows.status, 'pending')));

      if (updateResult.affectedRows === 0) {
        return null;
      }

      const nextStageData = await tx
        .select()
        .from(approvalWorkflows)
        .where(and(eq(approvalWorkflows.dvId, dvId), eq(approvalWorkflows.status, 'pending')))
        .orderBy(approvalWorkflows.stageOrder)
        .limit(1);

      const nextStage = nextStageData[0]?.stage;
      const dvStatus = nextStage ? STAGE_TO_DV_STATUS[nextStage] : 'approved';

      await tx
        .update(disbursementVouchers)
        .set({ status: dvStatus })
        .where(eq(disbursementVouchers.id, dvId));

      return { nextStage };
    });

    if (!outcome) {
      return {
        success: false,
        message: 'This approval stage was just acted on by another user. Refresh the page to see its current status.',
      };
    }

    // Log approval action for audit
    await logApprove('disbursement_vouchers', dvId, userId, {
      stage: currentStage.stage,
      status: 'approved',
      comments,
      workflowId: currentStage.id,
    });

    // Fully approved: recognise the expense and liability in the books
    if (!outcome.nextStage) {
      await ledgerService.tryPost(`DV #${dvId} approval`, () => ledgerService.postDvApproval(dvId, userId));
      await ledgerService.tryPost(`DV #${dvId} advances`, () => ledgerService.postAdvancesForDv(dvId, userId));
      await ledgerService.tryPost(`DV #${dvId} stock receipts`, () => ledgerService.postStockReceiptsForDv(dvId, userId));
    }

    if (outcome.nextStage) {
      return {
        success: true,
        nextStage: outcome.nextStage,
        message: `Approved. Now pending ${outcome.nextStage} approval.`,
      };
    }

    return {
      success: true,
      message: 'DV fully approved and ready for payment processing.',
    };
  }

  /**
   * Reject a workflow stage
   */
  async rejectStage(
    dvId: number,
    userId: number,
    comments: string
  ): Promise<{ success: boolean; message: string }> {
    if (!comments || comments.trim() === '') {
      return { success: false, message: 'Rejection comments are required' };
    }

    const auth = await this.authorizeStageAction(dvId, userId);
    if (!auth.ok) {
      return { success: false, message: auth.message };
    }
    const currentStage = auth.stage;

    const rejected = await db.transaction(async (tx) => {
      const [updateResult] = await tx
        .update(approvalWorkflows)
        .set({
          status: 'rejected',
          approverUserId: userId,
          comments: comments.trim(),
          actionDate: new Date(),
        })
        .where(and(eq(approvalWorkflows.id, currentStage.id!), eq(approvalWorkflows.status, 'pending')));

      if (updateResult.affectedRows === 0) {
        return false;
      }

      // Close out the later stages so the rejected DV cannot be approved further
      await tx
        .update(approvalWorkflows)
        .set({ status: 'skipped' })
        .where(and(eq(approvalWorkflows.dvId, dvId), eq(approvalWorkflows.status, 'pending')));

      await tx
        .update(disbursementVouchers)
        .set({ status: 'rejected' })
        .where(eq(disbursementVouchers.id, dvId));

      return true;
    });

    if (!rejected) {
      return {
        success: false,
        message: 'This approval stage was just acted on by another user. Refresh the page to see its current status.',
      };
    }

    // Log rejection action for audit
    await logReject('disbursement_vouchers', dvId, userId, `${currentStage.stage}: ${comments.trim()}`);

    return {
      success: true,
      message: 'DV has been rejected.',
    };
  }

  /**
   * Check if user has permission for a specific approval stage
   */
  private async userHasStagePermission(userId: number, requiredRoleId: number): Promise<boolean> {
    const userRolesList = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    // Check if user has the required role or is an administrator
    const adminRole = await db
      .select()
      .from(roles)
      .where(eq(roles.name, 'administrator'))
      .limit(1);

    const hasRequiredRole = userRolesList.some(ur => ur.roleId === requiredRoleId);
    const isAdmin = adminRole.length > 0 && userRolesList.some(ur => ur.roleId === adminRole[0].id);

    return hasRequiredRole || isAdmin;
  }

  /**
   * Get pending approvals for a user
   */
  async getPendingApprovalsForUser(userId: number): Promise<any[]> {
    // Get user's roles
    const userRolesList = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    if (userRolesList.length === 0) {
      return [];
    }

    const roleIds = userRolesList.map(ur => ur.roleId);

    // Get pending workflows where user has the required role
    const pendingWorkflows = await db
      .select({
        workflowId: approvalWorkflows.id,
        dvId: approvalWorkflows.dvId,
        stage: approvalWorkflows.stage,
        stageOrder: approvalWorkflows.stageOrder,
        approverRoleId: approvalWorkflows.approverRoleId,
        dvNo: disbursementVouchers.dvNo,
        payeeName: disbursementVouchers.payeeName,
        amount: disbursementVouchers.amount,
        dvDate: disbursementVouchers.dvDate,
        particulars: disbursementVouchers.particulars,
      })
      .from(approvalWorkflows)
      .innerJoin(disbursementVouchers, eq(approvalWorkflows.dvId, disbursementVouchers.id))
      .where(eq(approvalWorkflows.status, 'pending'))
      .orderBy(disbursementVouchers.createdAt);

    // Filter by user's roles
    return pendingWorkflows.filter(w => roleIds.includes(w.approverRoleId));
  }

  /**
   * Get approval history for a DV
   */
  async getApprovalHistory(dvId: number): Promise<any[]> {
    const history = await db
      .select({
        id: approvalWorkflows.id,
        dvId: approvalWorkflows.dvId,
        stage: approvalWorkflows.stage,
        stageOrder: approvalWorkflows.stageOrder,
        approverRoleId: approvalWorkflows.approverRoleId,
        approverUserId: approvalWorkflows.approverUserId,
        status: approvalWorkflows.status,
        comments: approvalWorkflows.comments,
        actionDate: approvalWorkflows.actionDate,
        approverFirstName: users.firstName,
        approverLastName: users.lastName,
        approverEmail: users.email,
        approverPosition: users.position,
      })
      .from(approvalWorkflows)
      .leftJoin(users, eq(approvalWorkflows.approverUserId, users.id))
      .where(eq(approvalWorkflows.dvId, dvId))
      .orderBy(approvalWorkflows.stageOrder);

    return history;
  }
}

export const approvalService = new ApprovalService();
