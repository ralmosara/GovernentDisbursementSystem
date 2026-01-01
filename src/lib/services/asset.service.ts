import { db } from '../db/connection';
import {
  assetCategories,
  fixedAssets,
  depreciationSchedule,
  assetDisposals,
  inventoryItems,
  inventoryTransactions,
  physicalInventoryCount,
  users,
} from '../db/schema';
import { eq, and, or, desc, sum, sql, isNotNull, gte, lte, like, lt } from 'drizzle-orm';
import {
  generateAssetNumber,
  generateInventoryCode,
  generateDisposalNumber,
  generateInventoryTransactionNumber,
  generatePhysicalCountNumber,
} from '../utils/serial-generator';
import {
  generateDepreciationSchedule,
  calculateMonthlyDepreciation,
  type DepreciationParams,
  type MonthlyDepreciation,
} from '../utils/depreciation-calculator';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface CreateDisposalData {
  assetId: number;
  disposalDate: string;
  disposalMethod: string;
  disposalValue?: string;
  buyerRecipient?: string;
  approvedBy?: number;
  remarks?: string;
}

export interface CreateAssetCategoryData {
  code: string;
  name: string;
  usefulLife?: number;
  depreciationMethod?: 'straight_line' | 'declining_balance';
  capitalizationThreshold?: string;
  isActive?: boolean;
}

export interface CreateFixedAssetData {
  description: string;
  assetCategoryId: number;
  acquisitionDate: Date;
  acquisitionCost: string;
  salvageValue?: string;
  usefulLife: number;
  location?: string;
  custodian?: string;
  serialNo?: string;
  status?: 'active' | 'disposed' | 'written_off';
}

export interface CreateAssetDisposalData {
  assetId: number;
  disposalDate: Date;
  disposalMethod: 'sale' | 'donation' | 'scrap' | 'transfer';
  disposalValue?: string;
  buyerRecipient?: string;
  approvedBy?: number;
  remarks?: string;
}

export interface CreateInventoryItemData {
  itemName: string;
  description?: string;
  unit: string;
  unitCost: string;
  quantityOnHand?: number;
  minimumLevel?: number;
  maximumLevel?: number;
  isActive?: boolean;
}

export interface CreateInventoryTransactionData {
  itemId: number;
  transactionDate: Date;
  transactionType: 'receipt' | 'issue' | 'adjustment' | 'transfer';
  quantity: number;
  unitCost?: string;
  reference?: string;
  requestedBy?: string;
  remarks?: string;
}

export interface CreatePhysicalCountData {
  countDate: Date;
  itemId: number;
  systemQuantity: number;
  physicalQuantity: number;
  countedBy?: string;
  verifiedBy?: number;
  remarks?: string;
}

export interface AssetFilters {
  categoryId?: number;
  status?: 'active' | 'disposed' | 'written_off';
  location?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface InventoryFilters {
  lowStock?: boolean;
  isActive?: boolean;
}

// ============================================
// ASSET SERVICE CLASS
// ============================================

export class AssetService {
  // ============================================
  // ASSET CATEGORY METHODS
  // ============================================

  /**
   * Create new asset category
   */
  async createAssetCategory(data: CreateAssetCategoryData): Promise<{ id: number; code: string; name: string }> {
    try {
      // Check if code already exists
      const existing = await db
        .select()
        .from(assetCategories)
        .where(eq(assetCategories.code, data.code))
        .limit(1);

      if (existing.length > 0) {
        throw new Error(`Asset category code "${data.code}" already exists`);
      }

      // Insert new category
      const [result] = await db.insert(assetCategories).values({
        code: data.code,
        name: data.name,
        usefulLife: data.usefulLife,
        depreciationMethod: data.depreciationMethod,
        capitalizationThreshold: data.capitalizationThreshold,
        isActive: data.isActive ?? true,
      });

      return {
        id: Number(result.insertId),
        code: data.code,
        name: data.name,
      };
    } catch (error) {
      console.error('Error creating asset category:', error);
      throw error;
    }
  }

