/**
 * Attachment Service
 * Handles file attachment database operations
 */

import { db } from '../db/connection';
import { attachments } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { saveFile, deleteFile, type UploadCategory } from '../utils/file-handler';

export interface CreateAttachmentData {
  attachableType: string;
  attachableId: number;
  file: File;
  documentType?: string;
  description?: string;
}

export interface Attachment {
  id: number;
  attachableType: string;
  attachableId: number;
  fileName: string;
  fileOriginalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  fileExtension: string | null;
  documentType: string | null;
  description: string | null;
  uploadedBy: number;
  uploadedAt: Date;
}

/**
 * Create a new attachment
 */
export async function createAttachment(
  data: CreateAttachmentData,
  uploadedBy: number
): Promise<Attachment> {
  // Determine category from attachable type
  const categoryMap: Record<string, UploadCategory> = {
    DisbursementVoucher: 'disbursements',
    Travel: 'travel',
    ItineraryOfTravel: 'travel',
    LiquidationReport: 'travel',
    Asset: 'assets',
    FixedAsset: 'assets',
    PayrollPeriod: 'payroll',
    Employee: 'payroll',
  };

  const category = categoryMap[data.attachableType] || 'temp';

  // Save file to disk
  const fileInfo = await saveFile(data.file, category);

  // Insert into database
  const [newAttachment] = await db.insert(attachments).values({
    attachableType: data.attachableType,
    attachableId: data.attachableId,
    fileName: fileInfo.fileName,
    fileOriginalName: fileInfo.fileOriginalName,
    filePath: fileInfo.filePath,
    fileSize: fileInfo.fileSize,
    fileType: fileInfo.fileType,
    fileExtension: fileInfo.fileExtension,
    documentType: data.documentType || null,
    description: data.description || null,
    uploadedBy,
  });

  // Return the created attachment
  const created = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, Number(newAttachment.insertId)))
    .limit(1);

  return created[0] as Attachment;
}

/**
 * Get all attachments for a specific record
 */
export async function getAttachments(
  attachableType: string,
  attachableId: number
): Promise<Attachment[]> {
  const results = await db
    .select()
    .from(attachments)
    .where(
      and(
        eq(attachments.attachableType, attachableType),
        eq(attachments.attachableId, attachableId)
      )
    )
    .orderBy(desc(attachments.uploadedAt));

  return results as Attachment[];
}

/**
 * Get a single attachment by ID
 */
export async function getAttachmentById(id: number): Promise<Attachment | null> {
  const results = await db
    .select()
    .from(attachments)
    .where(eq(attachments.id, id))
    .limit(1);

  return results.length > 0 ? (results[0] as Attachment) : null;
}

/**
 * Delete an attachment
 */
export async function deleteAttachment(id: number): Promise<void> {
  // Get attachment info first
  const attachment = await getAttachmentById(id);

  if (!attachment) {
    throw new Error('Attachment not found');
  }

  // Delete file from disk
  await deleteFile(attachment.filePath);

  // Delete from database
  await db.delete(attachments).where(eq(attachments.id, id));
}

/**
 * Get attachment download info
 */
export async function getAttachmentDownloadInfo(id: number): Promise<{
  filePath: string;
  originalName: string;
  mimeType: string;
} | null> {
  const attachment = await getAttachmentById(id);

  if (!attachment) {
    return null;
  }

  return {
    filePath: attachment.filePath,
    originalName: attachment.fileOriginalName,
    mimeType: attachment.fileType,
  };
}

/**
 * Get all attachments with filters
 */
export async function getAllAttachments(filters?: {
  attachableType?: string;
  documentType?: string;
  uploadedBy?: number;
  startDate?: Date;
  endDate?: Date;
}): Promise<Attachment[]> {
  let query = db.select().from(attachments);

  // Apply filters (simplified - in production use drizzle's where conditions)
  let results = await query.orderBy(desc(attachments.uploadedAt));

  // Filter in memory (for simplicity - in production, use SQL WHERE clauses)
  if (filters) {
    if (filters.attachableType) {
      results = results.filter(a => a.attachableType === filters.attachableType);
    }
    if (filters.documentType) {
      results = results.filter(a => a.documentType === filters.documentType);
    }
    if (filters.uploadedBy) {
      results = results.filter(a => a.uploadedBy === filters.uploadedBy);
    }
    if (filters.startDate) {
      results = results.filter(a => new Date(a.uploadedAt) >= filters.startDate!);
    }
    if (filters.endDate) {
      results = results.filter(a => new Date(a.uploadedAt) <= filters.endDate!);
    }
  }

  return results as Attachment[];
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  byType: Record<string, { count: number; size: number }>;
}> {
  const allAttachments = await db.select().from(attachments);

  const stats = {
    totalFiles: allAttachments.length,
    totalSize: allAttachments.reduce((sum, a) => sum + a.fileSize, 0),
    byType: {} as Record<string, { count: number; size: number }>,
  };

  // Group by attachable type
  allAttachments.forEach(attachment => {
    const type = attachment.attachableType;
    if (!stats.byType[type]) {
      stats.byType[type] = { count: 0, size: 0 };
    }
    stats.byType[type].count++;
    stats.byType[type].size += attachment.fileSize;
  });

  return stats;
}

export const attachmentService = {
  createAttachment,
  getAttachments,
  getAttachmentById,
  deleteAttachment,
  getAttachmentDownloadInfo,
  getAllAttachments,
  getStorageStats,
};
