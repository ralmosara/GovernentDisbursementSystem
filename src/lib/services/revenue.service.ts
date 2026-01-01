import { db } from '../db/connection';
import {
  revenueSources,
  revenueEntries,
  accountsReceivable,
  collections,
  fundClusters,
  users,
  cashReceipts,
} from '../db/schema';
import { eq, and, or, desc, sum, sql, isNotNull, gte, lte, like, lt } from 'drizzle-orm';
import {
  generateRevenueEntryNumber,
  generateARNumber,
  generateCollectionNumber,
} from '../utils/serial-generator';

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface CreateRevenueSourceData {
  code: string;
  name: string;
  category: string;
  description?: string;
  isActive?: boolean;
}

export interface CreateRevenueEntryData {
  revenueSourceId: number;
  fundClusterId: number;
  entryDate: Date;
  amount: string;
  payorName?: string;
  particulars?: string;
  fiscalYear: number;
}

export interface CreateARData {
  revenueSourceId: number;
  debtorName: string;
  invoiceNo?: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: string;
}

export interface CreateCollectionData {
  arId: number;
  orNo?: string;
  collectionDate: Date;
  amount: string;
  paymentMode: 'cash' | 'check' | 'online';
  checkNo?: string;
  checkDate?: Date;
  checkBank?: string;
  remarks?: string;
}

export interface RevenueFilters {
  startDate?: Date;
  endDate?: Date;
  revenueSourceId?: number;
  fundClusterId?: number;
  fiscalYear?: number;
}

export interface ARFilters {
  status?: 'outstanding' | 'partial' | 'paid' | 'written_off';
  debtorName?: string;
  revenueSourceId?: number;
  overdue?: boolean;
}

// ============================================
// REVENUE SERVICE CLASS
// ============================================

export class RevenueService {
  // ============================================
  // REVENUE SOURCE METHODS
  // ============================================