  /**
   * Get all asset categories with optional active filter
   */
  async getAssetCategories(isActive?: boolean) {
    try {
      const conditions = [];

      if (isActive !== undefined) {
        conditions.push(eq(assetCategories.isActive, isActive));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(assetCategories)
        .where(whereClause)
        .orderBy(assetCategories.name);

      return results;
    } catch (error) {
      console.error('Error getting asset categories:', error);
      throw error;
    }
  }

  /**
   * Get asset category by ID
   */
  async getAssetCategoryById(id: number) {
    try {
      const results = await db
        .select()
        .from(assetCategories)
        .where(eq(assetCategories.id, id))
        .limit(1);

      if (results.length === 0) {
        throw new Error(`Asset category with ID ${id} not found`);
      }

      return results[0];
    } catch (error) {
      console.error('Error getting asset category:', error);
      throw error;
    }
  }

  /**
   * Update asset category
   */
  async updateAssetCategory(id: number, data: Partial<CreateAssetCategoryData>) {
    try {
      // If updating code, check for duplicates
      if (data.code) {
        const existing = await db
          .select()
          .from(assetCategories)
          .where(and(
            eq(assetCategories.code, data.code),
            sql`${assetCategories.id} != ${id}`
          ))
          .limit(1);

        if (existing.length > 0) {
          throw new Error(`Asset category code "${data.code}" already exists`);
        }
      }

      await db
        .update(assetCategories)
        .set(data)
        .where(eq(assetCategories.id, id));

      return this.getAssetCategoryById(id);
    } catch (error) {
      console.error('Error updating asset category:', error);
      throw error;
    }
  }

  /**
   * Toggle asset category active status
   */
  async toggleAssetCategoryStatus(id: number, isActive: boolean) {
    try {
      await db
        .update(assetCategories)
        .set({ isActive })
        .where(eq(assetCategories.id, id));

      return { success: true };
    } catch (error) {
      console.error('Error toggling asset category status:', error);
      throw error;
    }
  }

  // ============================================
  // FIXED ASSET METHODS
  // ============================================

  /**
   * Create new fixed asset with auto-numbering
   */
  async createFixedAsset(data: CreateFixedAssetData, userId: number): Promise<{ id: number; assetNo: string }> {
    try {
      // Generate asset number
      const assetNo = await generateAssetNumber();

      // Get category details for default values
      const category = await this.getAssetCategoryById(data.assetCategoryId);

      // Insert new asset
      const [result] = await db.insert(fixedAssets).values({
        assetNo,
        assetCategoryId: data.assetCategoryId,
        description: data.description,
        acquisitionDate: data.acquisitionDate,
        acquisitionCost: data.acquisitionCost,
        salvageValue: data.salvageValue || '0',
        usefulLife: data.usefulLife,
        location: data.location,
        custodian: data.custodian,
        serialNo: data.serialNo,
        status: data.status || 'active',
        createdBy: userId,
      });

      const assetId = Number(result.insertId);

      // Generate depreciation schedule if category has depreciation method
      if (category.depreciationMethod) {
        await this.generateAssetDepreciationSchedule(
          assetId,
          parseFloat(data.acquisitionCost),
          parseFloat(data.salvageValue || '0'),
          data.usefulLife,
          data.acquisitionDate,
          category.depreciationMethod as 'straight_line' | 'declining_balance'
        );
      }

      return { id: assetId, assetNo };
    } catch (error) {
      console.error('Error creating fixed asset:', error);
      throw error;
    }
  }

  /**
   * Get fixed assets with filters
   */
  async getFixedAssets(filters: AssetFilters = {}) {
    try {
      const conditions = [];

      if (filters.categoryId) {
        conditions.push(eq(fixedAssets.assetCategoryId, filters.categoryId));
      }

      if (filters.status) {
        conditions.push(eq(fixedAssets.status, filters.status));
      }

      if (filters.location) {
        conditions.push(like(fixedAssets.location, `%${filters.location}%`));
      }

      if (filters.startDate) {
        conditions.push(gte(fixedAssets.acquisitionDate, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(fixedAssets.acquisitionDate, filters.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(fixedAssets)
        .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
        .leftJoin(users, eq(fixedAssets.createdBy, users.id))
        .where(whereClause)
        .orderBy(desc(fixedAssets.acquisitionDate));

      return results.map((row) => ({
        id: row.fixed_assets.id,
        assetNo: row.fixed_assets.assetNo,
        description: row.fixed_assets.description,
        acquisitionDate: row.fixed_assets.acquisitionDate,
        acquisitionCost: row.fixed_assets.acquisitionCost,
        salvageValue: row.fixed_assets.salvageValue,
        usefulLife: row.fixed_assets.usefulLife,
        location: row.fixed_assets.location,
        custodian: row.fixed_assets.custodian,
        serialNo: row.fixed_assets.serialNo,
        status: row.fixed_assets.status,
        createdAt: row.fixed_assets.createdAt,
        category: row.asset_categories ? {
          id: row.asset_categories.id,
          code: row.asset_categories.code,
          name: row.asset_categories.name,
          depreciationMethod: row.asset_categories.depreciationMethod,
        } : null,
        createdBy: row.users ? {
          id: row.users.id,
          firstName: row.users.firstName,
          lastName: row.users.lastName,
        } : null,
      }));
    } catch (error) {
      console.error('Error getting fixed assets:', error);
      throw error;
    }
  }

  /**
   * Get fixed asset by ID with full details
   */
  async getFixedAssetById(id: number) {
    try {
      const results = await db
        .select()
        .from(fixedAssets)
        .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
        .leftJoin(users, eq(fixedAssets.createdBy, users.id))
        .where(eq(fixedAssets.id, id))
        .limit(1);

      if (results.length === 0) {
        throw new Error(`Fixed asset with ID ${id} not found`);
      }

      const row = results[0];

      return {
        id: row.fixed_assets.id,
        assetNo: row.fixed_assets.assetNo,
        description: row.fixed_assets.description,
        acquisitionDate: row.fixed_assets.acquisitionDate,
        acquisitionCost: row.fixed_assets.acquisitionCost,
        salvageValue: row.fixed_assets.salvageValue,
        usefulLife: row.fixed_assets.usefulLife,
        location: row.fixed_assets.location,
        custodian: row.fixed_assets.custodian,
        serialNo: row.fixed_assets.serialNo,
        status: row.fixed_assets.status,
        createdAt: row.fixed_assets.createdAt,
        updatedAt: row.fixed_assets.updatedAt,
        category: row.asset_categories ? {
          id: row.asset_categories.id,
          code: row.asset_categories.code,
          name: row.asset_categories.name,
          usefulLife: row.asset_categories.usefulLife,
          depreciationMethod: row.asset_categories.depreciationMethod,
        } : null,
        createdBy: row.users ? {
          id: row.users.id,
          firstName: row.users.firstName,
          lastName: row.users.lastName,
        } : null,
      };
    } catch (error) {
      console.error('Error getting fixed asset:', error);
      throw error;
    }
  }

  /**
   * Update fixed asset
   */
  async updateFixedAsset(id: number, data: Partial<CreateFixedAssetData>) {
    try {
      await db
        .update(fixedAssets)
        .set(data)
        .where(eq(fixedAssets.id, id));

      return this.getFixedAssetById(id);
    } catch (error) {
      console.error('Error updating fixed asset:', error);
      throw error;
    }
  }

  /**
   * Update asset status
   */
  async updateAssetStatus(id: number, status: 'active' | 'disposed' | 'written_off') {
    try {
      await db
        .update(fixedAssets)
        .set({ status })
        .where(eq(fixedAssets.id, id));

      return { success: true };
    } catch (error) {
      console.error('Error updating asset status:', error);
      throw error;
    }
  }

  /**
   * Search assets by serial number
   */
  async searchAssetsBySerialNumber(serialNo: string) {
    try {
      const results = await db
        .select()
        .from(fixedAssets)
        .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
        .where(like(fixedAssets.serialNo, `%${serialNo}%`))
        .orderBy(fixedAssets.assetNo);

      return results.map((row) => ({
        id: row.fixed_assets.id,
        assetNo: row.fixed_assets.assetNo,
        description: row.fixed_assets.description,
        serialNo: row.fixed_assets.serialNo,
        status: row.fixed_assets.status,
        category: row.asset_categories ? {
          name: row.asset_categories.name,
        } : null,
      }));
    } catch (error) {
      console.error('Error searching assets:', error);
      throw error;
    }
  }

  /**
   * Get assets by location
   */
  async getAssetsByLocation(location: string) {
    try {
      return this.getFixedAssets({ location });
    } catch (error) {
      console.error('Error getting assets by location:', error);
      throw error;
    }
  }

  /**
   * Get assets by custodian
   */
  async getAssetsByCustodian(custodian: string) {
    try {
      const results = await db
        .select()
        .from(fixedAssets)
        .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
        .where(like(fixedAssets.custodian, `%${custodian}%`))
        .orderBy(fixedAssets.assetNo);

      return results.map((row) => ({
        id: row.fixed_assets.id,
        assetNo: row.fixed_assets.assetNo,
        description: row.fixed_assets.description,
        custodian: row.fixed_assets.custodian,
        status: row.fixed_assets.status,
        category: row.asset_categories ? {
          name: row.asset_categories.name,
        } : null,
      }));
    } catch (error) {
      console.error('Error getting assets by custodian:', error);
      throw error;
    }
  }

  // ============================================
  // DEPRECIATION METHODS
  // ============================================

  /**
   * Generate depreciation schedule for a new asset
   */
  async generateAssetDepreciationSchedule(
    assetId: number,
    acquisitionCost: number,
    salvageValue: number,
    usefulLifeYears: number,
    acquisitionDate: Date,
    method: 'straight_line' | 'declining_balance'
  ) {
    try {
      // Generate schedule using depreciation calculator
      const schedule = generateDepreciationSchedule({
        acquisitionCost,
        salvageValue,
        usefulLifeYears,
        acquisitionDate,
        method,
      });

      // Insert schedule records into database
      const scheduleRecords = schedule.map((entry) => ({
        assetId,
        periodMonth: entry.month,
        periodYear: entry.year,
        depreciationAmount: entry.depreciationAmount.toString(),
        accumulatedDepreciation: entry.accumulatedDepreciation.toString(),
        bookValue: entry.bookValue.toString(),
      }));

      // Insert in batches if needed
      if (scheduleRecords.length > 0) {
        await db.insert(depreciationSchedule).values(scheduleRecords);
      }

      return { success: true, scheduleEntries: scheduleRecords.length };
    } catch (error) {
      console.error('Error generating depreciation schedule:', error);
      throw error;
    }
  }

  /**
   * Get depreciation schedule for an asset
   */
  async getDepreciationSchedule(assetId: number) {
    try {
      const results = await db
        .select()
        .from(depreciationSchedule)
        .where(eq(depreciationSchedule.assetId, assetId))
        .orderBy(depreciationSchedule.periodYear, depreciationSchedule.periodMonth);

      return results;
    } catch (error) {
      console.error('Error getting depreciation schedule:', error);
      throw error;
    }
  }

  // ============================================
  // DASHBOARD & ANALYTICS
  // ============================================

  async getAssetDashboardMetrics(): Promise<{
    totalAssets: number;
    totalAcquisitionCost: number;
    totalAccumulatedDepreciation: number;
    currentBookValue: number;
    activeAssets: number;
    disposedAssets: number;
    assetsByCategory: Array<{ category: string; count: number; value: number }>;
    assetsByStatus: Array<{ status: string; count: number }>;
    recentAssets: Array<any>;
  }> {
    try {
      // Get all active assets with categories
      const assets = await db
        .select()
        .from(fixedAssets)
        .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id));

      // Calculate totals
      const totalAssets = assets.length;
      const totalAcquisitionCost = assets.reduce(
        (sum, row) => sum + parseFloat(row.fixed_assets.acquisitionCost || '0'),
        0
      );
      const activeAssets = assets.filter((row) => row.fixed_assets.status === 'active').length;
      const disposedAssets = assets.filter((row) => row.fixed_assets.status === 'disposed').length;

      // Get latest depreciation values for each asset
      const depreciationData = await db
        .select({
          assetId: depreciationSchedule.assetId,
          accumulatedDepreciation: depreciationSchedule.accumulatedDepreciation,
          bookValue: depreciationSchedule.bookValue,
        })
        .from(depreciationSchedule)
        .where(
          sql`(${depreciationSchedule.assetId}, ${depreciationSchedule.periodYear}, ${depreciationSchedule.periodMonth}) IN (
            SELECT ${depreciationSchedule.assetId},
                   MAX(${depreciationSchedule.periodYear}),
                   MAX(${depreciationSchedule.periodMonth})
            FROM ${depreciationSchedule}
            GROUP BY ${depreciationSchedule.assetId}
          )`
        );

      // Create lookup map for depreciation
      const depreciationMap = new Map(
        depreciationData.map((d) => [d.assetId, d])
      );

      // Calculate accumulated depreciation and book value
      let totalAccumulatedDepreciation = 0;
      let currentBookValue = 0;

      assets.forEach((row) => {
        const assetId = row.fixed_assets.id;
        const depreciation = depreciationMap.get(assetId);

        if (depreciation) {
          totalAccumulatedDepreciation += parseFloat(depreciation.accumulatedDepreciation || '0');
          currentBookValue += parseFloat(depreciation.bookValue || '0');
        } else {
          // No depreciation yet, use acquisition cost
          currentBookValue += parseFloat(row.fixed_assets.acquisitionCost || '0');
        }
      });

      // Group by category
      const categoryMap = new Map<string, { count: number; value: number }>();
      assets.forEach((row) => {
        const categoryName = row.asset_categories?.name || 'Uncategorized';
        const cost = parseFloat(row.fixed_assets.acquisitionCost || '0');

        if (categoryMap.has(categoryName)) {
          const existing = categoryMap.get(categoryName)!;
          categoryMap.set(categoryName, {
            count: existing.count + 1,
            value: existing.value + cost,
          });
        } else {
          categoryMap.set(categoryName, { count: 1, value: cost });
        }
      });

      const assetsByCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        value: data.value,
      }));

      // Group by status
      const statusMap = new Map<string, number>();
      assets.forEach((row) => {
        const status = row.fixed_assets.status || 'active';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const assetsByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
      }));

      // Get recent assets (last 10)
      const recentResults = await db
        .select()
        .from(fixedAssets)
        .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
        .orderBy(desc(fixedAssets.createdAt))
        .limit(10);

      const recentAssets = recentResults.map((row) => ({
        id: row.fixed_assets.id,
        assetNo: row.fixed_assets.assetNo,
        description: row.fixed_assets.description,
        category: row.asset_categories?.name || null,
        acquisitionCost: row.fixed_assets.acquisitionCost,
        acquisitionDate: row.fixed_assets.acquisitionDate,
        status: row.fixed_assets.status,
      }));

      return {
        totalAssets,
        totalAcquisitionCost,
        totalAccumulatedDepreciation,
        currentBookValue,
        activeAssets,
        disposedAssets,
        assetsByCategory,
        assetsByStatus,
        recentAssets,
      };
    } catch (error) {
      console.error('Error getting asset dashboard metrics:', error);
      throw error;
    }
  }

