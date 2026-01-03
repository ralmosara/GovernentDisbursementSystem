# Government Disbursement System - User Manual

**Version:** 1.0
**Date:** January 3, 2026
**For:** Government Agencies using the GDS

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles](#user-roles)
4. [Common Tasks](#common-tasks)
5. [Disbursement Vouchers](#disbursement-vouchers)
6. [Payments](#payments)
7. [Reports](#reports)
8. [Settings](#settings)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Introduction

### What is the Government Disbursement System?

The Government Disbursement System (GDS) is a comprehensive web-based application designed to streamline and manage government financial disbursements. It automates the creation, approval, and payment processes for Disbursement Vouchers (DVs), ensuring compliance with COA (Commission on Audit) regulations.

### Key Features

✅ **Disbursement Voucher Management**
- Create and track disbursement vouchers
- Multi-level approval workflow
- Real-time status tracking

✅ **Payment Processing**
- Multiple payment modes (Check, ADA, Cash Advance, Petty Cash)
- Automated check number generation
- Payment history tracking

✅ **Budget Management**
- Real-time budget tracking
- Allotment monitoring
- Fund source management

✅ **COA Compliance**
- Standard Chart of Accounts (COA) integration
- Automated financial reporting
- Audit trail for all transactions

✅ **Reporting & Analytics**
- Financial reports
- Budget utilization reports
- Custom report generation

✅ **Security & Audit**
- Role-based access control
- Comprehensive audit logging
- Secure authentication

---

## Getting Started

### Accessing the System

1. **Open your web browser** (Chrome, Firefox, or Edge recommended)
2. **Navigate to:** https://gds.agency.gov.ph
3. **You will see the login page**

### Logging In

1. Enter your **username**
2. Enter your **password**
3. Click **"Login"**

![Login Page](../screenshots/login-page.png)

**First-Time Login:**
- Your initial password will be provided by your System Administrator
- You will be prompted to change your password on first login
- Choose a strong password (minimum 8 characters, include uppercase, lowercase, and numbers)

**Forgot Password:**
- Click **"Forgot Password?"** on the login page
- Enter your username
- Follow the instructions sent to your registered email

### Dashboard Overview

After logging in, you'll see your dashboard with:

- **Quick Stats:** Summary of pending actions
- **Recent Activity:** Your recent transactions
- **Pending Approvals:** DVs awaiting your approval (if you're an approver)
- **Navigation Menu:** Access to all system features

![Dashboard](../screenshots/dashboard.png)

---

## User Roles

The system has different user roles, each with specific permissions:

### 1. Division Chief
**Responsibilities:**
- Create disbursement vouchers
- Submit DVs for approval
- View division's budget status
- Generate division reports

**Access to:**
- DV creation and listing
- Budget inquiry
- Reports for their division

### 2. Budget Officer
**Responsibilities:**
- Review DVs for budget availability
- Approve/reject DVs (first approval level)
- Monitor budget utilization
- Generate budget reports

**Access to:**
- All DVs requiring budget approval
- Budget management
- Allotment tracking
- Budget reports

### 3. Accounting Officer
**Responsibilities:**
- Verify accounting entries
- Approve/reject DVs (second approval level)
- Process payments
- Generate accounting reports

**Access to:**
- All DVs requiring accounting approval
- Payment processing
- Accounting reports
- Journal entries

### 4. Director/Agency Head
**Responsibilities:**
- Final approval of DVs
- Strategic oversight
- Policy decisions
- Executive reports

**Access to:**
- All DVs requiring final approval
- Executive dashboards
- Agency-wide reports
- System settings

### 5. Cashier
**Responsibilities:**
- Process check payments
- Handle cash advances
- Manage petty cash fund
- Record payment releases

**Access to:**
- Payment processing
- Check printing
- Cash advance tracking
- Payment reports

### 6. System Administrator
**Responsibilities:**
- User management
- System configuration
- Security management
- Technical support

**Access to:**
- All system features
- User administration
- System settings
- Audit logs

---

## Common Tasks

### Changing Your Password

1. Click your **name** in the top-right corner
2. Select **"Change Password"**
3. Enter your **current password**
4. Enter your **new password**
5. Confirm your **new password**
6. Click **"Update Password"**

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Viewing Your Profile

1. Click your **name** in the top-right corner
2. Select **"My Profile"**
3. View your:
   - Username
   - Full name
   - Email address
   - Role
   - Division/Department

### Logging Out

1. Click your **name** in the top-right corner
2. Select **"Logout"**
3. You will be redirected to the login page

---

## Disbursement Vouchers

### Creating a New DV

**Step 1: Navigate to DV Creation**
1. Click **"Disbursements"** in the sidebar
2. Click **"Create New DV"** button

**Step 2: Fill in Basic Information**
1. **Payee Information:**
   - Payee Name (person or company receiving payment)
   - TIN (Tax Identification Number)
   - Address

2. **Payment Details:**
   - Purpose/Description of payment
   - Payment mode (Check, ADA, etc.)
   - Amount

3. **Budget Information:**
   - Select Fund Source
   - Select Appropriation
   - Select Allotment
   - Enter Object Code (COA)

**Step 3: Add Line Items (if applicable)**
1. Click **"Add Line Item"**
2. Enter:
   - Description
   - Quantity
   - Unit Cost
   - Total automatically calculated

**Step 4: Upload Supporting Documents**
1. Click **"Upload Document"**
2. Select file (PDF, JPG, PNG only, max 10MB)
3. Add description/notes
4. Click **"Upload"**

**Required Documents:**
- Invoice or billing statement
- Purchase order (if applicable)
- Delivery receipt
- Other supporting documents

**Step 5: Review and Submit**
1. Review all information
2. Click **"Submit for Approval"**
3. DV will be assigned a DV number (format: 0000-MM-YYYY)
4. Approval workflow begins automatically

![Create DV Form](../screenshots/create-dv.png)

### Viewing DV Status

1. Go to **"Disbursements"** → **"All DVs"**
2. Find your DV in the list
3. Status indicators:
   - 🟡 **Pending** - Awaiting approval
   - 🔵 **In Progress** - Currently being reviewed
   - 🟢 **Approved** - All approvals complete
   - 🔴 **Rejected** - Disapproved by an approver
   - ✅ **Paid** - Payment has been released

### DV Approval Workflow

The approval process follows this sequence:

```
1. Division Chief (Creates DV)
   ↓
2. Budget Officer (Checks budget availability)
   ↓
3. Accounting Officer (Verifies accounting entries)
   ↓
4. Director/Agency Head (Final approval)
   ↓
5. Cashier (Processes payment)
```

Each approver can:
- ✅ **Approve** - Move to next level
- ❌ **Reject** - Return to creator with comments
- 💬 **Request Clarification** - Ask for more information

### Approving a DV (For Approvers)

1. Go to **"Disbursements"** → **"For My Approval"**
2. Click on a DV to view details
3. Review all information:
   - Payee details
   - Amount and purpose
   - Budget allocation
   - Supporting documents
4. Add comments (optional but recommended)
5. Click either:
   - **"Approve"** - Move to next level
   - **"Reject"** - Return with reason

![Approve DV](../screenshots/approve-dv.png)

### Tracking DV History

1. Open a DV
2. Scroll to **"Approval History"** section
3. View:
   - Who approved/rejected
   - When (date and time)
   - Comments from approvers
   - Status changes

---

## Payments

### Processing Check Payments (For Cashiers)

**Step 1: Select Approved DVs**
1. Go to **"Payments"** → **"Process Checks"**
2. View list of approved DVs ready for payment
3. Select DVs to process
4. Click **"Prepare Checks"**

**Step 2: Generate Check Details**
1. System auto-assigns check numbers
2. Review:
   - Check number
   - Payee name
   - Amount
   - Date
3. Click **"Print Checks"**

**Step 3: Record Check Release**
1. After printing and signing checks
2. Click **"Mark as Released"**
3. Enter:
   - Release date
   - Receiver name
   - ID details
4. Upload photo/scan of signed acknowledgment receipt
5. Click **"Confirm Release"**

### Cash Advance Requests

**Creating Cash Advance:**
1. Go to **"Cash Advance"** → **"New Request"**
2. Fill in:
   - Purpose of cash advance
   - Amount needed
   - Estimated date of liquidation
   - Justification
3. Attach supporting documents (work order, travel order, etc.)
4. Submit for approval

**Liquidating Cash Advance:**
1. Go to **"Cash Advance"** → **"My Advances"**
2. Click **"Liquidate"** on the advance
3. Enter actual expenses:
   - Date
   - Description
   - Amount
   - OR/Invoice number
4. Upload receipts
5. Calculate:
   - Total expenses
   - Amount to return (if any)
   - Additional needed (if any)
6. Submit liquidation report

### Petty Cash Management

**For Petty Cash Custodian:**

**Replenishing Fund:**
1. Go to **"Petty Cash"** → **"Replenishment"**
2. View summary of expenses
3. Click **"Request Replenishment"**
4. Attach summary of expenses
5. Submit to Accounting

**Recording Petty Cash Expenses:**
1. Click **"Record Expense"**
2. Enter:
   - Date
   - Payee
   - Purpose
   - Amount
   - Receipt number
3. Upload receipt photo
4. Save

---

## Reports

### Available Reports

**Financial Reports:**
- Trial Balance
- Statement of Allotment, Obligations, and Balances (SAOB)
- Statement of Appropriations, Allotments, and Obligations
- Budget Execution Document (BED)

**Disbursement Reports:**
- DV Register
- Payment Register
- Aging of Payables
- Check Register

**Budget Reports:**
- Budget Utilization Report
- Allotment Status
- Fund Source Summary

**Audit Reports:**
- Audit Trail
- User Activity Log
- Approval History

### Generating a Report

1. Go to **"Reports"**
2. Select report type from the list
3. Set parameters:
   - Date range (From - To)
   - Fund source (if applicable)
   - Department (if applicable)
   - Status filter (if applicable)
4. Click **"Generate Report"**
5. Report will display on screen
6. Options:
   - **Print** - Print to PDF
   - **Export to Excel** - Download as .xlsx
   - **Email** - Send to email address

![Report Generator](../screenshots/reports.png)

### Saving Report Templates

1. After setting your preferred filters
2. Click **"Save as Template"**
3. Name your template
4. Next time, select from **"My Templates"** dropdown
5. Click **"Load Template"** to use saved filters

---

## Settings

### COA Management (For Administrators)

**Adding Object Codes:**
1. Go to **"Settings"** → **"Chart of Accounts"**
2. Click **"Add Object Code"**
3. Enter:
   - COA Code (e.g., 5-02-01-010)
   - Description
   - Category
4. Save

### Fund Source Setup

1. Go to **"Settings"** → **"Fund Sources"**
2. Click **"Add Fund Source"**
3. Enter:
   - Fund code
   - Description
   - Total allocation
4. Save

### Appropriation Setup

1. Select a Fund Source
2. Click **"Add Appropriation"**
3. Enter:
   - Appropriation code
   - Description
   - Amount
   - Start and end dates
4. Save

### Allotment Setup

1. Select an Appropriation
2. Click **"Add Allotment"**
3. Enter:
   - Allotment class
   - Amount
   - Department/Division
4. Save

---

## Troubleshooting

### Cannot Login

**Problem:** "Invalid username or password"

**Solutions:**
1. Verify username and password are correct
2. Check if Caps Lock is on
3. Try **"Forgot Password"** to reset
4. Contact System Administrator if locked out

---

**Problem:** "Too many login attempts"

**Solutions:**
1. Wait 15 minutes before trying again
2. Contact System Administrator to unlock account

### Cannot Create DV

**Problem:** "Insufficient budget allocation"

**Solutions:**
1. Check if allotment has available balance
2. Verify correct fund source selected
3. Contact Budget Officer for budget augmentation

---

**Problem:** "Required field missing"

**Solutions:**
1. Review all fields marked with red asterisk (*)
2. Ensure all required documents uploaded
3. Check payee TIN format is correct

### Upload Failed

**Problem:** "File too large" or "Invalid file type"

**Solutions:**
1. File must be under 10MB
2. Accepted formats: PDF, JPG, PNG only
3. Compress large PDFs before uploading
4. Convert other file types to PDF

### Report Not Generating

**Problem:** Report shows "No data found"

**Solutions:**
1. Verify date range is correct
2. Check filters (fund source, department)
3. Ensure there are transactions in the period
4. Contact Administrator if problem persists

---

## FAQ

**Q: How do I know my DV was submitted successfully?**

A: After clicking "Submit for Approval", you'll see:
1. Success message at the top of the page
2. DV Number assigned (e.g., 0001-01-2026)
3. Status changed to "Pending Approval"
4. Email notification sent to first approver

---

**Q: Can I edit a DV after submission?**

A: No. Once submitted, DVs cannot be edited. If changes are needed:
1. Request rejection from current approver
2. DV returns to "Draft" status
3. Edit and resubmit

---

**Q: How long does approval take?**

A: Standard processing time:
- Budget approval: 1-2 business days
- Accounting approval: 1-2 business days
- Director approval: 1-3 business days
- **Total: 3-7 business days** (if no issues)

Urgent requests should be coordinated with approvers directly.

---

**Q: What if I forgot to attach a document?**

A: Before approval:
1. Request rejection to return to draft
2. Upload missing document
3. Resubmit

After approval:
1. Upload document to DV (if system allows)
2. Or attach to payment processing

---

**Q: Can I delete a DV?**

A: Only DVs in "Draft" status can be deleted. Submitted DVs must be rejected by an approver to be removed.

---

**Q: How do I check my division's budget balance?**

A:
1. Go to **"Budget"** → **"Inquiry"**
2. Select your fund source
3. Select your appropriation
4. View real-time balance

---

**Q: What happens if a check is lost or damaged?**

A:
1. Report immediately to Cashier
2. Cashier marks check as "Cancelled" in system
3. New check is issued
4. File incident report

---

**Q: Can multiple users work on the same DV?**

A: No. Only one user can edit a DV at a time. Once submitted, only approvers can take action.

---

**Q: How do I get training on the system?**

A: Contact your System Administrator or HR for:
1. Scheduled group training sessions
2. One-on-one tutorials
3. Training videos and materials
4. Quick reference guides

---

## Getting Help

### Technical Support

**Email:** support@agency.gov.ph
**Phone:** (02) 1234-5678
**Hours:** Monday - Friday, 8:00 AM - 5:00 PM

### Online Resources

- **User Documentation:** https://gds.agency.gov.ph/docs
- **Video Tutorials:** https://gds.agency.gov.ph/training
- **FAQ:** https://gds.agency.gov.ph/faq

### Reporting Issues

If you encounter a problem:

1. Take a screenshot if possible
2. Note what you were trying to do
3. Note any error messages
4. Email support with:
   - Your name and role
   - Description of the problem
   - Screenshots
   - Steps to reproduce

---

## Appendix

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Alt + N | New DV |
| Alt + S | Save Draft |
| Alt + L | Logout |
| F1 | Help |

### System Limits

| Item | Limit |
|------|-------|
| File upload size | 10 MB |
| Accepted file types | PDF, JPG, PNG |
| Password length | Min 8 characters |
| Session timeout | 30 minutes |
| DV description | 500 characters |

### Contact Information

**System Administrator:**
- Name: [Admin Name]
- Email: admin@agency.gov.ph
- Phone: (02) 1234-5678 ext. 100

**Budget Office:**
- Email: budget@agency.gov.ph
- Phone: (02) 1234-5678 ext. 200

**Accounting Office:**
- Email: accounting@agency.gov.ph
- Phone: (02) 1234-5678 ext. 300

---

**Document Version:** 1.0
**Last Updated:** January 3, 2026
**Prepared By:** Development Team

**Copyright © 2026 [Your Agency]. All rights reserved.**
