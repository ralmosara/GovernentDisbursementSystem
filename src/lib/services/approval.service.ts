import { db } from '../db/connection';
import { approvalWorkflows, disbursementVouchers, userRoles, roles, users, auditLogs } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

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
  approverUserId?: number;
  status: ApprovalStatus;
  comments?: string;
  actionDate?: Date;
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
   * Approve a workflow stage
   */
  async approveStage(
    dvId: number,
    userId: number,
    comments?: string
  ): Promise<{ success: boolean; nextStage?: string; message: string }> {
    // Get current pending stage
    const currentStage = await this.getCurrentStage(dvId);

    if (!currentStage) {
      return { success: false, message: 'No pending approval stage found' };
    }

    // Verify user has permission for this stage
    const hasPermission = await this.userHasStagePermission(userId, currentStage.approverRoleId);
    if (!hasPermission) {
      return { success: false, message: 'User does not have permission for this approval stage' };
    }

    // Update workflow stage to approved
    await db
      .update(approvalWorkflows)
      .set({
        status: 'approved',
        approverUserId: userId,
        comments,
        actionDate: new Date(),
      })
      .where(eq(approvalWorkflows.id, currentStage.id!));

    // Log approval action for audit
    await db.insert(auditLogs).values({
      userId,
      action: 'approve_dv_stage',
      tableName: 'disbursement_vouchers',
      recordId: dvId,
      newValues: {
        stage: currentStage.stage,
        status: 'approved',
        comments,
        workflowId: currentStage.id,
      },
    });

    // Get next stage
    const nextStageData = await db
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

    // Update DV status
    if (nextStageData.length > 0) {
      const nextStage = nextStageData[0].stage;
      let dvStatus: string;

      switch (nextStage) {
        case 'budget':
          dvStatus = 'pending_budget';
          break;
        case 'accounting':
          dvStatus = 'pending_accounting';
          break;
        case 'director':
          dvStatus = 'pending_director';
          break;
        default:
          dvStatus = 'pending_budget';
      }

      await db
        .update(disbursementVouchers)
        .set({ status: dvStatus as any })
        .where(eq(disbursementVouchers.id, dvId));

      return {
        success: true,
        nextStage,
        message: `Approved. Now pending ${nextStage} approval.`,
      };
    } else {
      // All stages approved
      await db
        .update(disbursementVouchers)
        .set({ status: 'approved' })
        .where(eq(disbursementVouchers.id, dvId));

      return {
        success: true,
        message: 'DV fully approved and ready for payment processing.',
      };
    }
  }

  /**
   * Reject a workflow stage
   */
  async rejectStage(
    dvId: number,
    userId: number,
    comments: string
  ): Promise<{ success: boolean; message: string }> {
    // Get current pending stage
    const currentStage = await this.getCurrentStage(dvId);

    if (!currentStage) {
      return { success: false, message: 'No pending approval stage found' };
    }

    // Verify user has permission
    const hasPermission = await this.userHasStagePermission(userId, currentStage.approverRoleId);
    if (!hasPermission) {
      return { success: false, message: 'User does not have permission for this approval stage' };
    }

    if (!comments || comments.trim() === '') {
      return { success: false, message: 'Rejection comments are required' };
    }

    // Update workflow stage to rejected
    await db
      .update(approvalWorkflows)
      .set({
        status: 'rejected',
        approverUserId: userId,
        comments,
        actionDate: new Date(),
      })
      .where(eq(approvalWorkflows.id, currentStage.id!));

    // Log rejection action for audit
    await db.insert(auditLogs).values({
      userId,
      action: 'reject_dv_stage',
      tableName: 'disbursement_vouchers',
      recordId: dvId,
      newValues: {
        stage: currentStage.stage,
        status: 'rejected',
        comments,
        workflowId: currentStage.id,
      },
    });

    // Update DV status to rejected
    await db
      .update(disbursementVouchers)
      .set({ status: 'rejected' })
      .where(eq(disbursementVouchers.id, dvId));

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