  /**
   * Create new revenue source
   */
  async createRevenueSource(data: CreateRevenueSourceData): Promise<{ id: number; code: string; name: string }> {
    try {
      // Check if code already exists
      const existing = await db
        .select()
        .from(revenueSources)
        .where(eq(revenueSources.code, data.code))
        .limit(1);

      if (existing.length > 0) {
        throw new Error(`Revenue source code "${data.code}" already exists`);
      }

      // Insert revenue source
      const result = await db.insert(revenueSources).values({
        code: data.code,
        name: data.name,
        category: data.category,
        description: data.description || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        createdAt: new Date(),
      });

      const id = Number(result.insertId);

      return {
        id,
        code: data.code,
        name: data.name,
      };
    } catch (error) {
      throw new Error(`Failed to create revenue source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all revenue sources with optional filters
   */
  async getRevenueSources(isActive?: boolean) {
    try {
      let query = db.select().from(revenueSources);

      if (isActive !== undefined) {
        query = query.where(eq(revenueSources.isActive, isActive)) as any;
      }

      const sources = await query.orderBy(revenueSources.category, revenueSources.name);

      return sources;
    } catch (error) {
      throw new Error(`Failed to get revenue sources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get revenue source by ID
   */
  async getRevenueSourceById(id: number) {
    try {
      const source = await db
        .select()
        .from(revenueSources)
        .where(eq(revenueSources.id, id))
        .limit(1);

      if (source.length === 0) {
        throw new Error('Revenue source not found');
      }

      return source[0];
    } catch (error) {
      throw new Error(`Failed to get revenue source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update revenue source
   */
  async updateRevenueSource(id: number, data: Partial<CreateRevenueSourceData>) {
    try {
      await db
        .update(revenueSources)
        .set(data)
        .where(eq(revenueSources.id, id));

      return await this.getRevenueSourceById(id);
    } catch (error) {
      throw new Error(`Failed to update revenue source: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Activate/Deactivate revenue source
   */
  async toggleRevenueSourceStatus(id: number, isActive: boolean) {
    try {
      await db
        .update(revenueSources)
        .set({ isActive })
        .where(eq(revenueSources.id, id));
    } catch (error) {
      throw new Error(`Failed to toggle revenue source status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // REVENUE ENTRY METHODS
  // ============================================

  /**
   * Create revenue entry with auto-numbering
   */
  async createRevenueEntry(data: CreateRevenueEntryData, userId: number): Promise<{ id: number; entryNo: string }> {
    try {
      // Generate entry number
      const entryNo = await generateRevenueEntryNumber();

      // Validate amount > 0
      const amount = parseFloat(data.amount);
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Validate fiscal year matches entry date year
      const entryYear = new Date(data.entryDate).getFullYear();
      if (data.fiscalYear !== entryYear) {
        throw new Error('Fiscal year must match entry date year');
      }

      // Insert revenue entry
      const result = await db.insert(revenueEntries).values({
        entryNo,
        revenueSourceId: data.revenueSourceId,
        fundClusterId: data.fundClusterId,
        entryDate: data.entryDate,
        amount: data.amount,
        payorName: data.payorName || null,
        particulars: data.particulars || null,
        fiscalYear: data.fiscalYear,
        createdBy: userId,
        createdAt: new Date(),
      });

      const id = Number(result.insertId);

      return {
        id,
        entryNo,
      };
    } catch (error) {
      throw new Error(`Failed to create revenue entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get revenue entries with filters
   */
  async getRevenueEntries(filters: RevenueFilters = {}) {
    try {
      const conditions = [];

      if (filters.startDate) {
        conditions.push(gte(revenueEntries.entryDate, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(revenueEntries.entryDate, filters.endDate));
      }

      if (filters.revenueSourceId) {
        conditions.push(eq(revenueEntries.revenueSourceId, filters.revenueSourceId));
      }

      if (filters.fundClusterId) {
        conditions.push(eq(revenueEntries.fundClusterId, filters.fundClusterId));
      }

      if (filters.fiscalYear) {
        conditions.push(eq(revenueEntries.fiscalYear, filters.fiscalYear));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(revenueEntries)
        .leftJoin(revenueSources, eq(revenueEntries.revenueSourceId, revenueSources.id))
        .leftJoin(fundClusters, eq(revenueEntries.fundClusterId, fundClusters.id))
        .leftJoin(users, eq(revenueEntries.createdBy, users.id))
        .where(whereClause)
        .orderBy(desc(revenueEntries.entryDate));

      // Transform to expected format
      return results.map((row) => ({
        id: row.revenue_entries.id,
        entryNo: row.revenue_entries.entryNo,
        entryDate: row.revenue_entries.entryDate,
        amount: row.revenue_entries.amount,
        payorName: row.revenue_entries.payorName,
        particulars: row.revenue_entries.particulars,
        fiscalYear: row.revenue_entries.fiscalYear,
        createdAt: row.revenue_entries.createdAt,
        revenueSource: row.revenue_sources
          ? {
              id: row.revenue_sources.id,
              name: row.revenue_sources.name,
              code: row.revenue_sources.code,
            }
          : null,
        fundCluster: row.fund_clusters
          ? {
              id: row.fund_clusters.id,
              name: row.fund_clusters.name,
              code: row.fund_clusters.code,
            }
          : null,
        createdBy: row.users
          ? {
              id: row.users.id,
              fullName: row.users.fullName,
            }
          : null,
      }));
    } catch (error) {
      throw new Error(`Failed to get revenue entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get revenue entry by ID
   */
  async getRevenueEntryById(id: number) {
    try {
      const results = await db
        .select()
        .from(revenueEntries)
        .leftJoin(revenueSources, eq(revenueEntries.revenueSourceId, revenueSources.id))
        .leftJoin(fundClusters, eq(revenueEntries.fundClusterId, fundClusters.id))
        .leftJoin(users, eq(revenueEntries.createdBy, users.id))
        .where(eq(revenueEntries.id, id))
        .limit(1);

      if (results.length === 0) {
        throw new Error('Revenue entry not found');
      }

      const row = results[0];

      return {
        id: row.revenue_entries.id,
        entryNo: row.revenue_entries.entryNo,
        entryDate: row.revenue_entries.entryDate,
        amount: row.revenue_entries.amount,
        payorName: row.revenue_entries.payorName,
        particulars: row.revenue_entries.particulars,
        fiscalYear: row.revenue_entries.fiscalYear,
        createdAt: row.revenue_entries.createdAt,
        revenueSource: row.revenue_sources
          ? {
              id: row.revenue_sources.id,
              name: row.revenue_sources.name,
              code: row.revenue_sources.code,
              category: row.revenue_sources.category,
            }
          : null,
        fundCluster: row.fund_clusters
          ? {
              id: row.fund_clusters.id,
              name: row.fund_clusters.name,
              code: row.fund_clusters.code,
            }
          : null,
        createdBy: row.users
          ? {
              id: row.users.id,
              fullName: row.users.fullName,
            }
          : null,
      };
    } catch (error) {
      throw new Error(`Failed to get revenue entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get total revenue by period
   */
  async getTotalRevenue(startDate: Date, endDate: Date, filters?: RevenueFilters) {
    try {
      let query = db
        .select({
          total: sum(revenueEntries.amount).as('total'),
        })
        .from(revenueEntries)
        .where(
          and(
            gte(revenueEntries.entryDate, startDate),
            lte(revenueEntries.entryDate, endDate)
          )
        );

      if (filters?.revenueSourceId) {
        query = query.where(eq(revenueEntries.revenueSourceId, filters.revenueSourceId)) as any;
      }

      if (filters?.fundClusterId) {
        query = query.where(eq(revenueEntries.fundClusterId, filters.fundClusterId)) as any;
      }

      const result = await query;

      return {
        total: result[0]?.total ? parseFloat(result[0].total as string) : 0,
      };
    } catch (error) {
      throw new Error(`Failed to get total revenue: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get revenue by month (12-month trend)
   */
  async getRevenueByMonth(year: number) {
    try {
      const result = await db
        .select({
          month: sql<number>`MONTH(${revenueEntries.entryDate})`.as('month'),
          total: sum(revenueEntries.amount).as('total'),
        })
        .from(revenueEntries)
        .where(eq(revenueEntries.fiscalYear, year))
        .groupBy(sql`MONTH(${revenueEntries.entryDate})`);

      // Create array for all 12 months with 0 default
      const monthlyData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        total: 0,
      }));

      // Fill in actual data
      result.forEach((row) => {
        monthlyData[row.month - 1].total = parseFloat(row.total as string);
      });

      return monthlyData;
    } catch (error) {
      throw new Error(`Failed to get revenue by month: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get top revenue sources
   */
  async getTopRevenueSources(limit: number = 10, year?: number) {
    try {
      let query = db
        .select({
          revenueSourceId: revenueEntries.revenueSourceId,
          revenueSourceName: revenueSources.name,
          revenueSourceCode: revenueSources.code,
          total: sum(revenueEntries.amount).as('total'),
        })
        .from(revenueEntries)
        .leftJoin(revenueSources, eq(revenueEntries.revenueSourceId, revenueSources.id));

      if (year) {
        query = query.where(eq(revenueEntries.fiscalYear, year)) as any;
      }

      const result = await query
        .groupBy(revenueEntries.revenueSourceId)
        .orderBy(desc(sql`total`))
        .limit(limit);

      return result.map((row) => ({
        ...row,
        total: parseFloat(row.total as string),
      }));
    } catch (error) {
      throw new Error(`Failed to get top revenue sources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // ACCOUNTS RECEIVABLE METHODS
  // ============================================

  /**
   * Create AR with auto-numbering
   */
  async createAccountsReceivable(data: CreateARData, userId: number): Promise<{ id: number; arNo: string }> {
    try {
      // Generate AR number
      const arNo = await generateARNumber();

      // Validate due date >= invoice date
      if (new Date(data.dueDate) < new Date(data.invoiceDate)) {
        throw new Error('Due date must be on or after invoice date');
      }

      // Validate amount > 0
      const amount = parseFloat(data.amount);
      if (amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Insert AR
      const result = await db.insert(accountsReceivable).values({
        arNo,
        revenueSourceId: data.revenueSourceId,
        debtorName: data.debtorName,
        invoiceNo: data.invoiceNo || null,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        amount: data.amount,
        amountCollected: '0',
        balance: data.amount, // Initial balance equals amount
        status: 'outstanding',
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const id = Number(result.insertId);

      return {
        id,
        arNo,
      };
    } catch (error) {
      throw new Error(`Failed to create accounts receivable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get AR list with filters
   */
  async getAccountsReceivable(filters: ARFilters = {}) {
    try {
      const conditions = [];

      if (filters.status) {
        conditions.push(eq(accountsReceivable.status, filters.status));
      }

      if (filters.debtorName) {
        conditions.push(like(accountsReceivable.debtorName, `%${filters.debtorName}%`));
      }

      if (filters.revenueSourceId) {
        conditions.push(eq(accountsReceivable.revenueSourceId, filters.revenueSourceId));
      }

      if (filters.overdue) {
        conditions.push(
          and(
            lt(accountsReceivable.dueDate, new Date()),
            or(
              eq(accountsReceivable.status, 'outstanding'),
              eq(accountsReceivable.status, 'partial')
            )
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(accountsReceivable)
        .leftJoin(revenueSources, eq(accountsReceivable.revenueSourceId, revenueSources.id))
        .where(whereClause)
        .orderBy(desc(accountsReceivable.createdAt));

      // Transform to expected format
      return results.map((row) => ({
        id: row.accounts_receivable.id,
        arNo: row.accounts_receivable.arNo,
        debtorName: row.accounts_receivable.debtorName,
        invoiceNo: row.accounts_receivable.invoiceNo,
        invoiceDate: row.accounts_receivable.invoiceDate,
        dueDate: row.accounts_receivable.dueDate,
        amount: row.accounts_receivable.amount,
        amountCollected: row.accounts_receivable.amountCollected,
        balance: row.accounts_receivable.balance,
        status: row.accounts_receivable.status,
        createdAt: row.accounts_receivable.createdAt,
        revenueSource: row.revenue_sources
          ? {
              id: row.revenue_sources.id,
              name: row.revenue_sources.name,
              code: row.revenue_sources.code,
            }
          : null,
      }));
    } catch (error) {
      throw new Error(`Failed to get accounts receivable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get AR by ID with collection history
   */
  async getARById(id: number) {
    try {
      const results = await db
        .select()
        .from(accountsReceivable)
        .leftJoin(revenueSources, eq(accountsReceivable.revenueSourceId, revenueSources.id))
        .leftJoin(users, eq(accountsReceivable.createdBy, users.id))
        .where(eq(accountsReceivable.id, id))
        .limit(1);

      if (results.length === 0) {
        throw new Error('Accounts receivable not found');
      }

      const row = results[0];

      // Get collection history
      const collectionHistory = await db
        .select()
        .from(collections)
        .where(eq(collections.arId, id))
        .orderBy(desc(collections.collectionDate));

      return {
        id: row.accounts_receivable.id,
        arNo: row.accounts_receivable.arNo,
        debtorName: row.accounts_receivable.debtorName,
        invoiceNo: row.accounts_receivable.invoiceNo,
        invoiceDate: row.accounts_receivable.invoiceDate,
        dueDate: row.accounts_receivable.dueDate,
        amount: row.accounts_receivable.amount,
        amountCollected: row.accounts_receivable.amountCollected,
        balance: row.accounts_receivable.balance,
        status: row.accounts_receivable.status,
        createdAt: row.accounts_receivable.createdAt,
        updatedAt: row.accounts_receivable.updatedAt,
        revenueSource: row.revenue_sources
          ? {
              id: row.revenue_sources.id,
              name: row.revenue_sources.name,
              code: row.revenue_sources.code,
            }
          : null,
        createdBy: row.users
          ? {
              id: row.users.id,
              fullName: row.users.fullName,
            }
          : null,
        collections: collectionHistory.map((c) => ({
          id: c.id,
          collectionNo: c.collectionNo,
          collectionDate: c.collectionDate,
          amount: c.amount,
          paymentMode: c.paymentMode,
          checkNo: c.checkNo,
          orNo: c.orNo,
          remarks: c.remarks,
          createdAt: c.createdAt,
        })),
      };
    } catch (error) {
      throw new Error(`Failed to get AR details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get AR aging report
   */
  async getARAgingReport() {
    try {
      const result = await db
        .select({
          agingBucket: sql<string>`CASE
            WHEN ${accountsReceivable.dueDate} >= CURDATE() THEN 'Current'
            WHEN DATEDIFF(CURDATE(), ${accountsReceivable.dueDate}) BETWEEN 1 AND 30 THEN '1-30 days'
            WHEN DATEDIFF(CURDATE(), ${accountsReceivable.dueDate}) BETWEEN 31 AND 60 THEN '31-60 days'
            WHEN DATEDIFF(CURDATE(), ${accountsReceivable.dueDate}) BETWEEN 61 AND 90 THEN '61-90 days'
            ELSE '90+ days'
          END`.as('agingBucket'),
          count: sql<number>`COUNT(*)`.as('count'),
          totalAmount: sum(accountsReceivable.balance).as('totalAmount'),
        })
        .from(accountsReceivable)
        .where(
          or(
            eq(accountsReceivable.status, 'outstanding'),
            eq(accountsReceivable.status, 'partial')
          )
        )
        .groupBy(sql`agingBucket`);

      return result.map((row) => ({
        ...row,
        totalAmount: parseFloat(row.totalAmount as string),
      }));
    } catch (error) {
      throw new Error(`Failed to get AR aging report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update AR balance and status after collection
   */
  async updateARBalance(arId: number, collectionAmount: number) {
    try {
      // Get current AR
      const ar = await db
        .select()
        .from(accountsReceivable)
        .where(eq(accountsReceivable.id, arId))
        .limit(1);

      if (ar.length === 0) {
        throw new Error('AR not found');
      }

      const currentBalance = parseFloat(ar[0].balance);
      const currentCollected = parseFloat(ar[0].amountCollected);

      // Calculate new values
      const newBalance = currentBalance - collectionAmount;
      const newCollected = currentCollected + collectionAmount;

      // Determine new status
      let newStatus: 'outstanding' | 'partial' | 'paid' = 'outstanding';
      if (newBalance === 0) {
        newStatus = 'paid';
      } else if (newCollected > 0) {
        newStatus = 'partial';
      }

      // Update AR
      await db
        .update(accountsReceivable)
        .set({
          balance: newBalance.toString(),
          amountCollected: newCollected.toString(),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(accountsReceivable.id, arId));

      return { newBalance, newStatus };
    } catch (error) {
      throw new Error(`Failed to update AR balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Write off AR
   */
  async writeOffAR(arId: number, userId: number, reason: string) {
    try {
      await db
        .update(accountsReceivable)
        .set({
          status: 'written_off',
          updatedAt: new Date(),
        })
        .where(eq(accountsReceivable.id, arId));

      // TODO: Add audit log entry with reason
    } catch (error) {
      throw new Error(`Failed to write off AR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get overdue receivables
   */
  async getOverdueReceivables() {
    try {
      const result = await db
        .select({
          id: accountsReceivable.id,
          arNo: accountsReceivable.arNo,
          debtorName: accountsReceivable.debtorName,
          dueDate: accountsReceivable.dueDate,
          balance: accountsReceivable.balance,
          status: accountsReceivable.status,
          daysOverdue: sql<number>`DATEDIFF(CURDATE(), ${accountsReceivable.dueDate})`.as('daysOverdue'),
        })
        .from(accountsReceivable)
        .where(
          and(
            lt(accountsReceivable.dueDate, new Date()),
            or(
              eq(accountsReceivable.status, 'outstanding'),
              eq(accountsReceivable.status, 'partial')
            )
          )
        )
        .orderBy(accountsReceivable.dueDate);

      return result;
    } catch (error) {
      throw new Error(`Failed to get overdue receivables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // COLLECTION METHODS
  // ============================================

  /**
   * Record collection against AR
   */
  async recordCollection(data: CreateCollectionData, userId: number): Promise<{ id: number; collectionNo: string }> {
    try {
      // Generate collection number
      const collectionNo = await generateCollectionNumber();

      // Validate amount > 0
      const amount = parseFloat(data.amount);
      if (amount <= 0) {
        throw new Error('Collection amount must be greater than 0');
      }

      // Get AR balance
      const ar = await db
        .select({ balance: accountsReceivable.balance })
        .from(accountsReceivable)
        .where(eq(accountsReceivable.id, data.arId))
        .limit(1);

      if (ar.length === 0) {
        throw new Error('AR not found');
      }

      const arBalance = parseFloat(ar[0].balance);

      // Validate amount <= AR balance
      if (amount > arBalance) {
        throw new Error(`Collection amount (${amount}) cannot exceed AR balance (${arBalance})`);
      }

      // Insert collection
      const result = await db.insert(collections).values({
        collectionNo,
        arId: data.arId,
        orNo: data.orNo || null,
        collectionDate: data.collectionDate,
        amount: data.amount,
        paymentMode: data.paymentMode,
        checkNo: data.checkNo || null,
        checkDate: data.checkDate || null,
        checkBank: data.checkBank || null,
        remarks: data.remarks || null,
        createdBy: userId,
        createdAt: new Date(),
      });

      const id = Number(result.insertId);

      // Update AR balance and status
      await this.updateARBalance(data.arId, amount);

      return {
        id,
        collectionNo,
      };
    } catch (error) {
      throw new Error(`Failed to record collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get collections with filters
   */
  async getCollections(filters?: { arId?: number; startDate?: Date; endDate?: Date }) {
    try {
      const conditions = [];

      if (filters?.arId) {
        conditions.push(eq(collections.arId, filters.arId));
      }

      if (filters?.startDate) {
        conditions.push(gte(collections.collectionDate, filters.startDate));
      }

      if (filters?.endDate) {
        conditions.push(lte(collections.collectionDate, filters.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(collections)
        .leftJoin(accountsReceivable, eq(collections.arId, accountsReceivable.id))
        .leftJoin(revenueSources, eq(accountsReceivable.revenueSourceId, revenueSources.id))
        .where(whereClause)
        .orderBy(desc(collections.collectionDate));

      // Transform to expected format
      return results.map((row) => ({
        id: row.collections.id,
        collectionNo: row.collections.collectionNo,
        collectionDate: row.collections.collectionDate,
        amount: row.collections.amount,
        paymentMode: row.collections.paymentMode,
        checkNo: row.collections.checkNo,
        orNo: row.collections.orNo,
        remarks: row.collections.remarks,
        createdAt: row.collections.createdAt,
        ar: row.accounts_receivable
          ? {
              id: row.accounts_receivable.id,
              arNo: row.accounts_receivable.arNo,
              debtorName: row.accounts_receivable.debtorName,
            }
          : null,
      }));
    } catch (error) {
      throw new Error(`Failed to get collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get collection by ID
   */
  async getCollectionById(id: number) {
    try {
      const collection = await db
        .select({
          id: collections.id,
          collectionNo: collections.collectionNo,
          collectionDate: collections.collectionDate,
          amount: collections.amount,
          paymentMode: collections.paymentMode,
          checkNo: collections.checkNo,
          checkDate: collections.checkDate,
          checkBank: collections.checkBank,
          orNo: collections.orNo,
          remarks: collections.remarks,
          createdAt: collections.createdAt,
          arId: collections.arId,
          arNo: accountsReceivable.arNo,
          debtorName: accountsReceivable.debtorName,
          invoiceNo: accountsReceivable.invoiceNo,
          revenueSourceName: revenueSources.name,
          createdBy: collections.createdBy,
          createdByName: users.fullName,
        })
        .from(collections)
        .leftJoin(accountsReceivable, eq(collections.arId, accountsReceivable.id))
        .leftJoin(revenueSources, eq(accountsReceivable.revenueSourceId, revenueSources.id))
        .leftJoin(users, eq(collections.createdBy, users.id))
        .where(eq(collections.id, id))
        .limit(1);

      if (collection.length === 0) {
        throw new Error('Collection not found');
      }

      return collection[0];
    } catch (error) {
      throw new Error(`Failed to get collection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Link collection to OR
   */
  async linkCollectionToOR(collectionId: number, orNo: string) {
    try {
      // Verify OR exists
      const orExists = await db
        .select()
        .from(cashReceipts)
        .where(eq(cashReceipts.orNo, orNo))
        .limit(1);

      if (orExists.length === 0) {
        throw new Error(`OR number ${orNo} not found`);
      }

      // Update collection
      await db
        .update(collections)
        .set({ orNo })
        .where(eq(collections.id, collectionId));
    } catch (error) {
      throw new Error(`Failed to link collection to OR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // ANALYTICS & DASHBOARD METHODS
  // ============================================

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics() {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Today's revenue
      const todayRevenue = await db
        .select({
          total: sum(revenueEntries.amount).as('total'),
        })
        .from(revenueEntries)
        .where(sql`DATE(${revenueEntries.entryDate}) = CURDATE()`);

      // MTD revenue
      const mtdRevenue = await db
        .select({
          total: sum(revenueEntries.amount).as('total'),
        })
        .from(revenueEntries)
        .where(gte(revenueEntries.entryDate, startOfMonth));

      // Total outstanding AR
      const outstandingAR = await db
        .select({
          total: sum(accountsReceivable.balance).as('total'),
        })
        .from(accountsReceivable)
        .where(
          or(
            eq(accountsReceivable.status, 'outstanding'),
            eq(accountsReceivable.status, 'partial')
          )
        );

      // Collection rate (YTD)
      const ytdStart = new Date(today.getFullYear(), 0, 1);
      const ytdCollections = await db
        .select({
          total: sum(collections.amount).as('total'),
        })
        .from(collections)
        .where(gte(collections.collectionDate, ytdStart));

      const ytdBilled = await db
        .select({
          total: sum(accountsReceivable.amount).as('total'),
        })
        .from(accountsReceivable)
        .where(gte(accountsReceivable.invoiceDate, ytdStart));

      const collectionRate =
        ytdBilled[0]?.total && ytdCollections[0]?.total
          ? (parseFloat(ytdCollections[0].total as string) / parseFloat(ytdBilled[0].total as string)) * 100
          : 0;

      return {
        todayRevenue: todayRevenue[0]?.total ? parseFloat(todayRevenue[0].total as string) : 0,
        mtdRevenue: mtdRevenue[0]?.total ? parseFloat(mtdRevenue[0].total as string) : 0,
        totalOutstandingAR: outstandingAR[0]?.total ? parseFloat(outstandingAR[0].total as string) : 0,
        collectionRate: Math.round(collectionRate * 10) / 10, // Round to 1 decimal
      };
    } catch (error) {
      throw new Error(`Failed to get dashboard metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get revenue summary by category
   */
  async getRevenueSummaryByCategory(year?: number) {
    try {
      let query = db
        .select({
          category: revenueSources.category,
          total: sum(revenueEntries.amount).as('total'),
          count: sql<number>`COUNT(*)`.as('count'),
        })
        .from(revenueEntries)
        .leftJoin(revenueSources, eq(revenueEntries.revenueSourceId, revenueSources.id));

      if (year) {
        query = query.where(eq(revenueEntries.fiscalYear, year)) as any;
      }

      const result = await query
        .groupBy(revenueSources.category)
        .orderBy(desc(sql`total`));

      return result.map((row) => ({
        ...row,
        total: parseFloat(row.total as string),
      }));
    } catch (error) {
      throw new Error(`Failed to get revenue summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get collection efficiency
   */
  async getCollectionEfficiency() {
    try {
      const totalBilled = await db
        .select({
          total: sum(accountsReceivable.amount).as('total'),
        })
        .from(accountsReceivable);

      const totalCollected = await db
        .select({
          total: sum(accountsReceivable.amountCollected).as('total'),
        })
        .from(accountsReceivable);

      const billed = totalBilled[0]?.total ? parseFloat(totalBilled[0].total as string) : 0;
      const collected = totalCollected[0]?.total ? parseFloat(totalCollected[0].total as string) : 0;

      const efficiency = billed > 0 ? (collected / billed) * 100 : 0;

      return {
        totalBilled: billed,
        totalCollected: collected,
        efficiencyRate: Math.round(efficiency * 10) / 10,
      };
    } catch (error) {
      throw new Error(`Failed to get collection efficiency: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get recent revenue entries (for dashboard)
   */
  async getRecentRevenueEntries(limit: number = 10) {
    try {
      const entries = await db
        .select({
          id: revenueEntries.id,
          entryNo: revenueEntries.entryNo,
          entryDate: revenueEntries.entryDate,
          amount: revenueEntries.amount,
          payorName: revenueEntries.payorName,
          revenueSourceName: revenueSources.name,
          createdAt: revenueEntries.createdAt,
        })
        .from(revenueEntries)
        .leftJoin(revenueSources, eq(revenueEntries.revenueSourceId, revenueSources.id))
        .orderBy(desc(revenueEntries.createdAt))
        .limit(limit);

      return entries;
    } catch (error) {
      throw new Error(`Failed to get recent revenue entries: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const revenueService = new RevenueService();