  async getAssetsByCategory(): Promise<Array<{ category: string; count: number; totalValue: number }>> {
    try {
      const results = await db
        .select({
          categoryName: assetCategories.name,
          count: sql<number>`COUNT(${fixedAssets.id})`,
          totalValue: sql<string>`SUM(${fixedAssets.acquisitionCost})`,
        })
        .from(fixedAssets)
        .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
        .groupBy(assetCategories.id, assetCategories.name);

      return results.map((row) => ({
        category: row.categoryName || 'Uncategorized',
        count: row.count,
        totalValue: parseFloat(row.totalValue || '0'),
      }));
    } catch (error) {
      console.error('Error getting assets by category:', error);
      throw error;
    }
  }

  async getAssetsByStatus(): Promise<Array<{ status: string; count: number }>> {
    try {
      const results = await db
        .select({
          status: fixedAssets.status,
          count: sql<number>`COUNT(*)`,
        })
        .from(fixedAssets)
        .groupBy(fixedAssets.status);

      return results.map((row) => ({
        status: row.status || 'active',
        count: row.count,
      }));
    } catch (error) {
      console.error('Error getting assets by status:', error);
      throw error;
    }
  }

  async getRecentAssets(limit: number = 10): Promise<Array<any>> {
    try {
      const results = await db
        .select()
        .from(fixedAssets)
        .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
        .orderBy(desc(fixedAssets.createdAt))
        .limit(limit);

      return results.map((row) => ({
        id: row.fixed_assets.id,
        assetNo: row.fixed_assets.assetNo,
        description: row.fixed_assets.description,
        category: row.asset_categories ? {
          id: row.asset_categories.id,
          name: row.asset_categories.name,
        } : null,
        acquisitionCost: row.fixed_assets.acquisitionCost,
        acquisitionDate: row.fixed_assets.acquisitionDate,
        status: row.fixed_assets.status,
        createdAt: row.fixed_assets.createdAt,
      }));
    } catch (error) {
      console.error('Error getting recent assets:', error);
      throw error;
    }
  }

