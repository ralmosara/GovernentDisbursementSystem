import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateFile, generateUniqueFilename, getMimeType, formatFileSize } from '../../src/lib/utils/file-handler';
import { UPLOAD_CONFIG } from '../../src/lib/utils/file-handler';

describe('File Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('File Validation', () => {
    it('should accept valid PDF file', () => {
      const mockFile = {
        name: 'document.pdf',
        size: 5 * 1024 * 1024, // 5MB
        type: 'application/pdf',
      } as File;

      const result = validateFile(mockFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept valid image files', () => {
      const jpegFile = {
        name: 'photo.jpg',
        size: 2 * 1024 * 1024,
        type: 'image/jpeg',
      } as File;

      const pngFile = {
        name: 'screenshot.png',
        size: 3 * 1024 * 1024,
        type: 'image/png',
      } as File;

      expect(validateFile(jpegFile).valid).toBe(true);
      expect(validateFile(pngFile).valid).toBe(true);
    });

    it('should accept valid document files', () => {
      const xlsxFile = {
        name: 'spreadsheet.xlsx',
        size: 4 * 1024 * 1024,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      } as File;

      const docxFile = {
        name: 'report.docx',
        size: 2 * 1024 * 1024,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      } as File;

      expect(validateFile(xlsxFile).valid).toBe(true);
      expect(validateFile(docxFile).valid).toBe(true);
    });

    it('should reject file exceeding 10MB limit', () => {
      const largeFile = {
        name: 'large-file.pdf',
        size: 15 * 1024 * 1024, // 15MB
        type: 'application/pdf',
      } as File;

      const result = validateFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('10MB');
    });

    it('should reject invalid file type', () => {
      const invalidFile = {
        name: 'script.js',
        size: 1 * 1024 * 1024,
        type: 'application/javascript',
      } as File;

      const result = validateFile(invalidFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('file type');
    });

    it('should reject executable files', () => {
      const exeFile = {
        name: 'program.exe',
        size: 1 * 1024 * 1024,
        type: 'application/x-msdownload',
      } as File;

      const result = validateFile(exeFile);

      expect(result.valid).toBe(false);
    });

    it('should handle file with no extension', () => {
      const noExtFile = {
        name: 'document',
        size: 1 * 1024 * 1024,
        type: 'application/pdf',
      } as File;

      // Should validate based on MIME type, not extension
      const result = validateFile(noExtFile);
      expect(result.valid).toBe(true);
    });
  });

  describe('Unique Filename Generation', () => {
    it('should generate unique filename with original extension', () => {
      const filename1 = generateUniqueFilename('document.pdf');
      const filename2 = generateUniqueFilename('document.pdf');

      // Both should end with .pdf
      expect(filename1.endsWith('.pdf')).toBe(true);
      expect(filename2.endsWith('.pdf')).toBe(true);

      // Should be different (UUID-based)
      expect(filename1).not.toBe(filename2);
    });

    it('should preserve file extension case', () => {
      const filenameUpper = generateUniqueFilename('FILE.PDF');
      const filenameLower = generateUniqueFilename('file.pdf');

      expect(filenameUpper.endsWith('.pdf')).toBe(true);
      expect(filenameLower.endsWith('.pdf')).toBe(true);
    });

    it('should handle files with multiple dots', () => {
      const filename = generateUniqueFilename('my.document.final.pdf');

      expect(filename.endsWith('.pdf')).toBe(true);
    });

    it('should use UUID format', () => {
      const filename = generateUniqueFilename('test.pdf');
      const baseName = filename.replace('.pdf', '');

      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(baseName).toMatch(uuidPattern);
    });

    it('should handle files with no extension', () => {
      const filename = generateUniqueFilename('document');

      // Should still work, might have empty extension
      expect(filename).toBeDefined();
      expect(filename.length).toBeGreaterThan(0);
    });
  });

  describe('MIME Type Detection', () => {
    it('should return correct MIME type for PDF', () => {
      expect(getMimeType('.pdf')).toBe('application/pdf');
      expect(getMimeType('pdf')).toBe('application/pdf');
    });

    it('should return correct MIME type for images', () => {
      expect(getMimeType('.jpg')).toBe('image/jpeg');
      expect(getMimeType('.jpeg')).toBe('image/jpeg');
      expect(getMimeType('.png')).toBe('image/png');
    });

    it('should return correct MIME type for Office documents', () => {
      expect(getMimeType('.xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(getMimeType('.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should handle uppercase extensions', () => {
      expect(getMimeType('.PDF')).toBe('application/pdf');
      expect(getMimeType('.JPEG')).toBe('image/jpeg');
    });

    it('should return default MIME type for unknown extensions', () => {
      const mimeType = getMimeType('.unknown');
      expect(mimeType).toBe('application/octet-stream');
    });
  });

  describe('File Size Formatting', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(500)).toBe('500 B');
      expect(formatFileSize(1000)).toBe('1000 B');
    });

    it('should format kilobytes correctly', () => {
      expect(formatFileSize(1024)).toBe('1.00 KB');
      expect(formatFileSize(5 * 1024)).toBe('5.00 KB');
      expect(formatFileSize(1536)).toBe('1.50 KB');
    });

    it('should format megabytes correctly', () => {
      expect(formatFileSize(1024 * 1024)).toBe('1.00 MB');
      expect(formatFileSize(5 * 1024 * 1024)).toBe('5.00 MB');
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe('1.50 MB');
    });

    it('should format gigabytes correctly', () => {
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1.00 GB');
      expect(formatFileSize(2.5 * 1024 * 1024 * 1024)).toBe('2.50 GB');
    });

    it('should handle zero bytes', () => {
      expect(formatFileSize(0)).toBe('0 B');
    });

    it('should round to 2 decimal places', () => {
      expect(formatFileSize(1234567)).toBe('1.18 MB');
    });
  });

  describe('Upload Configuration', () => {
    it('should have correct max file size', () => {
      expect(UPLOAD_CONFIG.maxFileSize).toBe(10 * 1024 * 1024); // 10MB
    });

    it('should have all required MIME types', () => {
      const requiredTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      requiredTypes.forEach(type => {
        expect(UPLOAD_CONFIG.allowedMimeTypes).toContain(type);
      });
    });

    it('should have correct upload directory structure', () => {
      expect(UPLOAD_CONFIG.uploadBaseDir).toBeDefined();
      expect(UPLOAD_CONFIG.uploadBaseDir).toContain('public');
    });
  });

  describe('Security Validations', () => {
    it('should reject files with dangerous extensions', () => {
      const dangerousFiles = [
        { name: 'virus.exe', type: 'application/x-msdownload' },
        { name: 'script.sh', type: 'application/x-sh' },
        { name: 'malware.bat', type: 'application/x-bat' },
        { name: 'hack.php', type: 'application/x-httpd-php' },
      ];

      dangerousFiles.forEach(file => {
        const mockFile = { ...file, size: 1024 } as File;
        const result = validateFile(mockFile);
        expect(result.valid).toBe(false);
      });
    });

    it('should prevent path traversal in filenames', () => {
      const maliciousNames = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config',
        'test/../../../secret.txt',
      ];

      maliciousNames.forEach(name => {
        const filename = generateUniqueFilename(name);
        // Should not contain path traversal patterns
        expect(filename).not.toContain('..');
        expect(filename).not.toContain('/');
        expect(filename).not.toContain('\\');
      });
    });

    it('should sanitize special characters in filenames', () => {
      const specialChars = 'file<>:|"?*.pdf';
      const filename = generateUniqueFilename(specialChars);

      // Should only contain alphanumeric, dash, and extension
      expect(filename).toMatch(/^[a-f0-9-]+\.pdf$/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large file names', () => {
      const longName = 'a'.repeat(500) + '.pdf';
      const filename = generateUniqueFilename(longName);

      // UUID + extension should be reasonable length
      expect(filename.length).toBeLessThan(100);
    });

    it('should handle empty file name', () => {
      const filename = generateUniqueFilename('');

      expect(filename).toBeDefined();
      expect(filename.length).toBeGreaterThan(0);
    });

    it('should handle file size at exact limit', () => {
      const fileAtLimit = {
        name: 'file.pdf',
        size: 10 * 1024 * 1024, // Exactly 10MB
        type: 'application/pdf',
      } as File;

      const result = validateFile(fileAtLimit);
      expect(result.valid).toBe(true);
    });

    it('should handle file size one byte over limit', () => {
      const fileOverLimit = {
        name: 'file.pdf',
        size: (10 * 1024 * 1024) + 1, // 10MB + 1 byte
        type: 'application/pdf',
      } as File;

      const result = validateFile(fileOverLimit);
      expect(result.valid).toBe(false);
    });
  });
});
