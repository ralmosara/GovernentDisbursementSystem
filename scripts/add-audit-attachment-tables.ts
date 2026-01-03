/**
 * Add Attachments and Audit Logs Tables
 * Creates tables for document management and audit trail
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_HOST = process.env.DATABASE_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DATABASE_PORT || '3306');
const DB_USER = process.env.DATABASE_USER || 'root';
const DB_PASSWORD = process.env.DATABASE_PASSWORD || '';
const DB_NAME = process.env.DATABASE_NAME || 'government_fms';

async function addAuditAttachmentTables() {
  console.log('Adding Attachments and Audit Logs Tables\n');

  let connection;

  try {
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    console.log('[OK] Connected to database\n');

    // Create attachments table
    console.log('[1/2] Creating attachments table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        attachable_type VARCHAR(50) NOT NULL COMMENT 'DisbursementVoucher, Travel, Asset, etc.',
        attachable_id INT NOT NULL COMMENT 'ID of the related record',
        file_name VARCHAR(255) NOT NULL COMMENT 'Stored filename (UUID + extension)',
        file_original_name VARCHAR(255) NOT NULL COMMENT 'Original uploaded filename',
        file_path VARCHAR(500) NOT NULL COMMENT 'Relative path from uploads directory',
        file_size INT NOT NULL COMMENT 'File size in bytes',
        file_type VARCHAR(100) NOT NULL COMMENT 'MIME type',
        file_extension VARCHAR(10) COMMENT 'File extension (.pdf, .jpg, etc.)',
        document_type VARCHAR(100) COMMENT 'Invoice, Receipt, Travel Order, etc.',
        description TEXT COMMENT 'User description of the file',
        uploaded_by INT NOT NULL,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_attachable (attachable_type, attachable_id),
        INDEX idx_uploaded_by (uploaded_by),
        INDEX idx_uploaded_at (uploaded_at),
        INDEX idx_document_type (document_type),
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='File attachments for various records'
    `);
    console.log('[OK] attachments table created\n');

    // Create audit_logs table
    console.log('[2/2] Creating audit_logs table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT COMMENT 'User who performed the action (NULL for system actions)',
        action VARCHAR(100) NOT NULL COMMENT 'CREATE, UPDATE, DELETE, APPROVE, REJECT, etc.',
        table_name VARCHAR(100) NOT NULL COMMENT 'Table affected',
        record_id INT NOT NULL COMMENT 'ID of affected record',
        old_values JSON COMMENT 'Previous state of the record',
        new_values JSON COMMENT 'New state of the record',
        ip_address VARCHAR(45) COMMENT 'IPv4 or IPv6 address',
        user_agent TEXT COMMENT 'Browser user agent string',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user (user_id),
        INDEX idx_table_record (table_name, record_id),
        INDEX idx_action (action),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Complete audit trail for all transactions - 10 year retention per COA'
    `);
    console.log('[OK] audit_logs table created\n');

    await connection.end();

    console.log('[SUCCESS] Attachments and audit logs tables created successfully!\n');
    console.log('Tables created:');
    console.log('  - attachments (for file upload management)');
    console.log('  - audit_logs (for comprehensive audit trail)\n');

    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Failed to create tables:', error);
    if (connection) await connection.end();
    process.exit(1);
  }
}

addAuditAttachmentTables();