  // ============================================
  // ASSET DISPOSAL MANAGEMENT
  // ============================================

  async createDisposal(data: CreateDisposalData, userId: number): Promise<{ id: number; disposalNo: string }> {
    try {
      // Generate disposal number
      const disposalNo = await generateDisposalNumber();

      // Get asset details to verify it exists and is active
      const asset = await this.getFixedAssetById(data.assetId);
      if (!asset) {
        throw new Error('Asset not found');
      }
      if (asset.status === 'disposed') {
        throw new Error('Asset is already disposed');
      }

      // Insert disposal record
      const [result] = await db.insert(assetDisposals).values({
        disposalNo,
        assetId: data.assetId,
        disposalDate: data.disposalDate,
        disposalMethod: data.disposalMethod,
        disposalValue: data.disposalValue || '0',
        buyerRecipient: data.buyerRecipient,
        approvedBy: data.approvedBy,
        remarks: data.remarks,
        createdBy: userId,
      });

      const disposalId = Number(result.insertId);

      // Update asset status to disposed
      await db
        .update(fixedAssets)
        .set({ status: 'disposed' })
        .where(eq(fixedAssets.id, data.assetId));

      return { id: disposalId, disposalNo };
    } catch (error) {
      console.error('Error creating disposal:', error);
      throw error;
    }
  }

