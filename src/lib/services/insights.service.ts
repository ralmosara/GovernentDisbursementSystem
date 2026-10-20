import { db } from '../db/connection';
import { approvalWorkflows, disbursementVouchers, registryObligations, auditLogs } from '../db/schema';
import { and, asc, desc, eq, gte, inArray, isNull, notInArray, or, sql, sum } from 'drizzle-orm';
import { STAGE_LABELS } from './work-queue.service';

/**
 * Process telemetry and form assistance, built only from data the system already
 * records. Nothing here leaves the server or calls an external model: suggestions
 * are deterministic and every override is written to the audit log.
 */

const STAGES = ['division', 'budget', 'accounting', 'director'] as const;
const CLOSED_DV_STATUSES = ['rejected', 'cancelled'] as const;
const OPEN_DV_STATUSES = ['draft', 'pending_budget', 'pending_accounting', 'pending_director'] as const;

function toNumber(value: string | number | null | undefined): number {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

export interface StageCycleTime {
  stage: string;
  label: string;
  /** Approvals measured */
  count: number;
  medianHours: number;
  p90Hours: number;
}

export interface QueueAge {
  stage: string;
  label: string;
  open: number;
  /** Open items by days waiting: <1, 1–3, 3–7, >7 */
  buckets: [number, number, number, number];
  oldestDays: number;
}

export interface DuplicateCandidate {
  id: number;
  dvNo: string;
  dvDate: Date | string;
  payeeName: string;
  amount: number;
  status: string | null;
  reason: string;
}

export class InsightsService {
  /**
   * How long each approval stage takes. A stage's clock starts when the previous
   * stage was approved (or when the DV was created, for the first stage).
   */
  async getApprovalCycleTimes(sinceDays = 90): Promise<{ stages: StageCycleTime[]; endToEnd: StageCycleTime }> {
    const since = new Date(Date.now() - sinceDays * 864e5);

    const rows = await db
      .select({
        dvId: approvalWorkflows.dvId,
        stage: approvalWorkflows.stage,
        stageOrder: approvalWorkflows.stageOrder,
        status: approvalWorkflows.status,
        actionDate: approvalWorkflows.actionDate,
        dvCreatedAt: disbursementVouchers.createdAt,
      })
      .from(approvalWorkflows)
      .innerJoin(disbursementVouchers, eq(approvalWorkflows.dvId, disbursementVouchers.id))
      .where(gte(disbursementVouchers.createdAt, since))
      .orderBy(asc(approvalWorkflows.dvId), asc(approvalWorkflows.stageOrder));

    const durations: Record<string, number[]> = Object.fromEntries(STAGES.map(s => [s, []]));
    const endToEnd: number[] = [];

    let currentDv = -1;
    let clockStart: Date | null = null;
    let created: Date | null = null;

    for (const row of rows) {
      if (row.dvId !== currentDv) {
        currentDv = row.dvId;
        created = row.dvCreatedAt ? new Date(row.dvCreatedAt) : null;
        clockStart = created;
      }
      if (row.status !== 'approved' || !row.actionDate || !clockStart) {
        clockStart = null; // later stages of this DV can't be timed reliably
        continue;
      }
      const acted = new Date(row.actionDate);
      durations[row.stage]?.push(Math.max(0, (acted.getTime() - clockStart.getTime()) / 36e5));
      clockStart = acted;
      if (row.stage === 'director' && created) {
        endToEnd.push(Math.max(0, (acted.getTime() - created.getTime()) / 36e5));
      }
    }

    const summarise = (stage: string, label: string, values: number[]): StageCycleTime => ({
      stage,
      label,
      count: values.length,
      medianHours: median(values),
      p90Hours: percentile(values, 90),
    });

    return {
      stages: STAGES.map(stage => summarise(stage, STAGE_LABELS[stage], durations[stage])),
      endToEnd: summarise('all', 'Created to fully approved', endToEnd),
    };
  }

  /** Open DVs grouped by the stage they are waiting at, with how long they have waited */
  async getQueueAges(now = new Date()): Promise<QueueAge[]> {
    const rows = await db
      .select({
        dvId: approvalWorkflows.dvId,
        stage: approvalWorkflows.stage,
        stageOrder: approvalWorkflows.stageOrder,
        status: approvalWorkflows.status,
        actionDate: approvalWorkflows.actionDate,
        dvCreatedAt: disbursementVouchers.createdAt,
      })
      .from(approvalWorkflows)
      .innerJoin(disbursementVouchers, eq(approvalWorkflows.dvId, disbursementVouchers.id))
      .where(and(inArray(disbursementVouchers.status, [...OPEN_DV_STATUSES]), isNull(disbursementVouchers.deletedAt)))
      .orderBy(asc(approvalWorkflows.dvId), asc(approvalWorkflows.stageOrder));

    const ages: Record<string, number[]> = Object.fromEntries(STAGES.map(s => [s, []]));
    const byDv = new Map<number, typeof rows>();
    for (const row of rows) byDv.set(row.dvId, [...(byDv.get(row.dvId) ?? []), row]);

    for (const stages of byDv.values()) {
      const current = stages.find(s => s.status === 'pending');
      if (!current) continue;
      const previous = stages.filter(s => s.stageOrder < current.stageOrder && s.actionDate).at(-1);
      const since = new Date(previous?.actionDate ?? current.dvCreatedAt ?? now);
      ages[current.stage]?.push((now.getTime() - since.getTime()) / 864e5);
    }

    return STAGES.map(stage => {
      const days = ages[stage];
      return {
        stage,
        label: STAGE_LABELS[stage],
        open: days.length,
        buckets: [
          days.filter(d => d < 1).length,
          days.filter(d => d >= 1 && d < 3).length,
          days.filter(d => d >= 3 && d < 7).length,
          days.filter(d => d >= 7).length,
        ],
        oldestDays: days.length ? Math.floor(Math.max(...days)) : 0,
      };
    });
  }

  /**
   * Live DVs that look like the one being prepared: same payee and amount within
   * `withinDays`, or the same ORS/BURS number and amount at any time.
   */
  async findPossibleDuplicates(input: {
    payeeName: string;
    amount: number;
    orsBursNo?: string;
    excludeId?: number;
    withinDays?: number;
  }): Promise<DuplicateCandidate[]> {
    const payee = input.payeeName.trim().toLowerCase();
    if (!payee || !(input.amount > 0)) return [];

    const since = new Date(Date.now() - (input.withinDays ?? 90) * 864e5);
    const amount = input.amount.toFixed(2);

    const samePayee = and(
      sql`LOWER(TRIM(${disbursementVouchers.payeeName})) = ${payee}`,
      gte(disbursementVouchers.createdAt, since)
    );
    const sameOrs = input.orsBursNo?.trim()
      ? eq(disbursementVouchers.orsBursNo, input.orsBursNo.trim())
      : undefined;

    const rows = await db
      .select({
        id: disbursementVouchers.id,
        dvNo: disbursementVouchers.dvNo,
        dvDate: disbursementVouchers.dvDate,
        payeeName: disbursementVouchers.payeeName,
        amount: disbursementVouchers.amount,
        orsBursNo: disbursementVouchers.orsBursNo,
        status: disbursementVouchers.status,
      })
      .from(disbursementVouchers)
      .where(
        and(
          eq(disbursementVouchers.amount, amount),
          sameOrs ? or(samePayee, sameOrs) : samePayee,
          notInArray(disbursementVouchers.status, [...CLOSED_DV_STATUSES]),
          isNull(disbursementVouchers.deletedAt)
        )
      )
      .orderBy(desc(disbursementVouchers.createdAt))
      .limit(5);

    return rows
      .filter(row => row.id !== input.excludeId)
      .map(row => ({
        id: row.id,
        dvNo: row.dvNo,
        dvDate: row.dvDate,
        payeeName: row.payeeName,
        amount: toNumber(row.amount),
        status: row.status,
        reason:
          row.payeeName.trim().toLowerCase() === payee
            ? 'Same payee and amount'
            : 'Same ORS/BURS number and amount',
      }));
  }

  /** The obligation behind an ORS/BURS number and how much of it DVs have already committed */
  async getObligationByReference(reference: string) {
    const ref = reference.trim();
    if (!ref) return null;

    const [obligation] = await db
      .select({
        id: registryObligations.id,
        payee: registryObligations.payee,
        particulars: registryObligations.particulars,
        amount: registryObligations.amount,
        status: registryObligations.status,
        orsNumber: registryObligations.orsNumber,
        bursNumber: registryObligations.bursNumber,
      })
      .from(registryObligations)
      .where(or(eq(registryObligations.orsNumber, ref), eq(registryObligations.bursNumber, ref)))
      .orderBy(desc(registryObligations.createdAt))
      .limit(1);

    if (!obligation) return null;

    const [committedRow] = await db
      .select({ total: sum(disbursementVouchers.amount).mapWith(Number), count: sql<number>`COUNT(*)` })
      .from(disbursementVouchers)
      .where(
        and(
          eq(disbursementVouchers.orsBursNo, ref),
          notInArray(disbursementVouchers.status, [...CLOSED_DV_STATUSES]),
          isNull(disbursementVouchers.deletedAt)
        )
      );

    const amount = toNumber(obligation.amount);
    const committed = toNumber(committedRow?.total);

    return {
      ...obligation,
      amount,
      committed,
      voucherCount: Number(committedRow?.count ?? 0),
      remaining: amount - committed,
    };
  }

  /** Past payees matching a prefix, with their last-used TIN, address and particulars */
  async getPayeeSuggestions(query: string, limit = 6) {
    const q = query.trim();
    if (q.length < 2) return [];

    const rows = await db
      .select({
        payeeName: disbursementVouchers.payeeName,
        payeeTin: disbursementVouchers.payeeTin,
        payeeAddress: disbursementVouchers.payeeAddress,
        particulars: disbursementVouchers.particulars,
        createdAt: disbursementVouchers.createdAt,
      })
      .from(disbursementVouchers)
      .where(and(sql`${disbursementVouchers.payeeName} LIKE ${`%${q.replace(/[%_\\]/g, '\\$&')}%`}`, isNull(disbursementVouchers.deletedAt)))
      .orderBy(desc(disbursementVouchers.createdAt))
      .limit(100);

    // Most recent record per payee wins; keep up to three distinct past particulars
    const byPayee = new Map<string, { payeeName: string; payeeTin: string | null; payeeAddress: string | null; particulars: string[] }>();
    for (const row of rows) {
      const key = row.payeeName.trim().toLowerCase();
      const entry = byPayee.get(key);
      if (!entry) {
        byPayee.set(key, {
          payeeName: row.payeeName,
          payeeTin: row.payeeTin,
          payeeAddress: row.payeeAddress,
          particulars: [row.particulars],
        });
      } else if (entry.particulars.length < 3 && !entry.particulars.includes(row.particulars)) {
        entry.particulars.push(row.particulars);
      }
    }
    return [...byPayee.values()].slice(0, limit);
  }

  /** How often users went ahead after a duplicate warning, from the audit trail */
  async getDuplicateOverrideCount(sinceDays = 90): Promise<number> {
    const since = new Date(Date.now() - sinceDays * 864e5);
    const [row] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(auditLogs)
      .where(
        and(
          eq(auditLogs.tableName, 'disbursement_vouchers'),
          eq(auditLogs.action, 'CREATE'),
          gte(auditLogs.createdAt, since),
          // Values may be stored as a JSON object or a JSON-encoded string; match the text either way
          sql`CAST(${auditLogs.newValues} AS CHAR) LIKE '%duplicateWarningAcknowledged%'`
        )
      );
    return Number(row?.count ?? 0);
  }
}

export const insightsService = new InsightsService();
