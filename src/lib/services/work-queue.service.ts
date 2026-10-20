import { db } from '../db/connection';
import { approvalWorkflows, disbursementVouchers, fundClusters, registryObligations } from '../db/schema';
import { and, asc, eq, inArray, isNull } from 'drizzle-orm';
import { APPROVAL_STAGES } from './approval.service';
import { getSetting } from './settings.service';

/**
 * "What is waiting for me?" — one place that answers it for the approvals page,
 * the dashboard and the top-nav badge, so all three always agree.
 *
 * Every DV gets all four workflow stages created as `pending` up front, so a raw
 * "pending stage rows" query would show a DV that is still at Division in the
 * Director's queue too. Only the lowest pending stage of a DV is actionable.
 */

const PENDING_DV_STATUSES = ['draft', 'pending_budget', 'pending_accounting', 'pending_director'] as const;

const STAGE_ROLES: Record<string, readonly string[]> = Object.fromEntries(
  Object.values(APPROVAL_STAGES).map(stage => [stage.name, stage.roleNames])
);

export const STAGE_LABELS: Record<string, string> = {
  division: 'Division',
  budget: 'Budget',
  accounting: 'Accounting',
  director: 'Director',
};

/** Roles that certify obligation requests (mirrors the access policy) */
const OBLIGATION_APPROVER_ROLES = ['budget_officer', 'administrator'];

export interface QueueUser {
  id: number;
  roles: string[];
}

export interface DvQueueItem {
  dvId: number;
  dvNo: string;
  dvDate: Date | string;
  payeeName: string;
  particulars: string;
  amount: number;
  orsBursNo: string;
  fundClusterCode: string | null;
  stage: string;
  stageOrder: number;
  /** When the DV arrived at its current stage */
  waitingSince: Date;
  /** Why the user cannot act on it, when they hold the role but segregation of duties blocks them */
  blockedReason?: string;
}

export interface ObligationQueueItem {
  id: number;
  payee: string;
  particulars: string;
  amount: number;
  orsNumber: string | null;
  obligationDate: Date | string;
  createdAt: Date | string | null;
}

export interface WorkQueue {
  /** DVs at a stage this user may approve now */
  approvals: DvQueueItem[];
  /** DVs at the user's stage that segregation of duties stops them acting on */
  blocked: DvQueueItem[];
  /** Obligation requests awaiting certification (budget officers only) */
  obligations: ObligationQueueItem[];
  /** Number of items the user can act on */
  count: number;
}

function toNumber(value: string | number | null | undefined): number {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
}

