import { db } from '../db/connection';
import { propertyIssuances, fixedAssets, assetCategories } from '../db/schema';
import { and, asc, desc, eq, like, sql } from 'drizzle-orm';
import { logAudit } from '../middleware/audit-logger';

/**
 * Property accountability. Every item of property in use is issued to one accountable
 * officer on a Property Acknowledgment Receipt (PAR) or, for semi-expendable property below
 * the capitalization threshold, an Inventory Custodian Slip (ICS). A transfer (PTR) ends one
 * issuance and opens the next; a return sends the item back to the supply office.
 */

/** PPE capitalization threshold (COA Circular No. 2022-004) */
export const CAPITALIZATION_THRESHOLD = 50000;

export function documentTypeFor(acquisitionCost: number): 'PAR' | 'ICS' {
  return acquisitionCost >= CAPITALIZATION_THRESHOLD ? 'PAR' : 'ICS';
}

export interface IssueInput {
  assetId: number;
  issuedTo: string;
  employeeId?: number | null;
  position?: string;
  office?: string;
  issueDate: Date;
  remarks?: string;
}

const num = (value: string | number | null | undefined) => {
  const n = typeof value === 'number' ? value : parseFloat(value ?? '');
  return Number.isFinite(n) ? n : 0;
};

async function nextDocumentNo(type: 'PAR' | 'ICS', date: Date): Promise<string> {
  const stem = `${type}-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-`;
  const [last] = await db
    .select({ no: propertyIssuances.documentNo })
    .from(propertyIssuances)
    .where(like(propertyIssuances.documentNo, `${stem}%`))
    .orderBy(desc(propertyIssuances.documentNo))
    .limit(1);
  const next = last ? parseInt(last.no.slice(stem.length), 10) + 1 : 1;
  return `${stem}${String(next).padStart(4, '0')}`;
}

export class PropertyService {
  async getActiveIssuance(assetId: number) {
    const [row] = await db
      .select()
      .from(propertyIssuances)
      .where(and(eq(propertyIssuances.assetId, assetId), eq(propertyIssuances.status, 'active')))
      .limit(1);
    return row ?? null;
  }

