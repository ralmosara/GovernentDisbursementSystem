import { db } from '../db/connection';
import {
  purchaseRequests,
  purchaseRequestItems,
  purchaseOrders,
  purchaseOrderItems,
  inspectionAcceptanceReports,
  inspectionAcceptanceItems,
  registryObligations,
  objectOfExpenditure,
  fundClusters,
  users,
  inventoryTransactions,
} from '../db/schema';
import { assetService } from './asset.service';
import { and, asc, desc, eq, inArray, isNull, like, ne, sql } from 'drizzle-orm';
import { logAudit } from '../middleware/audit-logger';
import { getSetting } from './settings.service';

/**
 * Procurement under RA 12009 (New Government Procurement Act):
 *   Purchase Request → Purchase Order → (obligation) → Inspection and Acceptance → DV
 *
 * Rules enforced here:
 *  - only an approved PR can be ordered against, and POs may not exceed the PR's
 *    approved budget (ABC) or its quantities
 *  - deliveries are accepted only up to what is still undelivered on each PO line
 *  - an IAR can be paid by one DV only
 */

export const MODES_OF_PROCUREMENT = [
  'Competitive Bidding',
  'Limited Source Bidding',
  'Competitive Dialogue',
  'Unsolicited Offer with Bid Matching',
  'Direct Contracting',
  'Direct Acquisition',
  'Repeat Order',
  'Small Value Procurement',
  'Negotiated Procurement',
  'Direct Sales',
] as const;

