/**
 * File Handler Utility
 * Handles file upload, validation, storage, and deletion
 */

import { randomUUID } from 'crypto';
import { writeFile, unlink, stat, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

// File upload configuration
export const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB in bytes
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  ],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.xlsx', '.docx'],
  uploadBaseDir: 'public/uploads',
  categories: ['disbursements', 'travel', 'assets', 'payroll', 'temp'] as const,
};

export type UploadCategory = typeof UPLOAD_CONFIG.categories[number];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export interface UploadedFileInfo {
  fileName: string;
  fileOriginalName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  fileExtension: string;
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): FileValidationResult {
  // Check file size
  if (file.size > UPLOAD_CONFIG.maxFileSize) {
    const maxSizeMB = UPLOAD_CONFIG.maxFileSize / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${maxSizeMB}MB`,
    };
  }

  // Check file type
  if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: PDF, JPEG, PNG, XLSX, DOCX`,
    };
  }

  // Check file extension
  const extension = path.extname(file.name).toLowerCase();
  if (!UPLOAD_CONFIG.allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension ${extension} is not allowed`,
    };
  }

  return { valid: true };
}

/**
 * Generate unique filename with UUID
 */
export function generateUniqueFilename(originalName: string): string {
  const extension = path.extname(originalName).toLowerCase();
  const uuid = randomUUID();
  return `${uuid}${extension}`;
}

/**
 * Ensure directory exists, create if it doesn't
 */
async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
}

/**
 * Save file to disk
 */
export async function saveFile(
  file: File,
  category: UploadCategory
): Promise<UploadedFileInfo> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Generate unique filename
  const fileName = generateUniqueFilename(file.name);
  const categoryDir = path.join(UPLOAD_CONFIG.uploadBaseDir, category);

  // Ensure directory exists
  await ensureDirectoryExists(categoryDir);

  // Full file path
  const filePath = path.join(category, fileName);
  const fullPath = path.join(UPLOAD_CONFIG.uploadBaseDir, category, fileName);

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Write file to disk
  await writeFile(fullPath, buffer);

  return {
    fileName,
    fileOriginalName: file.name,
    filePath,
    fileSize: file.size,
    fileType: file.type,
    fileExtension: path.extname(file.name).toLowerCase(),
  };
}

/**
 * Delete file from disk
 */
export async function deleteFile(filePath: string): Promise<void> {
  const fullPath = path.join(UPLOAD_CONFIG.uploadBaseDir, filePath);

  if (existsSync(fullPath)) {
    await unlink(fullPath);
  }
}

/**
 * Get file information
 */
export async function getFileInfo(filePath: string): Promise<{
  exists: boolean;
  size?: number;
  path: string;
}> {
  const fullPath = path.join(UPLOAD_CONFIG.uploadBaseDir, filePath);

  if (!existsSync(fullPath)) {
    return {
      exists: false,
      path: fullPath,
    };
  }

  const stats = await stat(fullPath);

  return {
    exists: true,
    size: stats.size,
    path: fullPath,
  };
}

/**
 * Get file full path for serving/download
 */
export function getFileFullPath(filePath: string): string {
  return path.join(UPLOAD_CONFIG.uploadBaseDir, filePath);
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and other dangerous characters
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