  /** Issue an item to an accountable officer; it must not already be issued */
  async issue(input: IssueInput, userId: number): Promise<{ id: number; documentNo: string }> {
    const issuedTo = input.issuedTo?.trim();
    if (!issuedTo) throw new Error('Enter the accountable officer receiving the property');

    const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, input.assetId)).limit(1);
    if (!asset) throw new Error('Asset not found');
    if (asset.status !== 'active') throw new Error(`Asset ${asset.assetNo} is ${asset.status} and can't be issued`);

    const current = await this.getActiveIssuance(asset.id);
    if (current) throw new Error(`Asset ${asset.assetNo} is already issued to ${current.issuedTo} on ${current.documentNo}. Transfer or return it first.`);

    return this.createIssuance(asset, { ...input, issuedTo }, userId);
  }

  private async createIssuance(asset: typeof fixedAssets.$inferSelect, input: IssueInput, userId: number) {
    const documentType = documentTypeFor(num(asset.acquisitionCost));
    const documentNo = await nextDocumentNo(documentType, input.issueDate);

    const id = await db.transaction(async tx => {
      const [result] = await tx.insert(propertyIssuances).values({
        documentNo,
        documentType,
        assetId: asset.id,
        issuedTo: input.issuedTo,
        employeeId: input.employeeId ?? null,
        position: input.position?.trim() || null,
        office: input.office?.trim() || null,
        issueDate: input.issueDate,
        remarks: input.remarks?.trim() || null,
        status: 'active',
        createdBy: userId,
      });
      await tx.update(fixedAssets).set({ custodian: input.issuedTo }).where(eq(fixedAssets.id, asset.id));
      return Number(result.insertId);
    });

    await logAudit({ userId, action: 'CREATE', tableName: 'property_issuances', recordId: id, newValues: { documentNo, assetNo: asset.assetNo, issuedTo: input.issuedTo } });
    return { id, documentNo };
  }

  /** Transfer to another officer (Property Transfer Report): ends this issuance, opens the next */
  async transfer(issuanceId: number, input: Omit<IssueInput, 'assetId'>, reason: string, userId: number) {
    const [issuance] = await db.select().from(propertyIssuances).where(eq(propertyIssuances.id, issuanceId)).limit(1);
    if (!issuance) throw new Error('Issuance not found');
    if (issuance.status !== 'active') throw new Error(`${issuance.documentNo} is already ${issuance.status}`);
    const issuedTo = input.issuedTo?.trim();
    if (!issuedTo) throw new Error('Enter the officer receiving the property');
    if (issuedTo.toLowerCase() === issuance.issuedTo.toLowerCase()) throw new Error('The property is already with this officer');
    if (!reason?.trim()) throw new Error('Give the reason for the transfer');

    const [asset] = await db.select().from(fixedAssets).where(eq(fixedAssets.id, issuance.assetId)).limit(1);
    if (!asset) throw new Error('Asset not found');

    await db
      .update(propertyIssuances)
      .set({ status: 'transferred', endedDate: input.issueDate, endReason: reason.trim() })
      .where(and(eq(propertyIssuances.id, issuanceId), eq(propertyIssuances.status, 'active')));
    const next = await this.createIssuance(asset, { ...input, issuedTo, assetId: asset.id }, userId);
    await db.update(propertyIssuances).set({ transferredToId: next.id }).where(eq(propertyIssuances.id, issuanceId));
    return next;
  }

  /** Return to the supply office */
  async returnProperty(issuanceId: number, returnDate: Date, reason: string, userId: number): Promise<void> {
    const [issuance] = await db.select().from(propertyIssuances).where(eq(propertyIssuances.id, issuanceId)).limit(1);
    if (!issuance) throw new Error('Issuance not found');
    if (issuance.status !== 'active') throw new Error(`${issuance.documentNo} is already ${issuance.status}`);
    if (!reason?.trim()) throw new Error('Give the reason for the return');

    await db.transaction(async tx => {
      await tx
        .update(propertyIssuances)
        .set({ status: 'returned', endedDate: returnDate, endReason: reason.trim() })
        .where(eq(propertyIssuances.id, issuanceId));
      await tx.update(fixedAssets).set({ custodian: null }).where(eq(fixedAssets.id, issuance.assetId));
    });
    await logAudit({ userId, action: 'UPDATE', tableName: 'property_issuances', recordId: issuanceId, newValues: { status: 'returned', reason } });
  }

  async getIssuance(id: number) {
    const [row] = await db
      .select({ issuance: propertyIssuances, asset: fixedAssets, categoryName: assetCategories.name })
      .from(propertyIssuances)
      .innerJoin(fixedAssets, eq(propertyIssuances.assetId, fixedAssets.id))
      .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
      .where(eq(propertyIssuances.id, id))
      .limit(1);
    return row ? { ...row.issuance, asset: row.asset, categoryName: row.categoryName } : null;
  }

  async getAssetHistory(assetId: number) {
    return db.select().from(propertyIssuances).where(eq(propertyIssuances.assetId, assetId)).orderBy(desc(propertyIssuances.issueDate), desc(propertyIssuances.id));
  }

  /** Property currently issued, grouped for each accountable officer */
  async getAccountabilities(search?: string) {
    const rows = await db
      .select({
        id: propertyIssuances.id,
        documentNo: propertyIssuances.documentNo,
        documentType: propertyIssuances.documentType,
        issuedTo: propertyIssuances.issuedTo,
        position: propertyIssuances.position,
        office: propertyIssuances.office,
        issueDate: propertyIssuances.issueDate,
        assetId: fixedAssets.id,
        assetNo: fixedAssets.assetNo,
        description: fixedAssets.description,
        serialNo: fixedAssets.serialNo,
        acquisitionCost: fixedAssets.acquisitionCost,
      })
      .from(propertyIssuances)
      .innerJoin(fixedAssets, eq(propertyIssuances.assetId, fixedAssets.id))
      .where(
        and(
          eq(propertyIssuances.status, 'active'),
          search ? sql`(${propertyIssuances.issuedTo} LIKE ${`%${search}%`} OR ${fixedAssets.assetNo} LIKE ${`%${search}%`})` : undefined
        )
      )
      .orderBy(asc(propertyIssuances.issuedTo), asc(fixedAssets.assetNo));

    const officers = new Map<string, { issuedTo: string; position: string | null; office: string | null; items: typeof rows; total: number }>();
    for (const row of rows) {
      const key = row.issuedTo.toLowerCase();
      const officer = officers.get(key) ?? { issuedTo: row.issuedTo, position: row.position, office: row.office, items: [], total: 0 };
      officer.items.push(row);
      officer.total = Math.round((officer.total + num(row.acquisitionCost)) * 100) / 100;
      officers.set(key, officer);
    }
    return [...officers.values()];
  }

  /** Active assets nobody is accountable for */
  async getUnassignedAssets() {
    return db
      .select({ id: fixedAssets.id, assetNo: fixedAssets.assetNo, description: fixedAssets.description, acquisitionCost: fixedAssets.acquisitionCost })
      .from(fixedAssets)
      .where(
        and(
          eq(fixedAssets.status, 'active'),
          sql`NOT EXISTS (SELECT 1 FROM ${propertyIssuances} WHERE ${propertyIssuances.assetId} = ${fixedAssets.id} AND ${propertyIssuances.status} = 'active')`
        )
      )
      .orderBy(asc(fixedAssets.assetNo));
  }
}

export const propertyService = new PropertyService();
