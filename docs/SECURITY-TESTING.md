# Security Testing Guide

## Overview

This document outlines the security testing procedures for the Philippine Government Financial Management System, focusing on OWASP Top 10 vulnerabilities and government-specific security requirements.

## Security Testing Checklist

### 1. SQL Injection Prevention ✅

**Test Areas:**
- [ ] All search inputs
- [ ] Filter parameters
- [ ] Login forms
- [ ] API endpoints with query parameters
- [ ] Report generation inputs

**Test Cases:**

```sql
-- Test Inputs
' OR '1'='1
'; DROP TABLE users; --
admin'--
' UNION SELECT * FROM users--
```

**Expected Behavior:**
- All inputs should be parameterized via Drizzle ORM
- No raw SQL queries should be executed
- Error messages should not reveal database structure

**Testing Commands:**
```bash
# Manual testing with curl
curl -X POST http://localhost:4321/api/disbursements \
  -d "payeeName=' OR '1'='1" \
  -H "Content-Type: application/json"
```

**Status:** ✅ PASS - Drizzle ORM uses parameterized queries

---

### 2. Cross-Site Scripting (XSS) Prevention

**Test Areas:**
- [ ] All text input fields
- [ ] Rich text editors
- [ ] File upload filenames
- [ ] User-generated content display
- [ ] URL parameters

**Test Payloads:**

```html
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
<iframe src="javascript:alert('XSS')"></iframe>
javascript:alert('XSS')
<svg onload=alert('XSS')>
```

**Expected Behavior:**
- All output should be properly escaped
- HTML special characters should be encoded
- User input should never be directly rendered as HTML

**Testing:**
1. Input XSS payload in payee name field
2. Submit DV form
3. View DV details page
4. Check if script executes or is displayed as plain text

**Status:** 🔍 NEEDS TESTING

---

### 3. Cross-Site Request Forgery (CSRF) Protection

**Test Areas:**
- [ ] All form submissions
- [ ] State-changing API endpoints
- [ ] DELETE operations
- [ ] Update operations

**Test Case:**
```html
<!-- External site attempting CSRF -->
<form action="http://localhost:4321/api/disbursements" method="POST">
  <input type="hidden" name="payeeName" value="Malicious">
  <input type="hidden" name="amount" value="1000000">
</form>
<script>document.forms[0].submit();</script>
```

**Expected Behavior:**
- CSRF tokens required for all state-changing operations
- Requests without valid tokens should be rejected
- Tokens should be unique per session

**Testing:**
1. Create form on external HTML file
2. Open while logged into system
3. Attempt submission
4. Should be rejected

**Status:** 🔍 NEEDS TESTING

---

### 4. Authentication Bypass

**Test Areas:**
- [ ] Direct URL access to protected pages
- [ ] API endpoint access without auth
- [ ] Session manipulation
- [ ] Cookie tampering

**Test Cases:**

```bash
# Attempt to access protected page without login
curl http://localhost:4321/disbursements

# Attempt API call without session
curl http://localhost:4321/api/disbursements

# Try manipulated session cookie
curl http://localhost:4321/disbursements \
  -H "Cookie: session=invalid_token"
```

**Expected Behavior:**
- Redirect to /login for unauthenticated requests
- 401 Unauthorized for API calls
- Invalid sessions should be rejected

**Status:** ✅ PASS - Lucia Auth middleware enforces authentication

---

### 5. Authorization & Access Control

**Test Areas:**
- [ ] Role-based page access
- [ ] API endpoint permissions
- [ ] Data access restrictions
- [ ] Admin functionality

**Test Matrix:**

| Role | /admin/users | /audit | /disbursements/create | /payments/process |
|------|--------------|--------|----------------------|-------------------|
| Admin | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow |
| Director | ❌ Deny | ✅ Allow | ❌ Deny | ✅ Allow |
| Accountant | ❌ Deny | ✅ Allow | ❌ Deny | ❌ Deny |
| Budget Officer | ❌ Deny | ✅ Allow | ❌ Deny | ❌ Deny |
| Staff | ❌ Deny | ❌ Deny | ✅ Allow | ❌ Deny |

**Testing:**
1. Login as each role
2. Attempt to access each page
3. Verify proper access control

**Status:** ✅ PASS - Permission system implemented

---

### 6. Sensitive Data Exposure

