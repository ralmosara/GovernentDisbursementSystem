# Backup and Recovery Procedures

**Version:** 1.0
**Date:** January 3, 2026
**Classification:** CRITICAL

---

## Table of Contents

1. [Overview](#overview)
2. [Backup Strategy](#backup-strategy)
3. [Automated Backup Setup](#automated-backup-setup)
4. [Manual Backup Procedures](#manual-backup-procedures)
5. [Recovery Procedures](#recovery-procedures)
6. [Disaster Recovery Plan](#disaster-recovery-plan)
7. [Data Retention Policy](#data-retention-policy)
8. [Testing and Verification](#testing-and-verification)

---

## Overview

### Importance of Backups

Regular backups are essential for:
- **Data Protection:** Prevent data loss from hardware failure, software bugs, or human error
- **Disaster Recovery:** Restore operations after catastrophic events
- **Compliance:** Meet government data retention requirements
- **Audit Trail:** Maintain historical records as required by COA

### Backup Scope

The following data must be backed up:

1. **Database** (Most Critical)
   - All tables and data
   - User accounts and permissions
   - System configuration

2. **Application Files**
   - Uploaded documents (invoices, receipts, etc.)
   - User-uploaded attachments
   - System logs

3. **Configuration Files**
   - Environment variables (.env)
   - Web server configuration
   - SSL certificates

---

## Backup Strategy

### Backup Types

**1. Full Backup**
- Complete copy of all data
- Performed: Weekly (Sunday 2:00 AM)
- Retention: 4 weeks

**2. Incremental Backup**
- Only changes since last backup
- Performed: Daily (2:00 AM)
- Retention: 7 days

**3. Transaction Log Backup**
- MySQL binary logs
- Performed: Every 6 hours
- Retention: 24 hours

### 3-2-1 Backup Rule

✅ **3 Copies:** Production + 2 backups
✅ **2 Different Media:** Local disk + Cloud storage
✅ **1 Offsite:** Cloud backup or remote server

### Backup Schedule

| Type | Frequency | Time | Retention |
|------|-----------|------|-----------|
| Full Database | Weekly | Sunday 2:00 AM | 4 weeks |
| Incremental Database | Daily | 2:00 AM | 7 days |
| Transaction Logs | Every 6 hours | 02:00, 08:00, 14:00, 20:00 | 24 hours |
| Uploaded Files | Daily | 3:00 AM | 30 days |
| Configuration | Weekly | Sunday 3:00 AM | 4 weeks |
| System State | Monthly | 1st Sunday 4:00 AM | 3 months |

---

## Automated Backup Setup

### Step 1: Create Backup Directory Structure

```bash
# Create backup directories
sudo mkdir -p /backup/gds/{database,files,config,logs}
sudo chown -R gds:gds /backup/gds
sudo chmod 700 /backup/gds

# Create backup subdirectories by type
sudo mkdir -p /backup/gds/database/{full,incremental,transaction}
sudo mkdir -p /backup/gds/files/{daily,weekly}
sudo mkdir -p /backup/gds/config/weekly
```

### Step 2: Database Backup Script

Create backup script:

```bash
sudo nano /usr/local/bin/gds-backup-db.sh
```

```bash
#!/bin/bash
#
# GDS Database Backup Script
# Performs full or incremental MySQL backup
#

set -e

# Configuration
DB_NAME="gds_production"
DB_USER="gds_backup_user"
DB_PASS="your_backup_user_password"
BACKUP_DIR="/backup/gds/database"
RETENTION_DAYS=30
LOG_FILE="/var/log/gds-backup.log"

# Determine backup type (full or incremental)
BACKUP_TYPE=${1:-incremental}

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)  # 1-7 (Monday-Sunday)

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to send notification (email)
send_notification() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" admin@agency.gov.ph
}

log_message "Starting $BACKUP_TYPE database backup..."

# Perform full backup on Sundays (day 7)
if [ "$DAY_OF_WEEK" -eq 7 ] || [ "$BACKUP_TYPE" = "full" ]; then
    BACKUP_TYPE="full"
    BACKUP_FILE="$BACKUP_DIR/full/gds_full_${TIMESTAMP}.sql.gz"

    log_message "Performing FULL backup..."

    # Full backup with mysqldump
    mysqldump --user="$DB_USER" --password="$DB_PASS" \
        --single-transaction \
        --routines \
        --triggers \
        --events \
        "$DB_NAME" | gzip > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_message "Full backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"
        send_notification "GDS Backup Success" "Full database backup completed: $BACKUP_SIZE"
    else
        log_message "ERROR: Full backup failed!"
        send_notification "GDS Backup FAILED" "Full database backup failed. Check logs immediately."
        exit 1
    fi
else
    # Incremental backup (daily)
    BACKUP_FILE="$BACKUP_DIR/incremental/gds_incremental_${TIMESTAMP}.sql.gz"

    log_message "Performing INCREMENTAL backup..."

    # Incremental backup (last 24 hours of changes)
    mysqldump --user="$DB_USER" --password="$DB_PASS" \
        --single-transaction \
        --where="updatedAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR) OR createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)" \
        "$DB_NAME" | gzip > "$BACKUP_FILE"

    if [ $? -eq 0 ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_message "Incremental backup completed successfully: $BACKUP_FILE ($BACKUP_SIZE)"
    else
        log_message "ERROR: Incremental backup failed!"
        send_notification "GDS Backup FAILED" "Incremental backup failed. Check logs."
        exit 1
    fi
fi

# Cleanup old backups
log_message "Cleaning up old backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR/full" -name "gds_full_*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/incremental" -name "gds_incremental_*.sql.gz" -mtime +7 -delete

log_message "Backup process completed."
```

Make script executable:

```bash
sudo chmod +x /usr/local/bin/gds-backup-db.sh
```

### Step 3: Create Dedicated Backup User

```bash
# Login to MySQL
sudo mysql -u root -p
```

```sql
-- Create backup user with minimal required permissions
CREATE USER 'gds_backup_user'@'localhost' IDENTIFIED BY 'secure_backup_password_here';

-- Grant only necessary privileges
GRANT SELECT, LOCK TABLES, SHOW VIEW, EVENT, TRIGGER ON gds_production.* TO 'gds_backup_user'@'localhost';

FLUSH PRIVILEGES;
EXIT;
```

### Step 4: File Backup Script

Create file backup script:

```bash
sudo nano /usr/local/bin/gds-backup-files.sh
```

```bash
#!/bin/bash
#
# GDS File Backup Script
# Backs up uploaded documents and attachments
#

set -e

# Configuration
SOURCE_DIR="/var/www/gds/uploads"
BACKUP_DIR="/backup/gds/files/daily"
RETENTION_DAYS=30
LOG_FILE="/var/log/gds-backup.log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "Starting file backup..."

# Create backup filename
BACKUP_FILE="$BACKUP_DIR/gds_files_${TIMESTAMP}.tar.gz"

# Create compressed archive
tar -czf "$BACKUP_FILE" -C "$(dirname $SOURCE_DIR)" "$(basename $SOURCE_DIR)"

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    FILE_COUNT=$(tar -tzf "$BACKUP_FILE" | wc -l)
    log_message "File backup completed: $BACKUP_FILE ($BACKUP_SIZE, $FILE_COUNT files)"
else
    log_message "ERROR: File backup failed!"
    exit 1
fi

# Cleanup old backups
log_message "Cleaning up old file backups (retention: $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "gds_files_*.tar.gz" -mtime +$RETENTION_DAYS -delete

log_message "File backup completed."
```

Make script executable:

```bash
sudo chmod +x /usr/local/bin/gds-backup-files.sh
```

### Step 5: Configuration Backup Script

```bash
sudo nano /usr/local/bin/gds-backup-config.sh
```

```bash
#!/bin/bash
#
# GDS Configuration Backup Script
#

set -e

BACKUP_DIR="/backup/gds/config/weekly"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/gds_config_${TIMESTAMP}.tar.gz"
LOG_FILE="/var/log/gds-backup.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "Starting configuration backup..."

# Backup configuration files
tar -czf "$BACKUP_FILE" \
    /var/www/gds/.env \
    /etc/nginx/sites-available/gds \
    /etc/letsencrypt/live/ \
    /var/www/gds/ecosystem.config.js

if [ $? -eq 0 ]; then
    log_message "Configuration backup completed: $BACKUP_FILE"
else
    log_message "ERROR: Configuration backup failed!"
    exit 1
fi

# Cleanup old backups (keep 4 weeks)
find "$BACKUP_DIR" -name "gds_config_*.tar.gz" -mtime +28 -delete

log_message "Configuration backup completed."
```

Make executable:

```bash
sudo chmod +x /usr/local/bin/gds-backup-config.sh
```

### Step 6: Setup Cron Jobs

```bash
# Edit crontab for root
sudo crontab -e
```

Add the following cron jobs:

```cron
# GDS Backup Schedule

# Database backups (auto-detects full vs incremental based on day)
0 2 * * * /usr/local/bin/gds-backup-db.sh >> /var/log/gds-backup.log 2>&1

# File backups (daily at 3 AM)
0 3 * * * /usr/local/bin/gds-backup-files.sh >> /var/log/gds-backup.log 2>&1

# Configuration backups (weekly on Sunday at 3 AM)
0 3 * * 0 /usr/local/bin/gds-backup-config.sh >> /var/log/gds-backup.log 2>&1

# MySQL binary log rotation (every 6 hours)
0 */6 * * * /usr/bin/mysqladmin -u root flush-logs >> /var/log/gds-backup.log 2>&1

# Cleanup old logs (keep 30 days)
0 4 * * * find /var/log/gds*.log -mtime +30 -delete
```

### Step 7: Cloud Backup Sync (Optional but Recommended)

Install and configure rclone for cloud storage:

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure cloud storage (follow interactive prompts)
rclone config

# Create sync script
sudo nano /usr/local/bin/gds-sync-cloud.sh
```

```bash
#!/bin/bash
#
# Sync backups to cloud storage
#

BACKUP_DIR="/backup/gds"
CLOUD_REMOTE="gdrive:GDS_Backups"  # Configure in rclone
LOG_FILE="/var/log/gds-backup.log"

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_message "Starting cloud sync..."

# Sync to cloud storage
rclone sync "$BACKUP_DIR" "$CLOUD_REMOTE" \
    --log-file="$LOG_FILE" \
    --log-level INFO

if [ $? -eq 0 ]; then
    log_message "Cloud sync completed successfully"
else
    log_message "ERROR: Cloud sync failed!"
    exit 1
fi
```

Make executable and add to cron:

```bash
sudo chmod +x /usr/local/bin/gds-sync-cloud.sh

# Add to crontab (daily at 5 AM, after all backups complete)
sudo crontab -e
# Add: 0 5 * * * /usr/local/bin/gds-sync-cloud.sh
```

---

## Manual Backup Procedures

### Manual Database Backup

```bash
# Full database backup
mysqldump -u gds_backup_user -p \
    --single-transaction \
    --routines --triggers --events \
    gds_production > gds_manual_$(date +%Y%m%d_%H%M%S).sql

# Compress the backup
gzip gds_manual_*.sql

# Verify backup
gunzip -c gds_manual_*.sql.gz | head -n 20
```

### Manual File Backup

```bash
# Backup uploads directory
tar -czf gds_files_manual_$(date +%Y%m%d_%H%M%S).tar.gz \
    -C /var/www/gds uploads

# Verify archive
tar -tzf gds_files_manual_*.tar.gz | head -n 20
```

### Before Major Updates

**Pre-Update Backup Checklist:**

```bash
# 1. Create snapshot directory
SNAPSHOT_DIR="/backup/gds/snapshots/pre_update_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$SNAPSHOT_DIR"

# 2. Backup database
mysqldump -u gds_backup_user -p gds_production | \
    gzip > "$SNAPSHOT_DIR/database.sql.gz"

# 3. Backup application files
tar -czf "$SNAPSHOT_DIR/application.tar.gz" \
    -C /var/www gds

# 4. Backup web server config
cp /etc/nginx/sites-available/gds "$SNAPSHOT_DIR/nginx.conf"

# 5. Document current versions
pm2 list > "$SNAPSHOT_DIR/pm2_status.txt"
node --version > "$SNAPSHOT_DIR/versions.txt"
npm list --depth=0 >> "$SNAPSHOT_DIR/versions.txt"

# 6. Verify backups
ls -lh "$SNAPSHOT_DIR"
```

---

## Recovery Procedures

### Database Recovery

**Full Database Restore:**

```bash
# 1. Stop the application
pm2 stop gds

# 2. Login to MySQL
mysql -u root -p

# 3. Drop and recreate database
DROP DATABASE IF EXISTS gds_production;
CREATE DATABASE gds_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 4. Exit MySQL
EXIT;

# 5. Restore from backup
gunzip < /backup/gds/database/full/gds_full_YYYYMMDD_HHMMSS.sql.gz | \
    mysql -u root -p gds_production

# 6. Verify restoration
mysql -u root -p gds_production -e "SHOW TABLES;"

# 7. Restart application
pm2 start gds
```

**Point-in-Time Recovery:**

```bash
# 1. Restore latest full backup (as above)

# 2. Apply incremental backups in order
for backup in /backup/gds/database/incremental/gds_incremental_*.sql.gz; do
    echo "Applying $backup..."
    gunzip < "$backup" | mysql -u root -p gds_production
done

# 3. Apply transaction logs if needed
# (MySQL binary logs from /var/lib/mysql/)

# 4. Verify and restart
pm2 restart gds
```

### File Recovery

**Restore Uploaded Files:**

```bash
# 1. Stop application
pm2 stop gds

# 2. Backup current files (if any)
mv /var/www/gds/uploads /var/www/gds/uploads.old

# 3. Extract backup
tar -xzf /backup/gds/files/daily/gds_files_YYYYMMDD_HHMMSS.tar.gz \
    -C /var/www/gds

# 4. Set permissions
sudo chown -R gds:www-data /var/www/gds/uploads
sudo chmod 755 /var/www/gds/uploads

# 5. Restart application
pm2 start gds
```

### Single File Recovery

```bash
# List files in backup
tar -tzf /backup/gds/files/daily/gds_files_YYYYMMDD_HHMMSS.tar.gz | grep "filename"

# Extract specific file
tar -xzf /backup/gds/files/daily/gds_files_YYYYMMDD_HHMMSS.tar.gz \
    --strip-components=1 \
    uploads/2026/01/specific_file.pdf

# Move to correct location
mv specific_file.pdf /var/www/gds/uploads/2026/01/
```

---

## Disaster Recovery Plan

### Recovery Time Objectives (RTO)

| Scenario | Target RTO | Max Acceptable |
|----------|-----------|----------------|
| Database corruption | 2 hours | 4 hours |
| Server failure | 4 hours | 8 hours |
| Data center failure | 24 hours | 48 hours |
| Ransomware attack | 8 hours | 24 hours |

### Recovery Point Objectives (RPO)

| Data Type | Target RPO | Max Data Loss |
|-----------|-----------|---------------|
| Database transactions | 6 hours | 24 hours |
| Uploaded files | 24 hours | 48 hours |
| Configuration | 7 days | 14 days |

### Disaster Scenarios and Recovery Steps

**Scenario 1: Database Corruption**

```
1. Identify corruption (15 min)
   - Check error logs
   - Attempt to start database

2. Assess damage (15 min)
   - Determine affected tables
   - Check backup availability

3. Restore database (60 min)
   - Follow Database Recovery procedure
   - Verify data integrity

4. Restart services (15 min)
   - Start database
   - Start application

5. Verify operations (15 min)
   - Test login
   - Test critical functions

Total: ~2 hours
```

**Scenario 2: Complete Server Failure**

```
1. Provision new server (60 min)
   - Deploy new VM or physical server
   - Install OS and base packages

2. Install application stack (60 min)
   - Follow DEPLOYMENT-GUIDE.md
   - Install Node.js, MySQL, Nginx

3. Restore backups (90 min)
   - Restore database
   - Restore application files
   - Restore configuration

4. Configure and test (30 min)
   - Update DNS if needed
   - Configure SSL
   - Test all functions

Total: ~4 hours
```

**Scenario 3: Ransomware Attack**

```
1. Immediate response (30 min)
   - Disconnect from network
   - Identify infection source
   - Document affected systems

2. Assess damage (60 min)
   - Determine encryption extent
   - Check backup integrity
   - Verify backups are clean

3. Clean installation (120 min)
   - Wipe affected systems
   - Reinstall OS
   - Install application stack

4. Restore from clean backup (90 min)
   - Use backup from before infection
   - Verify no malware in backup
   - Restore data

5. Security hardening (60 min)
   - Patch vulnerabilities
   - Update passwords
   - Enable additional security

6. Monitor and verify (60 min)
   - Monitor for reinfection
   - Verify system integrity

Total: ~7-8 hours
```

### Emergency Contacts

| Role | Name | Phone | Email |
|------|------|-------|-------|
| System Administrator | [Name] | (02) 1234-5678 | admin@agency.gov.ph |
| Database Administrator | [Name] | (02) 1234-5679 | dba@agency.gov.ph |
| IT Director | [Name] | (02) 1234-5680 | itdirector@agency.gov.ph |
| Hosting Provider | [Provider] | [Support Line] | support@provider.com |

---

## Data Retention Policy

### Retention Periods

| Data Type | Retention Period | Legal Requirement |
|-----------|------------------|-------------------|
| Financial transactions | 10 years | COA requirement |
| Disbursement vouchers | 10 years | COA requirement |
| Payment records | 10 years | COA requirement |
| Audit logs | 5 years | Data Privacy Act |
| User activity logs | 2 years | Internal policy |
| Backup files | 30 days | Operational need |
| System logs | 90 days | Operational need |

### Archive Procedures

**Annual Archive (End of Fiscal Year):**

```bash
# Create archive directory
ARCHIVE_DIR="/archive/gds/FY$(date +%Y)"
mkdir -p "$ARCHIVE_DIR"

# Export fiscal year data
mysqldump -u gds_backup_user -p \
    --where="fiscalYear=$(date +%Y)" \
    gds_production > "$ARCHIVE_DIR/fy$(date +%Y)_data.sql"

# Compress
gzip "$ARCHIVE_DIR/fy$(date +%Y)_data.sql"

# Archive related files
tar -czf "$ARCHIVE_DIR/fy$(date +%Y)_files.tar.gz" \
    /var/www/gds/uploads/$(date +%Y)

# Verify archives
ls -lh "$ARCHIVE_DIR"

# Move to cold storage (tape, cloud archive tier)
rclone copy "$ARCHIVE_DIR" "archive:GDS/FY$(date +%Y)"
```

---

## Testing and Verification

### Monthly Backup Test

**Test Procedure:**

```bash
# 1. Select random backup file
BACKUP_FILE=$(ls /backup/gds/database/full/*.sql.gz | sort -R | head -1)

# 2. Create test database
mysql -u root -p -e "CREATE DATABASE gds_test;"

# 3. Restore to test database
gunzip < "$BACKUP_FILE" | mysql -u root -p gds_test

# 4. Verify data
mysql -u root -p gds_test -e "
    SELECT COUNT(*) AS total_users FROM users;
    SELECT COUNT(*) AS total_dvs FROM disbursement_vouchers;
    SELECT MAX(createdAt) AS latest_dv FROM disbursement_vouchers;
"

# 5. Drop test database
mysql -u root -p -e "DROP DATABASE gds_test;"

# 6. Document test results
echo "Backup test completed: $BACKUP_FILE" >> /var/log/backup-tests.log
```

**Test Schedule:**
- Database restore test: Monthly
- File restore test: Monthly
- Full disaster recovery drill: Quarterly
- Point-in-time recovery test: Quarterly

### Backup Verification Checklist

- [ ] Backup jobs completed without errors
- [ ] Backup file size is reasonable (not 0 bytes, not unexpectedly small)
- [ ] Backup files are not corrupted (test extract/restore)
- [ ] Cloud sync completed successfully
- [ ] Email notifications received
- [ ] Log files reviewed for errors
- [ ] Disk space sufficient for retention period
- [ ] Backup encryption working (if enabled)

---

## Backup Monitoring

### Setup Monitoring Alerts

```bash
# Create monitoring script
sudo nano /usr/local/bin/gds-backup-monitor.sh
```

```bash
#!/bin/bash
#
# Monitor backup status and send alerts
#

BACKUP_DIR="/backup/gds"
LOG_FILE="/var/log/gds-backup.log"
ALERT_EMAIL="admin@agency.gov.ph"

# Check if backups ran in last 24 hours
LATEST_DB_BACKUP=$(find "$BACKUP_DIR/database" -type f -name "*.sql.gz" -mtime -1 | wc -l)
LATEST_FILE_BACKUP=$(find "$BACKUP_DIR/files" -type f -name "*.tar.gz" -mtime -1 | wc -l)

if [ "$LATEST_DB_BACKUP" -eq 0 ]; then
    echo "ALERT: No database backup in last 24 hours" | \
        mail -s "GDS Backup Alert" "$ALERT_EMAIL"
fi

if [ "$LATEST_FILE_BACKUP" -eq 0 ]; then
    echo "ALERT: No file backup in last 24 hours" | \
        mail -s "GDS Backup Alert" "$ALERT_EMAIL"
fi

# Check disk space
DISK_USAGE=$(df -h "$BACKUP_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "WARNING: Backup disk usage at ${DISK_USAGE}%" | \
        mail -s "GDS Backup Disk Space Alert" "$ALERT_EMAIL"
fi
```

Add to crontab:
```cron
# Run monitoring every 6 hours
0 */6 * * * /usr/local/bin/gds-backup-monitor.sh
```

---

## Best Practices

1. **Test Restores Regularly**
   - Monthly test restores to verify backup integrity
   - Quarterly full disaster recovery drills

2. **Monitor Backup Jobs**
   - Review backup logs daily
   - Set up automated alerts for failures
   - Track backup file sizes for anomalies

3. **Secure Backup Storage**
   - Encrypt backups at rest
   - Restrict access to backup directories
   - Use separate credentials for backup user

4. **Document Everything**
   - Maintain backup logs
   - Document all recovery procedures
   - Keep emergency contact list updated

5. **Offsite Backups**
   - Always maintain offsite copies
   - Use cloud storage or remote server
   - Ensure offsite backups are encrypted

6. **Version Control**
   - Keep multiple backup versions
   - Don't overwrite the only backup
   - Follow retention policy

---

**Document Version:** 1.0
**Last Updated:** January 3, 2026
**Prepared By:** Development Team
**Review Schedule:** Quarterly