  async getDisposals(filters?: {
    assetId?: number;
    disposalMethod?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Array<any>> {
    try {
      const conditions = [];

      if (filters?.assetId) {
        conditions.push(eq(assetDisposals.assetId, filters.assetId));
      }
      if (filters?.disposalMethod) {
        conditions.push(eq(assetDisposals.disposalMethod, filters.disposalMethod));
      }
      if (filters?.fromDate) {
        conditions.push(gte(assetDisposals.disposalDate, filters.fromDate));
      }
      if (filters?.toDate) {
        conditions.push(lte(assetDisposals.disposalDate, filters.toDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(assetDisposals)
        .leftJoin(fixedAssets, eq(assetDisposals.assetId, fixedAssets.id))
        .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
        .leftJoin(users, eq(assetDisposals.approvedBy, users.id))
        .where(whereClause)
        .orderBy(desc(assetDisposals.disposalDate));

      return results.map((row) => ({
        id: row.asset_disposals.id,
        disposalNo: row.asset_disposals.disposalNo,
        disposalDate: row.asset_disposals.disposalDate,
        disposalMethod: row.asset_disposals.disposalMethod,
        disposalValue: row.asset_disposals.disposalValue,
        buyerRecipient: row.asset_disposals.buyerRecipient,
        remarks: row.asset_disposals.remarks,
        asset: row.fixed_assets ? {
          id: row.fixed_assets.id,
          assetNo: row.fixed_assets.assetNo,
          description: row.fixed_assets.description,
          acquisitionCost: row.fixed_assets.acquisitionCost,
          category: row.asset_categories ? {
            id: row.asset_categories.id,
            name: row.asset_categories.name,
          } : null,
        } : null,
        approvedBy: row.users ? {
          id: row.users.id,
          name: row.users.name,
        } : null,
        createdAt: row.asset_disposals.createdAt,
      }));
    } catch (error) {
      console.error('Error getting disposals:', error);
      throw error;
    }
  }

  async getDisposalById(id: number): Promise<any> {
    try {
      const results = await db
        .select()
        .from(assetDisposals)
        .leftJoin(fixedAssets, eq(assetDisposals.assetId, fixedAssets.id))
        .leftJoin(assetCategories, eq(fixedAssets.assetCategoryId, assetCategories.id))
        .leftJoin(users, eq(assetDisposals.approvedBy, users.id))
        .where(eq(assetDisposals.id, id))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        id: row.asset_disposals.id,
        disposalNo: row.asset_disposals.disposalNo,
        disposalDate: row.asset_disposals.disposalDate,
        disposalMethod: row.asset_disposals.disposalMethod,
        disposalValue: row.asset_disposals.disposalValue,
        buyerRecipient: row.asset_disposals.buyerRecipient,
        remarks: row.asset_disposals.remarks,
        asset: row.fixed_assets ? {
          id: row.fixed_assets.id,
          assetNo: row.fixed_assets.assetNo,
          description: row.fixed_assets.description,
          acquisitionCost: row.fixed_assets.acquisitionCost,
          acquisitionDate: row.fixed_assets.acquisitionDate,
          salvageValue: row.fixed_assets.salvageValue,
          category: row.asset_categories ? {
            id: row.asset_categories.id,
            name: row.asset_categories.name,
          } : null,
        } : null,
        approvedBy: row.users ? {
          id: row.users.id,
          name: row.users.name,
        } : null,
        createdAt: row.asset_disposals.createdAt,
      };
    } catch (error) {
      console.error('Error getting disposal by ID:', error);
      throw error;
    }
  }

  async updateDisposal(
    id: number,
    data: Partial<CreateDisposalData>
  ): Promise<void> {
    try {
      await db
        .update(assetDisposals)
        .set({
          disposalDate: data.disposalDate,
          disposalMethod: data.disposalMethod,
          disposalValue: data.disposalValue,
          buyerRecipient: data.buyerRecipient,
          approvedBy: data.approvedBy,
          remarks: data.remarks,
        })
        .where(eq(assetDisposals.id, id));
    } catch (error) {
      console.error('Error updating disposal:', error);
      throw error;
    }
  }

  async deleteDisposal(id: number): Promise<void> {
    try {
      // Get disposal to find the asset ID
      const disposal = await this.getDisposalById(id);
      if (!disposal) {
        throw new Error('Disposal not found');
      }

      // Delete the disposal record
      await db.delete(assetDisposals).where(eq(assetDisposals.id, id));

      // Reactivate the asset
      if (disposal.asset) {
        await db
          .update(fixedAssets)
          .set({ status: 'active' })
          .where(eq(fixedAssets.id, disposal.asset.id));
      }
    } catch (error) {
      console.error('Error deleting disposal:', error);
      throw error;
    }
  }

  async getDisposalsByAsset(assetId: number): Promise<Array<any>> {
    try {
      return await this.getDisposals({ assetId });
    } catch (error) {
      console.error('Error getting disposals by asset:', error);
      throw error;
    }
  }

  // ============================================
  // INVENTORY ITEMS MANAGEMENT
  // ============================================

  async createInventoryItem(data: CreateInventoryItemData, userId: number): Promise<{ id: number; itemCode: string }> {
    try {
      // Generate inventory code
      const itemCode = await generateInventoryCode();

      const [result] = await db.insert(inventoryItems).values({
        itemCode,
        itemName: data.itemName,
        description: data.description,
        unit: data.unit,
        unitCost: data.unitCost,
        quantityOnHand: data.quantityOnHand || 0,
        minimumLevel: data.minimumLevel || 0,
        maximumLevel: data.maximumLevel || 0,
        isActive: data.isActive !== false,
        createdBy: userId,
      });

      const itemId = Number(result.insertId);
      return { id: itemId, itemCode };
    } catch (error) {
      console.error('Error creating inventory item:', error);
      throw error;
    }
  }

  async getInventoryItems(filters?: {
    search?: string;
    isActive?: boolean;
    lowStock?: boolean;
  }): Promise<Array<any>> {
    try {
      const conditions = [];

      if (filters?.search) {
        conditions.push(
          or(
            like(inventoryItems.itemCode, `%${filters.search}%`),
            like(inventoryItems.itemName, `%${filters.search}%`),
            like(inventoryItems.description, `%${filters.search}%`)
          )
        );
      }

      if (filters?.isActive !== undefined) {
        conditions.push(eq(inventoryItems.isActive, filters.isActive));
      }

      if (filters?.lowStock) {
        conditions.push(
          sql`${inventoryItems.quantityOnHand} <= ${inventoryItems.minimumLevel}`
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(inventoryItems)
        .leftJoin(users, eq(inventoryItems.createdBy, users.id))
        .where(whereClause)
        .orderBy(desc(inventoryItems.createdAt));

      return results.map((row) => ({
        id: row.inventory_items.id,
        itemCode: row.inventory_items.itemCode,
        itemName: row.inventory_items.itemName,
        description: row.inventory_items.description,
        unit: row.inventory_items.unit,
        unitCost: row.inventory_items.unitCost,
        quantityOnHand: row.inventory_items.quantityOnHand,
        minimumLevel: row.inventory_items.minimumLevel,
        maximumLevel: row.inventory_items.maximumLevel,
        isActive: row.inventory_items.isActive,
        totalValue: parseFloat(row.inventory_items.unitCost || '0') * (row.inventory_items.quantityOnHand || 0),
        stockStatus: this.getStockStatus(
          row.inventory_items.quantityOnHand || 0,
          row.inventory_items.minimumLevel || 0,
          row.inventory_items.maximumLevel || 0
        ),
        createdBy: row.users ? {
          id: row.users.id,
          name: row.users.name,
        } : null,
        createdAt: row.inventory_items.createdAt,
      }));
    } catch (error) {
      console.error('Error getting inventory items:', error);
      throw error;
    }
  }

  async getInventoryItemById(id: number): Promise<any> {
    try {
      const results = await db
        .select()
        .from(inventoryItems)
        .leftJoin(users, eq(inventoryItems.createdBy, users.id))
        .where(eq(inventoryItems.id, id))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        id: row.inventory_items.id,
        itemCode: row.inventory_items.itemCode,
        itemName: row.inventory_items.itemName,
        description: row.inventory_items.description,
        unit: row.inventory_items.unit,
        unitCost: row.inventory_items.unitCost,
        quantityOnHand: row.inventory_items.quantityOnHand,
        minimumLevel: row.inventory_items.minimumLevel,
        maximumLevel: row.inventory_items.maximumLevel,
        isActive: row.inventory_items.isActive,
        totalValue: parseFloat(row.inventory_items.unitCost || '0') * (row.inventory_items.quantityOnHand || 0),
        stockStatus: this.getStockStatus(
          row.inventory_items.quantityOnHand || 0,
          row.inventory_items.minimumLevel || 0,
          row.inventory_items.maximumLevel || 0
        ),
        createdBy: row.users ? {
          id: row.users.id,
          name: row.users.name,
        } : null,
        createdAt: row.inventory_items.createdAt,
      };
    } catch (error) {
      console.error('Error getting inventory item by ID:', error);
      throw error;
    }
  }

  async updateInventoryItem(
    id: number,
    data: Partial<CreateInventoryItemData>
  ): Promise<void> {
    try {
      await db
        .update(inventoryItems)
        .set({
          itemName: data.itemName,
          description: data.description,
          unit: data.unit,
          unitCost: data.unitCost,
          minimumLevel: data.minimumLevel,
          maximumLevel: data.maximumLevel,
          isActive: data.isActive,
        })
        .where(eq(inventoryItems.id, id));
    } catch (error) {
      console.error('Error updating inventory item:', error);
      throw error;
    }
  }

  async deleteInventoryItem(id: number): Promise<void> {
    try {
      // Check if there are any transactions for this item
      const transactions = await db
        .select()
        .from(inventoryTransactions)
        .where(eq(inventoryTransactions.itemId, id))
        .limit(1);

      if (transactions.length > 0) {
        throw new Error('Cannot delete item with existing transactions. Consider deactivating instead.');
      }

      await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      throw error;
    }
  }

  async adjustInventoryQuantity(
    itemId: number,
    quantity: number,
    operation: 'add' | 'subtract' | 'set'
  ): Promise<void> {
    try {
      const item = await this.getInventoryItemById(itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      let newQuantity = item.quantityOnHand;

      if (operation === 'add') {
        newQuantity += quantity;
      } else if (operation === 'subtract') {
        newQuantity -= quantity;
        if (newQuantity < 0) {
          throw new Error('Insufficient quantity on hand');
        }
      } else if (operation === 'set') {
        newQuantity = quantity;
      }

      await db
        .update(inventoryItems)
        .set({ quantityOnHand: newQuantity })
        .where(eq(inventoryItems.id, itemId));
    } catch (error) {
      console.error('Error adjusting inventory quantity:', error);
      throw error;
    }
  }

  async getLowStockItems(): Promise<Array<any>> {
    try {
      return await this.getInventoryItems({ isActive: true, lowStock: true });
    } catch (error) {
      console.error('Error getting low stock items:', error);
      throw error;
    }
  }

  async getInventoryDashboardMetrics(): Promise<{
    totalItems: number;
    activeItems: number;
    totalValue: number;
    lowStockItems: number;
    outOfStockItems: number;
  }> {
    try {
      const items = await this.getInventoryItems({ isActive: true });

      const totalItems = items.length;
      const activeItems = items.filter((item) => item.isActive).length;
      const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
      const lowStockItems = items.filter((item) => item.stockStatus === 'low').length;
      const outOfStockItems = items.filter((item) => item.stockStatus === 'out').length;

      return {
        totalItems,
        activeItems,
        totalValue,
        lowStockItems,
        outOfStockItems,
      };
    } catch (error) {
      console.error('Error getting inventory dashboard metrics:', error);
      throw error;
    }
  }

  // Helper method to determine stock status
  private getStockStatus(
    quantityOnHand: number,
    minimumLevel: number,
    maximumLevel: number
  ): 'adequate' | 'low' | 'out' | 'excess' {
    if (quantityOnHand === 0) {
      return 'out';
    } else if (quantityOnHand <= minimumLevel) {
      return 'low';
    } else if (maximumLevel > 0 && quantityOnHand >= maximumLevel) {
      return 'excess';
    } else {
      return 'adequate';
    }
  }

  // ============================================
  // INVENTORY TRANSACTIONS MANAGEMENT
  // ============================================

  async createInventoryTransaction(data: CreateInventoryTransactionData, userId: number): Promise<{ id: number; transactionNo: string }> {
    try {
      // Generate transaction number
      const transactionNo = await generateInventoryTransactionNumber();

      // Get item details
      const item = await this.getInventoryItemById(data.itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      // Validate quantity for issue transactions
      if (data.transactionType === 'issue' && item.quantityOnHand < data.quantity) {
        throw new Error('Insufficient quantity on hand');
      }

      // Insert transaction record
      const [result] = await db.insert(inventoryTransactions).values({
        transactionNo,
        itemId: data.itemId,
        transactionDate: data.transactionDate,
        transactionType: data.transactionType,
        quantity: data.quantity,
        unitCost: data.unitCost || item.unitCost,
        reference: data.reference,
        requestedBy: data.requestedBy,
        remarks: data.remarks,
        createdBy: userId,
      });

      const transactionId = Number(result.insertId);

      // Update inventory quantity based on transaction type
      let operation: 'add' | 'subtract' | 'set' = 'set';
      if (data.transactionType === 'receipt') {
        operation = 'add';
      } else if (data.transactionType === 'issue') {
        operation = 'subtract';
      } else if (data.transactionType === 'adjustment') {
        operation = 'set';
      }

      await this.adjustInventoryQuantity(data.itemId, data.quantity, operation);

      return { id: transactionId, transactionNo };
    } catch (error) {
      console.error('Error creating inventory transaction:', error);
      throw error;
    }
  }

  async getInventoryTransactions(filters?: {
    itemId?: number;
    transactionType?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Array<any>> {
    try {
      const conditions = [];

      if (filters?.itemId) {
        conditions.push(eq(inventoryTransactions.itemId, filters.itemId));
      }
      if (filters?.transactionType) {
        conditions.push(eq(inventoryTransactions.transactionType, filters.transactionType));
      }
      if (filters?.fromDate) {
        conditions.push(gte(inventoryTransactions.transactionDate, filters.fromDate));
      }
      if (filters?.toDate) {
        conditions.push(lte(inventoryTransactions.transactionDate, filters.toDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(inventoryTransactions)
        .leftJoin(inventoryItems, eq(inventoryTransactions.itemId, inventoryItems.id))
        .leftJoin(users, eq(inventoryTransactions.createdBy, users.id))
        .where(whereClause)
        .orderBy(desc(inventoryTransactions.transactionDate), desc(inventoryTransactions.createdAt));

      return results.map((row) => ({
        id: row.inventory_transactions.id,
        transactionNo: row.inventory_transactions.transactionNo,
        transactionDate: row.inventory_transactions.transactionDate,
        transactionType: row.inventory_transactions.transactionType,
        quantity: row.inventory_transactions.quantity,
        unitCost: row.inventory_transactions.unitCost,
        totalValue: parseFloat(row.inventory_transactions.unitCost || '0') * (row.inventory_transactions.quantity || 0),
        reference: row.inventory_transactions.reference,
        requestedBy: row.inventory_transactions.requestedBy,
        remarks: row.inventory_transactions.remarks,
        item: row.inventory_items ? {
          id: row.inventory_items.id,
          itemCode: row.inventory_items.itemCode,
          itemName: row.inventory_items.itemName,
          unit: row.inventory_items.unit,
        } : null,
        createdBy: row.users ? {
          id: row.users.id,
          name: row.users.name,
        } : null,
        createdAt: row.inventory_transactions.createdAt,
      }));
    } catch (error) {
      console.error('Error getting inventory transactions:', error);
      throw error;
    }
  }

  async getInventoryTransactionById(id: number): Promise<any> {
    try {
      const results = await db
        .select()
        .from(inventoryTransactions)
        .leftJoin(inventoryItems, eq(inventoryTransactions.itemId, inventoryItems.id))
        .leftJoin(users, eq(inventoryTransactions.createdBy, users.id))
        .where(eq(inventoryTransactions.id, id))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        id: row.inventory_transactions.id,
        transactionNo: row.inventory_transactions.transactionNo,
        transactionDate: row.inventory_transactions.transactionDate,
        transactionType: row.inventory_transactions.transactionType,
        quantity: row.inventory_transactions.quantity,
        unitCost: row.inventory_transactions.unitCost,
        totalValue: parseFloat(row.inventory_transactions.unitCost || '0') * (row.inventory_transactions.quantity || 0),
        reference: row.inventory_transactions.reference,
        requestedBy: row.inventory_transactions.requestedBy,
        remarks: row.inventory_transactions.remarks,
        item: row.inventory_items ? {
          id: row.inventory_items.id,
          itemCode: row.inventory_items.itemCode,
          itemName: row.inventory_items.itemName,
          description: row.inventory_items.description,
          unit: row.inventory_items.unit,
          quantityOnHand: row.inventory_items.quantityOnHand,
        } : null,
        createdBy: row.users ? {
          id: row.users.id,
          name: row.users.name,
        } : null,
        createdAt: row.inventory_transactions.createdAt,
      };
    } catch (error) {
      console.error('Error getting inventory transaction by ID:', error);
      throw error;
    }
  }

  async deleteInventoryTransaction(id: number): Promise<void> {
    try {
      // Get transaction details
      const transaction = await this.getInventoryTransactionById(id);
      if (!transaction) {
        throw new Error('Transaction not found');
      }

      // Reverse the transaction effect on inventory
      if (transaction.transactionType === 'receipt') {
        await this.adjustInventoryQuantity(transaction.item.id, transaction.quantity, 'subtract');
      } else if (transaction.transactionType === 'issue') {
        await this.adjustInventoryQuantity(transaction.item.id, transaction.quantity, 'add');
      }

      // Delete the transaction
      await db.delete(inventoryTransactions).where(eq(inventoryTransactions.id, id));
    } catch (error) {
      console.error('Error deleting inventory transaction:', error);
      throw error;
    }
  }

  async getItemTransactionHistory(itemId: number, limit: number = 50): Promise<Array<any>> {
    try {
      return await this.getInventoryTransactions({ itemId });
    } catch (error) {
      console.error('Error getting item transaction history:', error);
      throw error;
    }
  }

  // ============================================
  // PHYSICAL INVENTORY COUNT MANAGEMENT
  // ============================================

  async createPhysicalCount(data: CreatePhysicalCountData, userId: number): Promise<{ id: number; countNo: string }> {
    try {
      // Generate count number
      const countNo = await generatePhysicalCountNumber();

      // Get item to get system quantity
      const item = await this.getInventoryItemById(data.itemId);
      if (!item) {
        throw new Error('Item not found');
      }

      const systemQuantity = data.systemQuantity || item.quantityOnHand;
      const physicalQuantity = data.physicalQuantity;
      const variance = physicalQuantity - systemQuantity;
      const varianceValue = variance * parseFloat(item.unitCost);

      const [result] = await db.insert(physicalInventoryCount).values({
        countNo,
        countDate: data.countDate,
        itemId: data.itemId,
        systemQuantity,
        physicalQuantity,
        variance,
        varianceValue: varianceValue.toString(),
        remarks: data.remarks,
        countedBy: data.countedBy,
        verifiedBy: data.verifiedBy,
        createdBy: userId,
      });

      const countId = Number(result.insertId);

      // If variance exists, create adjustment transaction
      if (variance !== 0) {
        await this.createInventoryTransaction(
          {
            itemId: data.itemId,
            transactionDate: data.countDate,
            transactionType: 'adjustment',
            quantity: physicalQuantity,
            reference: countNo,
            requestedBy: data.countedBy,
            remarks: `Physical count adjustment: ${variance > 0 ? '+' : ''}${variance} ${item.unit}`,
          },
          userId
        );
      }

      return { id: countId, countNo };
    } catch (error) {
      console.error('Error creating physical count:', error);
      throw error;
    }
  }

  async getPhysicalCounts(filters?: {
    itemId?: number;
    fromDate?: string;
    toDate?: string;
  }): Promise<Array<any>> {
    try {
      const conditions = [];

      if (filters?.itemId) {
        conditions.push(eq(physicalInventoryCount.itemId, filters.itemId));
      }
      if (filters?.fromDate) {
        conditions.push(gte(physicalInventoryCount.countDate, filters.fromDate));
      }
      if (filters?.toDate) {
        conditions.push(lte(physicalInventoryCount.countDate, filters.toDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db
        .select()
        .from(physicalInventoryCount)
        .leftJoin(inventoryItems, eq(physicalInventoryCount.itemId, inventoryItems.id))
        .leftJoin(users, eq(physicalInventoryCount.verifiedBy, users.id))
        .where(whereClause)
        .orderBy(desc(physicalInventoryCount.countDate));

      return results.map((row) => ({
        id: row.physical_inventory_count.id,
        countNo: row.physical_inventory_count.countNo,
        countDate: row.physical_inventory_count.countDate,
        systemQuantity: row.physical_inventory_count.systemQuantity,
        physicalQuantity: row.physical_inventory_count.physicalQuantity,
        variance: row.physical_inventory_count.variance,
        varianceValue: row.physical_inventory_count.varianceValue,
        remarks: row.physical_inventory_count.remarks,
        countedBy: row.physical_inventory_count.countedBy,
        item: row.inventory_items ? {
          id: row.inventory_items.id,
          itemCode: row.inventory_items.itemCode,
          itemName: row.inventory_items.itemName,
          unit: row.inventory_items.unit,
        } : null,
        verifiedBy: row.users ? {
          id: row.users.id,
          name: row.users.name,
        } : null,
        createdAt: row.physical_inventory_count.createdAt,
      }));
    } catch (error) {
      console.error('Error getting physical counts:', error);
      throw error;
    }
  }

  async getPhysicalCountById(id: number): Promise<any> {
    try {
      const results = await db
        .select()
        .from(physicalInventoryCount)
        .leftJoin(inventoryItems, eq(physicalInventoryCount.itemId, inventoryItems.id))
        .leftJoin(users, eq(physicalInventoryCount.verifiedBy, users.id))
        .where(eq(physicalInventoryCount.id, id))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        id: row.physical_inventory_count.id,
        countNo: row.physical_inventory_count.countNo,
        countDate: row.physical_inventory_count.countDate,
        systemQuantity: row.physical_inventory_count.systemQuantity,
        physicalQuantity: row.physical_inventory_count.physicalQuantity,
        variance: row.physical_inventory_count.variance,
        varianceValue: row.physical_inventory_count.varianceValue,
        remarks: row.physical_inventory_count.remarks,
        countedBy: row.physical_inventory_count.countedBy,
        item: row.inventory_items ? {
          id: row.inventory_items.id,
          itemCode: row.inventory_items.itemCode,
          itemName: row.inventory_items.itemName,
          description: row.inventory_items.description,
          unit: row.inventory_items.unit,
          unitCost: row.inventory_items.unitCost,
          quantityOnHand: row.inventory_items.quantityOnHand,
        } : null,
        verifiedBy: row.users ? {
          id: row.users.id,
          name: row.users.name,
        } : null,
        createdAt: row.physical_inventory_count.createdAt,
      };
    } catch (error) {
      console.error('Error getting physical count by ID:', error);
      throw error;
    }
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const assetService = new AssetService();