**Test Areas:**
- [ ] Error messages
- [ ] Log files
- [ ] API responses
- [ ] Source code comments
- [ ] Configuration files

**Checks:**

```bash
# Check for exposed .env file
curl http://localhost:4321/.env

# Check for exposed git directory
curl http://localhost:4321/.git/config

# Check API error responses
curl http://localhost:4321/api/invalid-endpoint
```

**Expected Behavior:**
- No stack traces in production errors
- No database connection strings exposed
- No sensitive data in client-side code
- Proper .gitignore configuration

**Sensitive Fields to Protect:**
- Passwords
- Session tokens
- API keys
- Database credentials
- Encryption keys

**Status:** ✅ PASS - Audit logger sanitizes sensitive fields

---

### 7. File Upload Security

**Test Areas:**
- [ ] File type validation
- [ ] File size limits
- [ ] Malicious file detection
- [ ] Path traversal prevention
- [ ] Filename sanitization

**Test Payloads:**

```javascript
// Test files
malicious.exe
script.php
../../etc/passwd
<script>alert('XSS')</script>.pdf
file.pdf.exe
```

**Expected Behavior:**
- Only allowed file types accepted (PDF, JPEG, PNG, XLSX, DOCX)
- 10MB size limit enforced
- Executable files rejected
- Path traversal attempts blocked
- Files stored with UUID names

**Testing:**
```bash
# Attempt to upload PHP file
curl -X POST http://localhost:4321/api/attachments \
  -F "file=@malicious.php"

# Attempt path traversal
curl -X POST http://localhost:4321/api/attachments \
  -F "file=@../../etc/passwd"
```

**Status:** ✅ PASS - Comprehensive file validation implemented

---

### 8. Session Management

**Test Areas:**
- [ ] Session timeout
- [ ] Concurrent sessions
- [ ] Session fixation
- [ ] Logout functionality
- [ ] Remember me feature

**Test Cases:**

```bash
# Test session timeout (after 30 minutes of inactivity)
# 1. Login
# 2. Wait 30+ minutes
# 3. Attempt to access protected page
# Expected: Redirect to login

# Test logout
# 1. Login
# 2. Logout
# 3. Use back button
# Expected: Session invalidated
```

**Expected Behavior:**
- Sessions expire after inactivity period
- Logout invalidates session completely
- Session IDs not predictable
- Secure and HttpOnly cookie flags set

**Status:** ✅ PASS - Lucia Auth handles session management

---

### 9. Broken Authentication

**Test Areas:**
- [ ] Weak password policy
- [ ] Brute force protection
- [ ] Password reset flow
- [ ] Account enumeration
- [ ] Default credentials

**Test Cases:**

```python
# Brute force attempt
for password in password_list:
    response = login('admin', password)
    if response.status == 200:
        break
```