export class WorkQueueService {
  /** DVs whose current stage the user is entitled to act on, oldest first */
  async getDvApprovals(user: QueueUser): Promise<{ approvals: DvQueueItem[]; blocked: DvQueueItem[] }> {
    const isAdmin = user.roles.includes('administrator');
    const userStages = Object.keys(STAGE_ROLES).filter(
      stage => isAdmin || STAGE_ROLES[stage].some(role => user.roles.includes(role))
    );

    if (userStages.length === 0) {
      return { approvals: [], blocked: [] };
    }

    const rows = await db
      .select({
        dvId: disbursementVouchers.id,
        dvNo: disbursementVouchers.dvNo,
        dvDate: disbursementVouchers.dvDate,
        payeeName: disbursementVouchers.payeeName,
        particulars: disbursementVouchers.particulars,
        amount: disbursementVouchers.amount,
        orsBursNo: disbursementVouchers.orsBursNo,
        createdBy: disbursementVouchers.createdBy,
        createdAt: disbursementVouchers.createdAt,
        fundClusterCode: fundClusters.code,
        stage: approvalWorkflows.stage,
        stageOrder: approvalWorkflows.stageOrder,
        stageStatus: approvalWorkflows.status,
        approverUserId: approvalWorkflows.approverUserId,
        actionDate: approvalWorkflows.actionDate,
      })
      .from(disbursementVouchers)
      .innerJoin(approvalWorkflows, eq(approvalWorkflows.dvId, disbursementVouchers.id))
      .leftJoin(fundClusters, eq(disbursementVouchers.fundClusterId, fundClusters.id))
      .where(and(inArray(disbursementVouchers.status, [...PENDING_DV_STATUSES]), isNull(disbursementVouchers.deletedAt)))
      .orderBy(asc(disbursementVouchers.id), asc(approvalWorkflows.stageOrder));

    const enforceSod = Boolean(await getSetting('enforce_segregation_of_duties').catch(() => false));

    // Group stage rows per DV
    const byDv = new Map<number, typeof rows>();
    for (const row of rows) {
      const list = byDv.get(row.dvId) ?? [];
      list.push(row);
      byDv.set(row.dvId, list);
    }

    const approvals: DvQueueItem[] = [];
    const blocked: DvQueueItem[] = [];

    for (const stages of byDv.values()) {
      const current = stages.find(s => s.stageStatus === 'pending');
      if (!current || !userStages.includes(current.stage)) continue;

      // The DV reached this stage when the previous stage was approved
      const previous = stages.filter(s => s.stageOrder < current.stageOrder && s.actionDate).at(-1);
      const waitingSince = new Date(previous?.actionDate ?? current.createdAt ?? current.dvDate);

      const item: DvQueueItem = {
        dvId: current.dvId,
        dvNo: current.dvNo,
        dvDate: current.dvDate,
        payeeName: current.payeeName,
        particulars: current.particulars,
        amount: toNumber(current.amount),
        orsBursNo: current.orsBursNo,
        fundClusterCode: current.fundClusterCode,
        stage: current.stage,
        stageOrder: current.stageOrder,
        waitingSince,
      };

      if (enforceSod) {
        if (current.createdBy === user.id) {
          item.blockedReason = 'You prepared this voucher';
        } else {
          const prior = stages.find(s => s.stageStatus === 'approved' && s.approverUserId === user.id);
          if (prior) item.blockedReason = `You approved the ${STAGE_LABELS[prior.stage].toLowerCase()} stage`;
        }
      }

      (item.blockedReason ? blocked : approvals).push(item);
    }

    const oldestFirst = (a: DvQueueItem, b: DvQueueItem) => a.waitingSince.getTime() - b.waitingSince.getTime();
    return { approvals: approvals.sort(oldestFirst), blocked: blocked.sort(oldestFirst) };
  }

  /** Pending obligation requests, for roles that certify them */
  async getObligationApprovals(user: QueueUser): Promise<ObligationQueueItem[]> {
    if (!user.roles.some(role => OBLIGATION_APPROVER_ROLES.includes(role))) return [];

    const rows = await db
      .select({
        id: registryObligations.id,
        payee: registryObligations.payee,
        particulars: registryObligations.particulars,
        amount: registryObligations.amount,
        orsNumber: registryObligations.orsNumber,
        obligationDate: registryObligations.obligationDate,
        createdAt: registryObligations.createdAt,
      })
      .from(registryObligations)
      .where(eq(registryObligations.status, 'pending'))
      .orderBy(asc(registryObligations.createdAt));

    return rows.map(row => ({ ...row, amount: toNumber(row.amount) }));
  }

  async getQueue(user: QueueUser): Promise<WorkQueue> {
    const [{ approvals, blocked }, obligations] = await Promise.all([
      this.getDvApprovals(user),
      this.getObligationApprovals(user),
    ]);
    return { approvals, blocked, obligations, count: approvals.length + obligations.length };
  }

  /** Badge count for the top nav; never throws so a DB hiccup can't break every page */
  async getCount(user: QueueUser): Promise<number> {
    try {
      return (await this.getQueue(user)).count;
    } catch (error) {
      console.error('Failed to count work queue:', error);
      return 0;
    }
  }

  /** The next DV the user can act on, skipping the one just handled */
  async getNextDv(user: QueueUser, excludeDvId: number): Promise<{ next: DvQueueItem | null; remaining: number }> {
    const { approvals } = await this.getDvApprovals(user);
    const others = approvals.filter(item => item.dvId !== excludeDvId);
    return { next: others[0] ?? null, remaining: others.length };
  }
}

export const workQueueService = new WorkQueueService();

/** "3 days", "5 hours", "just now" */
export function formatWaiting(since: Date, now = new Date()): string {
  const hours = Math.max(0, (now.getTime() - since.getTime()) / 36e5);
  if (hours < 1) return 'less than an hour';
  if (hours < 24) return `${Math.floor(hours)} hour${Math.floor(hours) === 1 ? '' : 's'}`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}
