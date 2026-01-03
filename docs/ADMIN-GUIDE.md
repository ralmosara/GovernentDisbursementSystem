# System Administrator Guide

**Version:** 1.0
**Date:** January 3, 2026
**Audience:** System Administrators

---

## Table of Contents

1. [Administrator Responsibilities](#administrator-responsibilities)
2. [User Management](#user-management)
3. [Role and Permission Management](#role-and-permission-management)
4. [COA Configuration](#coa-configuration)
5. [Fund Source Management](#fund-source-management)
6. [System Settings](#system-settings)
7. [Audit Log Review](#audit-log-review)
8. [Security Management](#security-management)
9. [Performance Monitoring](#performance-monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Administrator Responsibilities

### Primary Duties

**User Administration:**
- Create and manage user accounts
- Assign and modify user roles
- Reset passwords and unlock accounts
- Deactivate/reactivate users

**System Configuration:**
- Configure Chart of Accounts (COA)
- Manage fund sources and appropriations
- Set up system-wide settings
- Configure email notifications

**Security Management:**
- Monitor security logs
- Review audit trails
- Manage access controls
- Respond to security incidents

**Maintenance:**
- Monitor system health
- Perform regular backups
- Apply system updates
- Optimize database performance

**Support:**
- Assist users with technical issues
- Train new users
- Generate system reports
- Document procedures

### Access Level

System Administrators have the highest access level with permissions to:
- All system features and modules
- User administration panel
- System configuration settings
- Audit logs and security monitoring
- Database management tools

---

## User Management

### Creating a New User

1. **Access User Management:**
   - Navigate to **Settings** → **User Management**
   - Click **"Add New User"**

2. **Enter User Information:**
   ```
   Username: (required, unique, 3-20 characters)
   Full Name: (required)
   Email: (required, valid email format)
   Division/Department: (select from dropdown)
   Position: (text field)
   ```

3. **Assign Role:**
   - Select from available roles:
     - Division Chief
     - Budget Officer
     - Accounting Officer
     - Director
     - Cashier
     - System Administrator

4. **Set Initial Password:**
   - Option 1: System generates random password
   - Option 2: Set temporary password
   - Password must meet requirements (8+ chars, uppercase, lowercase, number, special char)

5. **Configure Settings:**
   - ✅ Active (user can login)
   - ✅ Force Password Change (user must change password on first login)
   - ✅ Send Welcome Email (sends credentials to user's email)

6. **Review and Save:**
   - Review all information
   - Click **"Create User"**
   - System sends welcome email with credentials

### Managing Existing Users

**View User List:**
- Navigate to **Settings** → **User Management**
- Filter by:
  - Role
  - Department
  - Active/Inactive status
- Search by name or username

**Edit User:**
1. Click **"Edit"** icon next to user
2. Modify allowed fields:
   - Full name
   - Email
   - Division/Department
   - Position
   - Role
3. Click **"Save Changes"**

**Deactivate User:**
1. Click **"Deactivate"** button
2. Confirm action
3. User can no longer login
4. Audit trail preserved

**Reactivate User:**
1. Filter by "Inactive" status
2. Click **"Reactivate"** button
3. Optionally reset password
4. User can login again

**Delete User:**
⚠️ **WARNING:** Permanent action. Use deactivate instead.

Only delete if:
- User was created by mistake
- No transactions associated with user
- Less than 24 hours old

### Password Management

**Reset User Password:**

1. Navigate to user profile
2. Click **"Reset Password"**
3. Options:
   - Generate random password
   - Set temporary password
4. Check **"Force Password Change"**
5. Click **"Reset"**
6. Communicate new password securely to user

**Unlock Locked Account:**

If user exceeded login attempts:
1. Go to user profile
2. Check **"Account Status"**
3. Click **"Unlock Account"**
4. Optionally reset password
5. Notify user

**Bulk Password Reset:**

For security incidents:
1. Go to **Settings** → **Security**
2. Click **"Force Password Reset"**
3. Select users or departments
4. All selected users must change password on next login

---

## Role and Permission Management

### Available Roles

**1. Division Chief**
- Create disbursement vouchers
- View division budget
- Generate division reports

**2. Budget Officer**
- Approve DVs (budget check)
- Manage budget allocations
- Generate budget reports

**3. Accounting Officer**
- Approve DVs (accounting review)
- Process payments
- Generate accounting reports

**4. Director**
- Final approval of DVs
- View executive dashboard
- Generate agency-wide reports

**5. Cashier**
- Process check payments
- Manage cash advances
- Handle petty cash

**6. System Administrator**
- Full system access
- User management
- System configuration

### Permission Matrix

| Function | Division Chief | Budget | Accounting | Director | Cashier | Admin |
|----------|---------------|--------|------------|----------|---------|-------|
| Create DV | ✅ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Approve DV (Budget) | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Approve DV (Accounting) | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ |
| Approve DV (Final) | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| Process Payments | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Manage Users | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Configure COA | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| View Audit Logs | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |

### Custom Role Creation (Future Feature)

Currently, roles are predefined. To request custom roles, contact the development team.

---

## COA Configuration

### Chart of Accounts Structure

COA follows government accounting standards:

```
Format: X-XX-XX-XXX

Where:
X = Major Account Group (1-9)
XX = Sub-Major Account Group
XX = Minor Account Group
XXX = Object Code
```

### Adding Object Codes

1. Navigate to **Settings** → **Chart of Accounts**
2. Click **"Add Object Code"**
3. Enter details:
   ```
   COA Code: 5-02-01-010
   Title: Salaries and Wages - Regular
   Description: Regular salaries of permanent employees
   Category: Personal Services
   Normal Balance: Debit
   Active: ✅ Yes
   ```
4. Click **"Save"**

### Importing COA from Excel

1. Download template: **Settings** → **COA** → **"Download Template"**
2. Fill in Excel file:
   - COA Code
   - Title
   - Description
   - Category
3. Upload: **Settings** → **COA** → **"Import COA"**
4. Review import summary
5. Confirm import

### Common Object Codes

**Personal Services (5-01):**
- 5-01-01-010: Salaries and Wages - Regular
- 5-01-01-020: Salaries and Wages - Casual
- 5-01-02-001: PERA
- 5-01-02-002: Representation Allowance

**Maintenance and Other Operating Expenses (5-02):**
- 5-02-01-010: Traveling Expenses - Local
- 5-02-03-010: Office Supplies
- 5-02-05-010: Electricity
- 5-02-05-020: Water
- 5-02-11-010: Training Expenses

**Capital Outlay (5-06):**
- 5-06-02-010: Office Equipment
- 5-06-03-010: Information Technology Equipment

---

## Fund Source Management

### Fund Source Hierarchy

```
Fund Source (e.g., General Fund)
  └── Appropriation (e.g., FY 2026 Regular Appropriation)
       └── Allotment (e.g., Q1 2026 Allotment)
```

### Creating Fund Sources

1. Navigate to **Settings** → **Fund Sources**
2. Click **"Add Fund Source"**
3. Enter details:
   ```
   Fund Code: 101
   Fund Name: General Fund
   Description: Regular operating fund
   Fiscal Year: 2026
   Total Allocation: ₱10,000,000.00
   Status: Active
   ```
4. Click **"Save"**

### Managing Appropriations

1. Select a Fund Source
2. Click **"Add Appropriation"**
3. Enter details:
   ```
   Appropriation Code: GAA-2026-001
   Description: General Appropriations Act FY 2026
   Amount: ₱10,000,000.00
   Start Date: 2026-01-01
   End Date: 2026-12-31
   Purpose: Regular operations
   ```
4. Click **"Save"**

### Managing Allotments

1. Select an Appropriation
2. Click **"Add Allotment"**
3. Enter details:
   ```
   Allotment Class: I (Personnel Services)
   Amount: ₱5,000,000.00
   Department: Administrative Division
   Quarter: Q1 2026
   Release Date: 2026-01-15
   ```
4. Click **"Save"**

### Budget Monitoring

**View Budget Status:**
1. Navigate to **Budget** → **Budget Monitor**
2. View summary:
   - Total Appropriation
   - Total Allotments Released
   - Total Obligations
   - Unobligated Balance
   - Utilization Rate

**Budget Reports:**
- Statement of Allotment, Obligations, and Balances (SAOB)
- Budget Execution Document (BED)
- Allotment Status Report

---

## System Settings

### General Settings

**Access:** Settings → General

**Configurable Options:**

1. **Agency Information:**
   - Agency Name
   - Agency Code
   - Address
   - Contact Information
   - Logo Upload

2. **Fiscal Year Settings:**
   - Current Fiscal Year
   - Fiscal Year Start Date
   - Fiscal Year End Date

3. **Workflow Settings:**
   - Enable/Disable approval stages
   - Set approval timeout
   - Configure notification settings

4. **Document Settings:**
   - DV Number Format
   - Check Number Format
   - OR Number Format

### Email Configuration

**Access:** Settings → Email

**SMTP Settings:**
```
SMTP Host: smtp.gmail.com
SMTP Port: 587
Encryption: TLS
Username: noreply@agency.gov.ph
Password: [app-specific password]
From Name: Government Disbursement System
From Email: noreply@agency.gov.ph
```

**Test Email:**
1. Click **"Send Test Email"**
2. Enter test recipient email
3. Verify email received

**Notification Templates:**
- DV Created Notification
- Approval Request Notification
- DV Approved Notification
- DV Rejected Notification
- Payment Released Notification

### Security Settings

**Access:** Settings → Security

**Password Policy:**
```
Minimum Length: 8 characters
Require Uppercase: Yes
Require Lowercase: Yes
Require Numbers: Yes
Require Special Characters: Yes
Password Expiry: 90 days
Password History: Remember last 5 passwords
```

**Session Settings:**
```
Session Timeout: 30 minutes
Concurrent Sessions: 1 per user
Remember Me Duration: 7 days
```

**Login Security:**
```
Max Failed Attempts: 5
Lockout Duration: 15 minutes
Enable CAPTCHA after: 3 failed attempts
Enable Two-Factor Authentication: Optional
```

**Rate Limiting:**
```
Login Attempts (IP): 10 per 15 minutes
Login Attempts (Username): 5 per 15 minutes
Block Duration: 60 minutes
```

---

## Audit Log Review

### Accessing Audit Logs

**Navigation:** Settings → Audit Logs

**Available Logs:**
1. User Activity Log
2. Authentication Log
3. Data Modification Log
4. System Event Log

### User Activity Log

**View Activities:**
- Filter by:
  - Date range
  - User
  - Activity type
  - Module

**Activity Types:**
- DV Created
- DV Approved
- DV Rejected
- Payment Processed
- User Created
- Settings Changed

**Log Entry Details:**
```
Timestamp: 2026-01-03 14:30:15
User: john.doe
IP Address: 192.168.1.100
Action: DV Approved
Target: DV-0001-01-2026
Details: Approved for ₱50,000.00
Result: Success
```

### Authentication Log

**Monitor Login Activity:**
- Successful logins
- Failed login attempts
- Account lockouts
- Password changes
- Password resets

**Security Alerts:**
- Multiple failed login attempts
- Login from new IP address
- Login from unusual location
- Concurrent sessions detected

### Exporting Audit Logs

1. Set date range and filters
2. Click **"Export"**
3. Choose format:
   - CSV
   - Excel
   - PDF
4. Save file

**Retention:** Audit logs are retained for 5 years per Data Privacy Act.

---

## Security Management

### Security Dashboard

**Access:** Settings → Security → Dashboard

**Security Metrics:**
- Failed login attempts (last 24 hours)
- Locked accounts
- Active sessions
- Recent password changes
- Security alerts

### Monitoring Failed Logins

1. Navigate to **Security** → **Failed Logins**
2. Review attempts:
   - Timestamp
   - Username
   - IP address
   - Reason (invalid password, account locked, etc.)
3. Identify patterns:
   - Same IP multiple usernames (possible attack)
   - Same username multiple IPs (distributed attack)
   - Unusual times (after hours)

**Action:** If suspicious activity detected:
1. Block IP address (if applicable)
2. Lock affected accounts
3. Notify users
4. Review security logs

### Active Session Management

**View Active Sessions:**
1. Navigate to **Security** → **Active Sessions**
2. View:
   - Username
   - IP Address
   - Login time
   - Last activity
   - Device/Browser

**Terminate Session:**
1. Select session
2. Click **"Terminate"**
3. User is logged out immediately

**Force Logout All:**
For security incidents:
1. Click **"Terminate All Sessions"**
2. Confirm action
3. All users logged out
4. Force password reset (optional)

### IP Whitelisting/Blacklisting

**Whitelist IPs** (allow only these IPs):
1. Navigate to **Security** → **IP Control**
2. Click **"Add to Whitelist"**
3. Enter IP or IP range:
   ```
   Single IP: 192.168.1.100
   IP Range: 192.168.1.1-192.168.1.254
   CIDR: 192.168.1.0/24
   ```
4. Add description
5. Save

**Blacklist IPs** (block these IPs):
1. Click **"Add to Blacklist"**
2. Enter IP address
3. Set duration:
   - Permanent
   - 1 hour
   - 24 hours
   - 7 days
4. Add reason
5. Save

### Security Alerts

**Configure Email Alerts:**
1. Navigate to **Settings** → **Notifications**
2. Enable alerts for:
   - ✅ Multiple failed login attempts
   - ✅ New user created
   - ✅ User role changed
   - ✅ High-value transaction (>₱100,000)
   - ✅ System error
   - ✅ Backup failure

3. Set recipient emails
4. Save settings

---

## Performance Monitoring

### System Health Dashboard

**Access:** Settings → System Status

**Metrics Displayed:**
- Server CPU usage
- Memory usage
- Disk space
- Database size
- Active users
- Response time

### Database Management

**Database Statistics:**
```
Database Size: 2.5 GB
Tables: 35
Total Records: 150,000
Growth Rate: ~50 MB/month
```

**Optimize Database:**
1. Navigate to **Settings** → **Database**
2. Click **"Optimize Tables"**
3. Select tables or "All Tables"
4. Click **"Optimize"**
5. Review optimization results

**Recommended:** Run optimization monthly during off-peak hours.

### Clear Cache

**Clear Application Cache:**
1. Navigate to **Settings** → **System**
2. Click **"Clear Cache"**
3. Confirm action
4. Cache cleared immediately

**When to clear cache:**
- After system updates
- After configuration changes
- When experiencing slow performance

### View System Logs

**Access Application Logs:**
```bash
# SSH into server
ssh gds@server

# View PM2 logs
pm2 logs gds --lines 100

# View error logs
pm2 logs gds --err

# View Nginx access log
sudo tail -f /var/log/nginx/gds-access.log

# View Nginx error log
sudo tail -f /var/log/nginx/gds-error.log
```

---

## Troubleshooting

### Common Issues

**Issue: Users cannot login**

Diagnosis:
```bash
# Check if application is running
pm2 status

# Check application logs
pm2 logs gds --lines 50

# Check database connection
mysql -u gds_user -p gds_production -e "SELECT 1;"
```

Solutions:
1. Restart application: `pm2 restart gds`
2. Check database connectivity
3. Verify session configuration
4. Check for account lockouts

---

**Issue: Slow performance**

Diagnosis:
```bash
# Check server resources
htop

# Check database performance
mysql -u root -p -e "SHOW PROCESSLIST;"

# Check slow queries
mysql -u root -p -e "SHOW VARIABLES LIKE 'slow_query_log';"
```

Solutions:
1. Optimize database tables
2. Clear application cache
3. Restart application
4. Check for long-running queries

---

**Issue: Reports not generating**

Diagnosis:
1. Check error logs
2. Verify database connectivity
3. Check user permissions
4. Verify data exists for selected filters

Solutions:
1. Clear browser cache
2. Check report parameters
3. Verify database indexes
4. Contact support if persists

---

**Issue: Email notifications not sending**

Diagnosis:
1. Check SMTP settings
2. Send test email
3. Check email logs

Solutions:
1. Verify SMTP credentials
2. Check firewall rules (port 587)
3. Verify sender email not blacklisted
4. Check email queue

---

### Getting Technical Support

**Before Contacting Support:**
1. Check system logs
2. Note error messages
3. Document steps to reproduce
4. Check system status page

**Contact Information:**
- Email: support@agency.gov.ph
- Phone: (02) 1234-5678
- Create ticket: https://support.agency.gov.ph

**Provide in Support Request:**
- Your name and role
- Description of issue
- Error messages (screenshots)
- Steps to reproduce
- Impact severity
- System logs (if available)

---

## Best Practices

1. **Regular Backups**
   - Verify daily backups complete successfully
   - Test restore monthly
   - Maintain offsite copies

2. **Security**
   - Review audit logs weekly
   - Monitor failed login attempts daily
   - Keep system updated
   - Enforce strong password policy

3. **User Management**
   - Deactivate users promptly when they leave
   - Review user roles quarterly
   - Audit permissions regularly

4. **Performance**
   - Monitor system resources
   - Optimize database monthly
   - Clear old logs regularly

5. **Documentation**
   - Document all changes
   - Maintain runbook for common tasks
   - Keep contact lists updated

---

**Document Version:** 1.0
**Last Updated:** January 3, 2026
**Prepared By:** Development Team
**Review Schedule:** Quarterly