**Expected Behavior:**
- Strong password requirements enforced
- Rate limiting on login attempts
- Account lockout after failed attempts
- Generic error messages (don't reveal if user exists)
- No default credentials in production

**Mitigations:**
- Implement rate limiting (5 failed attempts = 15 min lockout)
- Use bcrypt for password hashing
- Require complex passwords (min 8 chars, uppercase, lowercase, number, symbol)

**Status:** 🔍 NEEDS IMPLEMENTATION - Rate limiting

---

### 10. Server Configuration

**Test Areas:**
- [ ] HTTP security headers
- [ ] HTTPS enforcement
- [ ] Directory listing disabled
- [ ] Server information disclosure
- [ ] Default pages removed

**Required Headers:**

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'
Referrer-Policy: no-referrer-when-downgrade
```

**Testing:**

```bash
# Check security headers
curl -I http://localhost:4321

# Check for directory listing
curl http://localhost:4321/public/uploads/

# Check server version disclosure
curl -I http://localhost:4321 | grep Server
```

**Status:** 🔍 NEEDS CONFIGURATION

---

## Government-Specific Security Requirements

### COA Compliance

**Requirements:**
- 10-year audit trail retention
- Tamper-proof audit logs
- User activity tracking
- IP address logging
- Access control documentation

**Status:** ✅ IMPLEMENTED

### Data Privacy Act (R.A. 10173)

**Requirements:**
- Personal data protection
- Consent for data collection
- Right to be forgotten (where applicable)
- Data breach notification
- Privacy policy

**Status:** ⚠️ PARTIAL - Privacy policy needed

### National Cybersecurity Plan 2022

**Requirements:**
- Incident response plan
- Regular security audits
- Staff security training
- Vulnerability management
- Backup and recovery procedures

**Status:** 📋 PLANNED

---

## Penetration Testing

### Automated Scanning

**Tools:**
- OWASP ZAP
- Burp Suite Community
- Nikto
- SQLMap

**Commands:**

```bash
# OWASP ZAP baseline scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:4321

# Nikto web server scan
nikto -h http://localhost:4321

# SQLMap SQL injection test
sqlmap -u "http://localhost:4321/api/disbursements?id=1" \
  --batch --risk=3 --level=5
```

### Manual Testing

**Areas:**
1. Business logic vulnerabilities
2. Authorization bypasses
3. Race conditions
4. Insecure direct object references (IDOR)

**IDOR Test:**
```bash
# Login as user1
# Access user2's disbursement
curl http://localhost:4321/api/disbursements/123 \
  -H "Cookie: session=user1_session"

# Should be denied if DV belongs to different department
```

---

## Security Testing Schedule

### Daily (During Development)
- Code review for security issues
- Dependency vulnerability scanning

### Weekly
- Manual security testing of new features
- Review audit logs for anomalies

### Monthly
- Automated security scan (OWASP ZAP)
- Access control review
- Update dependencies

### Quarterly
- Full penetration test
- Security training for team
- Incident response drill

### Annually
- Third-party security audit
- Compliance review
- Update security policies

---

## Vulnerability Reporting

### Internal Process
1. Document vulnerability with steps to reproduce
2. Assess severity (Critical/High/Medium/Low)
3. Create fix in isolated branch
4. Test fix thoroughly
5. Deploy with security advisory

### Severity Levels

**Critical**
- SQL injection
- Authentication bypass
- Remote code execution
- Data breach

**High**
- XSS that can steal sessions
- CSRF on critical operations
- Authorization bypass
- Sensitive data exposure

**Medium**
- Limited XSS
- Missing security headers
- Information disclosure
- Weak password policy

**Low**
- Verbose error messages
- Missing input validation
- Minor configuration issues

---

## Security Testing Tools

### Recommended Tools

1. **OWASP ZAP** - Web application scanner
2. **Burp Suite** - Penetration testing
3. **SQLMap** - SQL injection detection
4. **Nikto** - Web server scanner
5. **npm audit** - Dependency vulnerabilities
6. **Snyk** - Security vulnerability scanner
7. **SonarQube** - Code quality and security

### Installation

```bash
# npm audit
npm audit

# Install Snyk
npm install -g snyk
snyk test

# Run OWASP Dependency Check
dependency-check --scan ./
```

---

## Secure Coding Practices

### Input Validation
```typescript
// Good
const amount = parseFloat(input.amount);
if (isNaN(amount) || amount <= 0) {
  throw new Error('Invalid amount');
}

// Bad
const amount = input.amount; // No validation
```

### Output Encoding
```typescript
// Good
<p>{sanitizeHtml(userInput)}</p>

// Bad
<p dangerouslySetInnerHTML={{__html: userInput}}></p>
```

### Authentication
```typescript
// Good
if (!session || !session.user) {
  return redirect('/login');
}

// Bad
if (req.query.user === 'admin') {
  // Grant access
}
```

### Password Storage
```typescript
// Good
const hash = await bcrypt.hash(password, 10);

// Bad
const hash = md5(password);
```

---

## Security Checklist for Deployment

- [ ] Change all default passwords
- [ ] Enable HTTPS with valid certificate
- [ ] Set secure cookie flags
- [ ] Configure security headers
- [ ] Disable directory listing
- [ ] Remove debug/development code
- [ ] Set proper file permissions
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Set up intrusion detection
- [ ] Configure backup encryption
- [ ] Document incident response plan
- [ ] Train users on security policies
- [ ] Perform final security scan
- [ ] Review all API endpoints

---

## Contacts

**Security Team:**
- Security Officer: [contact]
- Development Lead: [contact]
- System Administrator: [contact]

**Emergency Contact:**
- After-hours hotline: [number]
- Email: security@agency.gov.ph

---

Last Updated: January 2026
Version: 1.0