const num = (value: string | number | null | undefined) => {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};
const round2 = (value: number) => Math.round(value * 100) / 100;
const cents = (value: number) => Math.round(value * 100);
const peso = (value: number) => `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Next document number <PREFIX>-<yyyy>-<mm>-<0001> */
async function nextNumber(table: any, column: any, prefix: string, date: Date): Promise<string> {
  const stem = `${prefix}-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-`;
  const [last] = await db.select({ no: column }).from(table).where(like(column, `${stem}%`)).orderBy(desc(column)).limit(1);
  const next = last ? parseInt(String(last.no).slice(stem.length), 10) + 1 : 1;
  return `${stem}${String(next).padStart(4, '0')}`;
}

export interface PrItemInput {
  unit: string;
  description: string;
  quantity: number;
  unitCost: number;
  objectExpenditureId?: number | null;
}

export interface CreatePrInput {
  prDate: Date;
  fundClusterId: number;
  office?: string;
  purpose: string;
  items: PrItemInput[];
}

export interface CreatePoInput {
  prId: number;
  poDate: Date;
  supplierName: string;
  supplierAddress?: string;
  supplierTin?: string;
  modeOfProcurement: string;
  placeOfDelivery?: string;
  deliveryDate?: Date | null;
  paymentTerm?: string;
  items: { prItemId: number; quantity: number; unitCost: number }[];
}

export interface CreateIarInput {
  poId: number;
  iarDate: Date;
  invoiceNo?: string;
  invoiceDate?: Date | null;
  inspectedBy: string;
  dateInspected: Date;
  receivedBy: string;
  dateReceived: Date;
  remarks?: string;
  items: { poItemId: number; quantity: number }[];
}

export class ProcurementService {
  // ---------------------------------------------------------------------------
  // Purchase requests
  // ---------------------------------------------------------------------------

  async createPr(input: CreatePrInput, userId: number): Promise<{ id: number; prNo: string }> {
    const purpose = input.purpose?.trim();
    if (!purpose) throw new Error('State the purpose of the request');
    if (!input.fundClusterId) throw new Error('Choose a fund cluster');
    const items = (input.items ?? []).filter(i => i.description?.trim());
    if (items.length === 0) throw new Error('Add at least one item');
    for (const [index, item] of items.entries()) {
      if (!item.unit?.trim()) throw new Error(`Item ${index + 1}: enter the unit of issue`);
      if (!(item.quantity > 0)) throw new Error(`Item ${index + 1}: quantity must be more than zero`);
      if (!(item.unitCost >= 0)) throw new Error(`Item ${index + 1}: enter the estimated unit cost`);
    }

    const total = round2(items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0));
    if (!(total > 0)) throw new Error('The estimated total must be more than zero');

    const prNo = await nextNumber(purchaseRequests, purchaseRequests.prNo, 'PR', input.prDate);
    const id = await db.transaction(async tx => {
      const [result] = await tx.insert(purchaseRequests).values({
        prNo,
        prDate: input.prDate,
        fundClusterId: input.fundClusterId,
        office: input.office?.trim() || null,
        purpose,
        totalAmount: total.toFixed(2),
        status: 'submitted',
        requestedBy: userId,
      });
      const prId = Number(result.insertId);
      await tx.insert(purchaseRequestItems).values(
        items.map((item, i) => ({
          prId,
          itemNo: i + 1,
          unit: item.unit.trim(),
          description: item.description.trim(),
          quantity: item.quantity.toFixed(2),
          unitCost: item.unitCost.toFixed(2),
          totalCost: round2(item.quantity * item.unitCost).toFixed(2),
          objectExpenditureId: item.objectExpenditureId || null,
        }))
      );
      return prId;
    });

    await logAudit({ userId, action: 'CREATE', tableName: 'purchase_requests', recordId: id, newValues: { prNo, total, items: items.length } });
    return { id, prNo };
  }

  async decidePr(id: number, userId: number, decision: 'approved' | 'rejected', remarks?: string): Promise<void> {
    const [pr] = await db.select().from(purchaseRequests).where(eq(purchaseRequests.id, id)).limit(1);
    if (!pr) throw new Error('Purchase request not found');
    if (pr.status !== 'submitted') throw new Error(`This purchase request is already ${pr.status}`);
    if (decision === 'rejected' && !remarks?.trim()) throw new Error('Give a reason for rejecting the request');

    const enforceSod = Boolean(await getSetting('enforce_segregation_of_duties').catch(() => false));
    if (enforceSod && pr.requestedBy === userId) {
      throw new Error('Segregation of duties: you requested this purchase and cannot approve or reject it.');
    }

    await db
      .update(purchaseRequests)
      .set({ status: decision, approvedBy: userId, approvedAt: new Date(), remarks: remarks?.trim() || pr.remarks })
      .where(and(eq(purchaseRequests.id, id), eq(purchaseRequests.status, 'submitted')));

    await logAudit({
      userId,
      action: decision === 'approved' ? 'APPROVE' : 'REJECT',
      tableName: 'purchase_requests',
      recordId: id,
      newValues: { status: decision, remarks },
    });
  }

  async getPrs(filters: { status?: string } = {}) {
    return db
      .select({
        id: purchaseRequests.id,
        prNo: purchaseRequests.prNo,
        prDate: purchaseRequests.prDate,
        office: purchaseRequests.office,
        purpose: purchaseRequests.purpose,
        totalAmount: purchaseRequests.totalAmount,
        status: purchaseRequests.status,
        fundClusterCode: fundClusters.code,
        requestedByName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(purchaseRequests)
      .leftJoin(fundClusters, eq(purchaseRequests.fundClusterId, fundClusters.id))
      .leftJoin(users, eq(purchaseRequests.requestedBy, users.id))
      .where(filters.status ? eq(purchaseRequests.status, filters.status as any) : undefined)
      .orderBy(desc(purchaseRequests.prDate), desc(purchaseRequests.id));
  }

  async getPr(id: number) {
    const [pr] = await db
      .select({
        pr: purchaseRequests,
        fundClusterCode: fundClusters.code,
        fundClusterName: fundClusters.name,
        requestedByName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(purchaseRequests)
      .leftJoin(fundClusters, eq(purchaseRequests.fundClusterId, fundClusters.id))
      .leftJoin(users, eq(purchaseRequests.requestedBy, users.id))
      .where(eq(purchaseRequests.id, id))
      .limit(1);
    if (!pr) return null;

    const items = await db
      .select({ item: purchaseRequestItems, expenseCode: objectOfExpenditure.code, expenseName: objectOfExpenditure.name })
      .from(purchaseRequestItems)
      .leftJoin(objectOfExpenditure, eq(purchaseRequestItems.objectExpenditureId, objectOfExpenditure.id))
      .where(eq(purchaseRequestItems.prId, id))
      .orderBy(asc(purchaseRequestItems.itemNo));

    // Quantities already ordered on live POs, per PR line
    const ordered = await db
      .select({ prItemId: purchaseOrderItems.prItemId, quantity: sql<string>`SUM(${purchaseOrderItems.quantity})` })
      .from(purchaseOrderItems)
      .innerJoin(purchaseOrders, eq(purchaseOrderItems.poId, purchaseOrders.id))
      .where(and(eq(purchaseOrders.prId, id), ne(purchaseOrders.status, 'cancelled')))
      .groupBy(purchaseOrderItems.prItemId);

    const orders = await db
      .select({ id: purchaseOrders.id, poNo: purchaseOrders.poNo, supplierName: purchaseOrders.supplierName, totalAmount: purchaseOrders.totalAmount, status: purchaseOrders.status })
      .from(purchaseOrders)
      .where(eq(purchaseOrders.prId, id))
      .orderBy(asc(purchaseOrders.id));

    const orderedTotal = round2(orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + num(o.totalAmount), 0));

    return {
      ...pr.pr,
      fundClusterCode: pr.fundClusterCode,
      fundClusterName: pr.fundClusterName,
      requestedByName: pr.requestedByName,
      items: items.map(({ item, expenseCode, expenseName }) => {
        const orderedQty = num(ordered.find(o => o.prItemId === item.id)?.quantity);
        return { ...item, expenseCode, expenseName, orderedQty, remainingQty: round2(num(item.quantity) - orderedQty) };
      }),
      orders,
      orderedTotal,
      remainingBudget: round2(num(pr.pr.totalAmount) - orderedTotal),
    };
  }

  // ---------------------------------------------------------------------------
  // Purchase orders
  // ---------------------------------------------------------------------------

  async createPo(input: CreatePoInput, userId: number): Promise<{ id: number; poNo: string }> {
    const pr = await this.getPr(input.prId);
    if (!pr) throw new Error('Purchase request not found');
    if (pr.status !== 'approved' && pr.status !== 'ordered') {
      throw new Error(`Only an approved purchase request can be ordered against (this one is ${pr.status})`);
    }
    if (!input.supplierName?.trim()) throw new Error('Enter the supplier awarded the contract');
    if (!MODES_OF_PROCUREMENT.includes(input.modeOfProcurement as any)) throw new Error('Choose the mode of procurement');

    const lines = (input.items ?? []).filter(i => i.quantity > 0);
    if (lines.length === 0) throw new Error('Order at least one item');

    const poItems = lines.map((line, index) => {
      const prItem = pr.items.find(i => i.id === line.prItemId);
      if (!prItem) throw new Error(`Item ${index + 1} is not on purchase request ${pr.prNo}`);
      if (cents(line.quantity) > cents(prItem.remainingQty)) {
        throw new Error(`"${prItem.description}": only ${prItem.remainingQty} ${prItem.unit} remain to be ordered`);
      }
      if (!(line.unitCost >= 0)) throw new Error(`"${prItem.description}": enter the contract unit price`);
      return {
        prItemId: prItem.id,
        unit: prItem.unit,
        description: prItem.description,
        quantity: line.quantity,
        unitCost: line.unitCost,
        amount: round2(line.quantity * line.unitCost),
        objectExpenditureId: prItem.objectExpenditureId,
      };
    });

    const total = round2(poItems.reduce((sum, i) => sum + i.amount, 0));
    // An award above the approved budget for the contract is not allowed
    if (cents(total) > cents(pr.remainingBudget)) {
      throw new Error(`The order total ${peso(total)} exceeds the approved budget remaining on ${pr.prNo} (${peso(pr.remainingBudget)})`);
    }

    const poNo = await nextNumber(purchaseOrders, purchaseOrders.poNo, 'PO', input.poDate);
    const id = await db.transaction(async tx => {
      const [result] = await tx.insert(purchaseOrders).values({
        poNo,
        poDate: input.poDate,
        prId: pr.id,
        fundClusterId: pr.fundClusterId,
        supplierName: input.supplierName.trim(),
        supplierAddress: input.supplierAddress?.trim() || null,
        supplierTin: input.supplierTin?.trim() || null,
        modeOfProcurement: input.modeOfProcurement,
        placeOfDelivery: input.placeOfDelivery?.trim() || null,
        deliveryDate: input.deliveryDate ?? null,
        paymentTerm: input.paymentTerm?.trim() || null,
        totalAmount: total.toFixed(2),
        status: 'issued',
        createdBy: userId,
      });
      const poId = Number(result.insertId);
      await tx.insert(purchaseOrderItems).values(
        poItems.map((item, i) => ({
          poId,
          prItemId: item.prItemId,
          itemNo: i + 1,
          unit: item.unit,
          description: item.description,
          quantity: item.quantity.toFixed(2),
          unitCost: item.unitCost.toFixed(2),
          amount: item.amount.toFixed(2),
          objectExpenditureId: item.objectExpenditureId,
        }))
      );
      await tx.update(purchaseRequests).set({ status: 'ordered' }).where(eq(purchaseRequests.id, pr.id));
      return poId;
    });

    await logAudit({ userId, action: 'CREATE', tableName: 'purchase_orders', recordId: id, newValues: { poNo, prNo: pr.prNo, supplier: input.supplierName, total } });
    return { id, poNo };
  }

  async getPos(filters: { status?: string } = {}) {
    return db
      .select({
        id: purchaseOrders.id,
        poNo: purchaseOrders.poNo,
        poDate: purchaseOrders.poDate,
        supplierName: purchaseOrders.supplierName,
        modeOfProcurement: purchaseOrders.modeOfProcurement,
        totalAmount: purchaseOrders.totalAmount,
        orsBursNo: purchaseOrders.orsBursNo,
        status: purchaseOrders.status,
        prId: purchaseOrders.prId,
        prNo: purchaseRequests.prNo,
      })
      .from(purchaseOrders)
      .leftJoin(purchaseRequests, eq(purchaseOrders.prId, purchaseRequests.id))
      .where(filters.status ? eq(purchaseOrders.status, filters.status as any) : undefined)
      .orderBy(desc(purchaseOrders.poDate), desc(purchaseOrders.id));
  }

  async getPo(id: number) {
    const [row] = await db
      .select({ po: purchaseOrders, prNo: purchaseRequests.prNo, purpose: purchaseRequests.purpose, fundClusterCode: fundClusters.code, fundClusterName: fundClusters.name })
      .from(purchaseOrders)
      .leftJoin(purchaseRequests, eq(purchaseOrders.prId, purchaseRequests.id))
      .leftJoin(fundClusters, eq(purchaseOrders.fundClusterId, fundClusters.id))
      .where(eq(purchaseOrders.id, id))
      .limit(1);
    if (!row) return null;

    const items = await db
      .select({ item: purchaseOrderItems, expenseCode: objectOfExpenditure.code })
      .from(purchaseOrderItems)
      .leftJoin(objectOfExpenditure, eq(purchaseOrderItems.objectExpenditureId, objectOfExpenditure.id))
      .where(eq(purchaseOrderItems.poId, id))
      .orderBy(asc(purchaseOrderItems.itemNo));

    const accepted = items.length
      ? await db
          .select({ poItemId: inspectionAcceptanceItems.poItemId, quantity: sql<string>`SUM(${inspectionAcceptanceItems.quantity})` })
          .from(inspectionAcceptanceItems)
          .where(inArray(inspectionAcceptanceItems.poItemId, items.map(i => i.item.id)))
          .groupBy(inspectionAcceptanceItems.poItemId)
      : [];

    const iars = await db
      .select({
        id: inspectionAcceptanceReports.id,
        iarNo: inspectionAcceptanceReports.iarNo,
        iarDate: inspectionAcceptanceReports.iarDate,
        invoiceNo: inspectionAcceptanceReports.invoiceNo,
        acceptance: inspectionAcceptanceReports.acceptance,
        totalAmount: inspectionAcceptanceReports.totalAmount,
        dvId: inspectionAcceptanceReports.dvId,
      })
      .from(inspectionAcceptanceReports)
      .where(eq(inspectionAcceptanceReports.poId, id))
      .orderBy(asc(inspectionAcceptanceReports.id));

    let obligation: { id: number; status: string | null; amount: number } | null = null;
    if (row.po.obligationId) {
      const [ob] = await db
        .select({ id: registryObligations.id, status: registryObligations.status, amount: registryObligations.amount })
        .from(registryObligations)
        .where(eq(registryObligations.id, row.po.obligationId))
        .limit(1);
      obligation = ob ? { ...ob, amount: num(ob.amount) } : null;
    }

    const acceptedTotal = round2(iars.reduce((sum, i) => sum + num(i.totalAmount), 0));
    return {
      ...row.po,
      prNo: row.prNo,
      purpose: row.purpose,
      fundClusterCode: row.fundClusterCode,
      fundClusterName: row.fundClusterName,
      items: items.map(({ item, expenseCode }) => {
        const acceptedQty = num(accepted.find(a => a.poItemId === item.id)?.quantity);
        return { ...item, expenseCode, acceptedQty, remainingQty: round2(num(item.quantity) - acceptedQty) };
      }),
      iars,
      obligation,
      acceptedTotal,
    };
  }

  /** Link the obligation request raised for a PO (called when the ORS is created from it) */
  async linkObligation(poId: number, obligationId: number, userId: number): Promise<void> {
    const [ob] = await db
      .select({ orsNumber: registryObligations.orsNumber, bursNumber: registryObligations.bursNumber })
      .from(registryObligations)
      .where(eq(registryObligations.id, obligationId))
      .limit(1);
    if (!ob) throw new Error('Obligation not found');
    await db
      .update(purchaseOrders)
      .set({ obligationId, orsBursNo: ob.orsNumber || ob.bursNumber || null })
      .where(and(eq(purchaseOrders.id, poId), isNull(purchaseOrders.obligationId)));
    await logAudit({ userId, action: 'UPDATE', tableName: 'purchase_orders', recordId: poId, newValues: { obligationId } });
  }

  // ---------------------------------------------------------------------------
  // Inspection and acceptance
  // ---------------------------------------------------------------------------

  async createIar(input: CreateIarInput, userId: number): Promise<{ id: number; iarNo: string }> {
    const po = await this.getPo(input.poId);
    if (!po) throw new Error('Purchase order not found');
    if (po.status !== 'issued' && po.status !== 'partially_delivered') {
      throw new Error(`Deliveries can't be accepted on a purchase order that is ${po.status.replace('_', ' ')}`);
    }
    if (!input.inspectedBy?.trim()) throw new Error('Enter the inspection officer or committee');
    if (!input.receivedBy?.trim()) throw new Error('Enter the property/supply officer who received the delivery');

    const lines = (input.items ?? []).filter(i => i.quantity > 0);
    if (lines.length === 0) throw new Error('Enter the quantity accepted for at least one item');

    const accepted = lines.map(line => {
      const poItem = po.items.find(i => i.id === line.poItemId);
      if (!poItem) throw new Error('An item is not on this purchase order');
      if (cents(line.quantity) > cents(poItem.remainingQty)) {
        throw new Error(`"${poItem.description}": only ${poItem.remainingQty} ${poItem.unit} remain undelivered`);
      }
      return { poItemId: poItem.id, quantity: line.quantity, amount: round2(line.quantity * num(poItem.unitCost)) };
    });

    // Complete when every line is fully delivered after this acceptance
    const complete = po.items.every(item => {
      const now = accepted.find(a => a.poItemId === item.id)?.quantity ?? 0;
      return cents(now) >= cents(item.remainingQty);
    });
    const total = round2(accepted.reduce((sum, a) => sum + a.amount, 0));
    const iarNo = await nextNumber(inspectionAcceptanceReports, inspectionAcceptanceReports.iarNo, 'IAR', input.iarDate);

    const id = await db.transaction(async tx => {
      const [result] = await tx.insert(inspectionAcceptanceReports).values({
        iarNo,
        iarDate: input.iarDate,
        poId: po.id,
        invoiceNo: input.invoiceNo?.trim() || null,
        invoiceDate: input.invoiceDate ?? null,
        inspectedBy: input.inspectedBy.trim(),
        dateInspected: input.dateInspected,
        receivedBy: input.receivedBy.trim(),
        dateReceived: input.dateReceived,
        acceptance: complete ? 'complete' : 'partial',
        totalAmount: total.toFixed(2),
        remarks: input.remarks?.trim() || null,
        createdBy: userId,
      });
      const iarId = Number(result.insertId);
      await tx.insert(inspectionAcceptanceItems).values(
        accepted.map(a => ({ iarId, poItemId: a.poItemId, quantity: a.quantity.toFixed(2), amount: a.amount.toFixed(2) }))
      );
      await tx.update(purchaseOrders).set({ status: complete ? 'delivered' : 'partially_delivered' }).where(eq(purchaseOrders.id, po.id));
      return iarId;
    });

    await logAudit({ userId, action: 'CREATE', tableName: 'inspection_acceptance_reports', recordId: id, newValues: { iarNo, poNo: po.poNo, total, acceptance: complete ? 'complete' : 'partial' } });
    return { id, iarNo };
  }

  async getIar(id: number) {
    const [row] = await db
      .select({ iar: inspectionAcceptanceReports, po: purchaseOrders })
      .from(inspectionAcceptanceReports)
      .innerJoin(purchaseOrders, eq(inspectionAcceptanceReports.poId, purchaseOrders.id))
      .where(eq(inspectionAcceptanceReports.id, id))
      .limit(1);
    if (!row) return null;

    const items = await db
      .select({
        poItemId: inspectionAcceptanceItems.poItemId,
        quantity: inspectionAcceptanceItems.quantity,
        amount: inspectionAcceptanceItems.amount,
        itemNo: purchaseOrderItems.itemNo,
        unit: purchaseOrderItems.unit,
        description: purchaseOrderItems.description,
        unitCost: purchaseOrderItems.unitCost,
        objectExpenditureId: purchaseOrderItems.objectExpenditureId,
      })
      .from(inspectionAcceptanceItems)
      .innerJoin(purchaseOrderItems, eq(inspectionAcceptanceItems.poItemId, purchaseOrderItems.id))
      .where(eq(inspectionAcceptanceItems.iarId, id))
      .orderBy(asc(purchaseOrderItems.itemNo));

    return { ...row.iar, po: row.po, items };
  }

  async getIars() {
    return db
      .select({
        id: inspectionAcceptanceReports.id,
        iarNo: inspectionAcceptanceReports.iarNo,
        iarDate: inspectionAcceptanceReports.iarDate,
        acceptance: inspectionAcceptanceReports.acceptance,
        totalAmount: inspectionAcceptanceReports.totalAmount,
        dvId: inspectionAcceptanceReports.dvId,
        poId: purchaseOrders.id,
        poNo: purchaseOrders.poNo,
        supplierName: purchaseOrders.supplierName,
      })
      .from(inspectionAcceptanceReports)
      .innerJoin(purchaseOrders, eq(inspectionAcceptanceReports.poId, purchaseOrders.id))
      .orderBy(desc(inspectionAcceptanceReports.iarDate), desc(inspectionAcceptanceReports.id));
  }

  /** Values to prefill a DV paying for an accepted delivery */
  dvPrefillForIar(iar: NonNullable<Awaited<ReturnType<ProcurementService['getIar']>>>) {
    // Charge the object of expenditure carrying most of the value
    const byExpense = new Map<number, number>();
    for (const item of iar.items) {
      if (item.objectExpenditureId) byExpense.set(item.objectExpenditureId, (byExpense.get(item.objectExpenditureId) ?? 0) + num(item.amount));
    }
    const objectExpenditureId = [...byExpense.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const params: Record<string, string> = {
      fromIar: String(iar.id),
      payeeName: iar.po.supplierName,
      particulars: `Payment for delivery of ${iar.items.map(i => i.description).join(', ').slice(0, 200)} per PO No. ${iar.po.poNo}, IAR No. ${iar.iarNo}${iar.invoiceNo ? `, Invoice No. ${iar.invoiceNo}` : ''}`,
      amount: num(iar.totalAmount).toFixed(2),
      fundClusterId: String(iar.po.fundClusterId),
    };
    if (iar.po.orsBursNo) params.orsBursNo = iar.po.orsBursNo;
    if (iar.po.supplierTin) params.payeeTin = iar.po.supplierTin;
    if (iar.po.supplierAddress) params.payeeAddress = iar.po.supplierAddress;
    if (objectExpenditureId) params.objectExpenditureId = String(objectExpenditureId);
    return new URLSearchParams(params);
  }

  /** Reference that ties an inventory receipt to one IAR line, so a line is received once */
  stockReference(iarNo: string, itemNo: number) {
    return `${iarNo}/L${itemNo}`;
  }

  /** Inventory receipts already recorded for an IAR's lines, keyed by reference */
  async getStockReceipts(iarNo: string) {
    const rows = await db
      .select({ id: inventoryTransactions.id, transactionNo: inventoryTransactions.transactionNo, itemId: inventoryTransactions.itemId, reference: inventoryTransactions.reference })
      .from(inventoryTransactions)
      .where(and(eq(inventoryTransactions.transactionType, 'receipt'), like(inventoryTransactions.reference, `${iarNo}/L%`)));
    return new Map(rows.map(r => [r.reference ?? '', r]));
  }

  /**
   * Receive accepted supplies into stock: one inventory receipt per IAR line, at the
   * contract unit cost. Each line can be received only once.
   */
  async receiveIntoStock(iarId: number, lines: { poItemId: number; inventoryItemId: number }[], userId: number) {
    const iar = await this.getIar(iarId);
    if (!iar) throw new Error('Inspection and acceptance report not found');
    const received = await this.getStockReceipts(iar.iarNo);
    const results: { reference: string; transactionNo: string }[] = [];

    for (const line of lines.filter(l => l.inventoryItemId)) {
      const item = iar.items.find(i => i.poItemId === line.poItemId);
      if (!item) throw new Error('An item is not on this IAR');
      const reference = this.stockReference(iar.iarNo, item.itemNo);
      if (received.has(reference)) throw new Error(`"${item.description}" is already received into stock`);
      const quantity = num(item.quantity);
      if (!Number.isInteger(quantity)) throw new Error(`"${item.description}": stock is counted in whole units; ${quantity} can't be received`);

      const result = await assetService.createInventoryTransaction(
        {
          itemId: line.inventoryItemId,
          transactionDate: new Date(iar.dateReceived),
          transactionType: 'receipt',
          quantity,
          unitCost: num(item.unitCost).toFixed(2),
          reference,
          remarks: `Delivered by ${iar.po.supplierName} per PO ${iar.po.poNo}`,
        },
        userId
      );
      results.push({ reference, transactionNo: result.transactionNo });
    }
    if (results.length === 0) throw new Error('Choose the stock item for at least one line');
    await logAudit({ userId, action: 'CREATE', tableName: 'inventory_transactions', recordId: iarId, newValues: { iarNo: iar.iarNo, receipts: results } });
    return results;
  }

  /** Record that a DV pays this IAR; an IAR can be paid only once */
  async linkDv(iarId: number, dvId: number): Promise<void> {
    const [result] = await db
      .update(inspectionAcceptanceReports)
      .set({ dvId })
      .where(and(eq(inspectionAcceptanceReports.id, iarId), isNull(inspectionAcceptanceReports.dvId)));
    if (result.affectedRows === 0) throw new Error('This delivery is already paid by another voucher');
  }

  async assertIarPayable(iarId: number): Promise<void> {
    const [iar] = await db
      .select({ dvId: inspectionAcceptanceReports.dvId, iarNo: inspectionAcceptanceReports.iarNo })
      .from(inspectionAcceptanceReports)
      .where(eq(inspectionAcceptanceReports.id, iarId))
      .limit(1);
    if (!iar) throw new Error('Inspection and acceptance report not found');
    if (iar.dvId) throw new Error(`IAR ${iar.iarNo} is already paid by another voucher`);
  }
}

export const procurementService = new ProcurementService();
