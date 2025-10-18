# Security Review Session Template

> **Template Type:** Security Audit & Vulnerability Assessment
> **Version:** 1.0
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For conducting security reviews, identifying vulnerabilities, and implementing security best practices.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents:

### Core Contexts (Always Load)
- `ai-contexts/code-workflow.md` - Standard workflow and task tracking
- `ai-contexts/master-context.md` - General principles and conventions

### Security-Relevant Contexts
- `ai-contexts/backend/backend-api-context.md` - API security patterns
- `ai-contexts/backend/database-context.md` - Database security (SQL injection, etc.)
- `ai-contexts/frontend/component-context.md` - Frontend security (XSS, CSRF)

### Optional Contexts
- Domain-specific contexts for the module under review

**How to load:** Use the Read tool to load each relevant context document before beginning security review.

---

## 🔍 Review Scope

<!-- Define what's being reviewed -->

**Review Type:**
- [x] Authentication System
- [x] Authorization & Permissions
- [x] Data Validation & Sanitization
- [x] API Security
- [ ] Database Security
- [ ] Frontend Security (XSS, CSRF)
- [x] Secrets Management
- [ ] Third-party Dependencies
- [ ] Full Application Audit

**Target Area:**
Personal Finance API Endpoints (`/api/personal/**`)

**Concerns Reported:**
- User reported seeing another user's expense transaction in their list
- Concerned about data isolation between users
- Want to ensure users cannot access/modify other users' financial data
- Need to verify permission checks are working correctly

**Priority Level:**
- [x] Critical - Production security issue (data leakage suspected)
- [ ] High - Potential vulnerability
- [ ] Medium - Security improvement
- [ ] Low - Best practice review

---

## 🛡️ Security Checklist

### Authentication & Authorization

**Authentication:**
- [x] Secure password storage (hashing with salt) - Using bcrypt
- [x] Session management secure - NextAuth manages sessions
- [x] Token expiration implemented - Session expires after 30 days
- [ ] Multi-factor authentication (if applicable) - Not implemented (future)
- [ ] Account lockout on failed attempts - Not implemented (risk: brute force)
- [x] Password complexity requirements - Min 8 chars (could be stronger)

**Authorization:**
- [ ] Role-based access control (RBAC) implemented - ⚠️ NEEDS REVIEW
- [ ] Permission checks on all sensitive endpoints - ⚠️ NEEDS REVIEW
- [ ] User data isolation (users can't access others' data) - ⚠️ SUSPECTED ISSUE
- [x] Admin-only routes protected - Admin middleware exists
- [ ] API endpoints check user permissions - ⚠️ NEEDS VERIFICATION

**Specific Issues to Investigate:**
1. `/api/personal/expenses` endpoint - Does it filter by authenticated user?
2. `/api/personal/expenses/[expenseId]` - Can user access any expense by ID?
3. Permission checking in personal finance module - Is it consistent?
4. Business access control - Can user access expenses from business they don't belong to?

### Input Validation & Sanitization

**Backend Validation:**
- [x] All user inputs validated - Using Zod schemas
- [x] Type checking enforced - TypeScript + Zod
- [x] Length limits applied - Zod max length validators
- [x] Format validation (email, phone, etc.) - Zod format validators
- [x] SQL injection prevented (using Prisma/parameterized queries) - ✅ Prisma used
- [x] NoSQL injection prevented - Not using NoSQL

**Frontend Validation:**
- [x] Client-side validation present (UX) - React Hook Form
- [x] Server-side validation enforced (security) - ✅ Validated
- [ ] XSS prevention (sanitize outputs) - ⚠️ NEEDS REVIEW
- [ ] CSRF protection implemented - ⚠️ NEEDS VERIFICATION
- [ ] File upload validation (type, size, content) - No file uploads in personal finance

### Data Security

**Data Storage:**
- [ ] Sensitive data encrypted at rest - ⚠️ Financial data not encrypted
- [x] Passwords hashed (bcrypt, argon2, etc.) - ✅ bcrypt used
- [x] API keys/secrets not in code - ✅ Environment variables
- [x] Environment variables used for secrets - ✅ .env file
- [x] Database connection strings secured - ✅ In .env
- [ ] PII data handling compliant - ⚠️ NEEDS REVIEW (GDPR considerations)

**Data Transmission:**
- [x] HTTPS enforced - ✅ Production uses HTTPS
- [ ] Secure cookies (HttpOnly, Secure, SameSite) - ⚠️ NEEDS VERIFICATION
- [x] Sensitive data not in URLs - ✅ Using POST/body for sensitive data
- [ ] API responses don't leak sensitive info - ⚠️ NEEDS REVIEW

### API Security

**Endpoint Protection:**
- [ ] Authentication required for sensitive endpoints - ⚠️ PRIMARY CONCERN
- [ ] Rate limiting implemented - ⚠️ NOT IMPLEMENTED (risk: DoS)
- [x] CORS properly configured - ✅ Restricted origins
- [x] Request size limits enforced - ✅ Next.js default limits
- [ ] Error messages don't leak system info - ⚠️ NEEDS REVIEW
- [x] Proper HTTP methods used (GET/POST/PUT/DELETE) - ✅ Correct usage

**API Keys & Tokens:**
- [x] API keys rotated regularly - N/A (using session-based auth)
- [x] JWT tokens have expiration - NextAuth handles expiration
- [x] Refresh token strategy secure - NextAuth manages refresh
- [x] Token validation on every request - ✅ Middleware validates

### Frontend Security

**Cross-Site Scripting (XSS):**
- [x] User input sanitized before rendering - React escapes by default
- [x] React escapes content by default (verify) - ✅ Using JSX
- [x] Dangerous HTML avoided (dangerouslySetInnerHTML) - ✅ Not used
- [ ] Content Security Policy (CSP) headers - ⚠️ NOT IMPLEMENTED

**Cross-Site Request Forgery (CSRF):**
- [ ] CSRF tokens on state-changing requests - ⚠️ NOT IMPLEMENTED
- [ ] SameSite cookie attribute set - ⚠️ NEEDS VERIFICATION
- [ ] Origin/Referer header validation - ⚠️ NOT IMPLEMENTED

### Dependency Security

**Third-Party Packages:**
- [ ] Dependencies up to date - ⚠️ NEEDS CHECK (npm audit)
- [ ] No known vulnerabilities (npm audit) - ⚠️ NEEDS CHECK
- [x] Unnecessary packages removed - Recently cleaned up
- [x] Package lock files committed - ✅ package-lock.json in repo
- [x] Source verified for critical packages - ✅ Using official npm packages

---

## 🚨 Vulnerability Assessment

**Known Vulnerabilities:**

1. **CRITICAL - Insecure Direct Object Reference (IDOR)**
   - Location: `/api/personal/expenses/[expenseId]`
   - Issue: Endpoint may not verify expense belongs to authenticated user
   - Impact: User could access/modify any expense by guessing ID
   - Exploit: `GET /api/personal/expenses/expense-123` (from another user)
   - Status: UNCONFIRMED - Needs investigation

2. **HIGH - Missing Authorization Checks**
   - Location: `/api/personal/expenses`, `/api/personal/income`
   - Issue: Endpoints may not filter by user correctly
   - Impact: Data leakage - users seeing other users' data
   - Status: REPORTED BY USER - High priority to verify

3. **MEDIUM - No Rate Limiting**
   - Location: All API endpoints
   - Issue: No rate limiting on any endpoints
   - Impact: DoS attacks possible, brute force attacks
   - Mitigation: Implement rate limiting middleware

4. **MEDIUM - Missing CSRF Protection**
   - Location: All POST/PUT/DELETE endpoints
   - Issue: No CSRF tokens for state-changing requests
   - Impact: CSRF attacks possible
   - Mitigation: Implement CSRF tokens or SameSite cookies

5. **LOW - Weak Password Policy**
   - Location: `/api/auth/register`
   - Issue: Only requires 8 characters, no complexity requirements
   - Impact: Weak passwords possible
   - Mitigation: Enforce complexity (uppercase, numbers, symbols)

**OWASP Top 10 Review:**

1. **Broken Access Control** - ⚠️ PRIMARY CONCERN
   - Personal finance endpoints may allow unauthorized access
   - Need to verify user ID filtering on all queries
   - Need to check business-level permissions

2. **Cryptographic Failures** - ⚠️ MEDIUM RISK
   - Financial data stored in plaintext (not encrypted at rest)
   - Recommendation: Consider encrypting sensitive fields

3. **Injection** - ✅ LOW RISK
   - Using Prisma (parameterized queries)
   - No SQL injection vectors found

4. **Insecure Design** - ⚠️ NEEDS REVIEW
   - Permission model needs review
   - User data isolation strategy unclear

5. **Security Misconfiguration** - ⚠️ MEDIUM RISK
   - CSP headers not configured
   - CORS might be too permissive
   - Error messages might leak info

6. **Vulnerable Components** - ⚠️ NEEDS CHECK
   - Need to run `npm audit`
   - Dependencies not regularly updated

7. **Authentication Failures** - 🟡 MODERATE
   - No account lockout (brute force possible)
   - No MFA (future enhancement)
   - Password policy weak

8. **Data Integrity Failures** - ⚠️ NEEDS REVIEW
   - No CSRF protection
   - No integrity checks on sensitive operations

9. **Logging/Monitoring Failures** - ⚠️ MEDIUM RISK
   - No security event logging
   - No failed login attempt tracking
   - No unauthorized access attempt logging

10. **Server-Side Request Forgery** - ✅ LOW RISK
    - No external request functionality found

---

## 🔐 Secrets Management

**Environment Variables:**
- [x] .env file in .gitignore - ✅ Verified
- [x] No secrets in codebase - ✅ Checked (grep for passwords/keys)
- [x] Production secrets different from dev - ✅ Separate .env files
- [ ] Secret rotation process documented - ⚠️ NOT DOCUMENTED

**API Keys:**
- [x] Third-party API keys secured - ✅ In environment variables
- [x] Database credentials secured - ✅ In DATABASE_URL env var
- [x] OAuth client secrets protected - ✅ NEXTAUTH_SECRET in .env

---

## 📊 Logging & Monitoring

**Audit Logging:**
- [ ] Failed login attempts logged - ⚠️ NOT IMPLEMENTED
- [ ] Sensitive operations logged - ⚠️ NOT IMPLEMENTED
- [ ] User actions auditable - ⚠️ PARTIAL (recent activity feed)
- [ ] Logs don't contain sensitive data - ⚠️ NEEDS REVIEW

**Security Monitoring:**
- [ ] Anomaly detection in place - ⚠️ NOT IMPLEMENTED
- [ ] Alerts for suspicious activity - ⚠️ NOT IMPLEMENTED
- [ ] Error tracking configured - ⚠️ NOT IMPLEMENTED
- [ ] Rate limit violations tracked - ⚠️ NOT APPLICABLE (no rate limits)

---

## 🧪 Security Testing

**Testing Methods:**
- [ ] Static analysis (linters, security scanners) - ⚠️ NEEDS SETUP
- [x] Dependency vulnerability scanning (npm audit) - ⚠️ NEEDS RUN
- [ ] Authentication/authorization tests - ⚠️ NO TESTS EXIST
- [ ] Input validation tests - ⚠️ NO TESTS EXIST
- [ ] Penetration testing (if applicable) - ⚠️ NOT PERFORMED

**Test Cases:**
1. **IDOR Test - Access Other User's Expense**
   - User A creates expense (ID: expense-123)
   - User B tries: `GET /api/personal/expenses/expense-123`
   - Expected: 403 Forbidden
   - Actual: NEEDS TESTING

2. **SQL Injection Attempts**
   - Try: `POST /api/personal/expenses` with `description: "'; DROP TABLE--"`
   - Expected: Sanitized/rejected
   - Actual: ✅ Prisma prevents (parameterized queries)

3. **XSS Injection Attempts**
   - Try: Create expense with `description: "<script>alert('XSS')</script>"`
   - Expected: Escaped in display
   - Actual: ✅ React escapes by default

4. **CSRF Attacks**
   - Try: External form POST to `/api/personal/expenses`
   - Expected: Rejected
   - Actual: ⚠️ LIKELY SUCCEEDS (no CSRF protection)

5. **Unauthorized Access Attempts**
   - Try: Access `/api/personal/expenses` without auth token
   - Expected: 401 Unauthorized
   - Actual: NEEDS TESTING

6. **Privilege Escalation Attempts**
   - Regular user tries to access admin endpoint
   - Expected: 403 Forbidden
   - Actual: ✅ Admin middleware blocks

---

## 🔧 Remediation Plan

**High Priority Fixes (Complete within 24 hours):**

1. **CRITICAL - Fix IDOR in Personal Finance APIs**
   - File: `/api/personal/expenses/[expenseId]/route.ts`
   - Issue: Verify expense belongs to requesting user
   - Fix:
   ```typescript
   // Add user ID check
   const expense = await prisma.personalExpense.findFirst({
     where: {
       id: expenseId,
       userId: session.user.id  // CRITICAL: Add this check
     }
   })
   if (!expense) {
     return NextResponse.json({ error: "Not found" }, { status: 404 })
   }
   ```

2. **CRITICAL - Add User Filtering to List Endpoints**
   - File: `/api/personal/expenses/route.ts`
   - Issue: Ensure queries filter by authenticated user
   - Fix:
   ```typescript
   const expenses = await prisma.personalExpense.findMany({
     where: {
       userId: session.user.id,  // CRITICAL: Add this
       // ... other filters
     }
   })
   ```

3. **HIGH - Audit All Personal Finance Endpoints**
   - Review every endpoint in `/api/personal/**`
   - Verify user ID filtering on ALL queries
   - Check business access controls

**Medium Priority Fixes (Complete within 1 week):**

1. **Implement Rate Limiting**
   - Add middleware to limit requests per IP/user
   - Suggested: 100 req/min per user, 1000 req/hour per IP
   - Library: `express-rate-limit` or custom middleware

2. **Add CSRF Protection**
   - Implement CSRF tokens for state-changing requests
   - OR: Set SameSite=Strict on cookies

3. **Enhance Security Logging**
   - Log failed auth attempts
   - Log unauthorized access attempts
   - Track sensitive operations (delete, bulk updates)

**Best Practice Improvements (Complete within 1 month):**

1. **Strengthen Password Policy**
   - Min 12 characters
   - Require uppercase, lowercase, number, symbol
   - Check against common password list

2. **Add Security Headers**
   - Content-Security-Policy
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security

3. **Implement Account Lockout**
   - Lock account after 5 failed login attempts
   - Unlock after 30 minutes or admin intervention

---

## 📋 Compliance Requirements

**Regulations:**
- [ ] GDPR (if handling EU data) - ⚠️ NEEDS COMPLIANCE REVIEW
  - Right to access - Need export feature
  - Right to erasure - Need delete account feature
  - Data portability - Need export feature
  - Consent management - Need privacy policy

- [ ] CCPA (if handling CA data) - ⚠️ NEEDS COMPLIANCE REVIEW
  - Similar requirements to GDPR

- [ ] HIPAA (if handling health data) - ❌ NOT APPLICABLE
- [ ] PCI DSS (if handling payment data) - ❌ NOT HANDLING PAYMENTS
- [ ] Other: Financial data privacy laws - ⚠️ NEEDS RESEARCH

**Privacy Considerations:**
- [ ] Privacy policy present - ⚠️ NOT FOUND
- [ ] User consent for data collection - ⚠️ NOT IMPLEMENTED
- [ ] Data deletion process - ⚠️ NOT IMPLEMENTED (soft delete exists)
- [ ] Data export functionality - ⚠️ NOT IMPLEMENTED

---

## 📝 Session Notes

<!-- Add any additional context, constraints, or findings -->

**Context:**
- User reported seeing another user's expense in their list
- This is a CRITICAL security issue if confirmed
- Affects trust in the application
- Must be fixed immediately before user data is compromised

**Investigation Priority:**
1. Reproduce the reported issue (critical)
2. Verify IDOR vulnerability exists
3. Audit all personal finance endpoints
4. Check business-level permission model
5. Review user data isolation strategy

**Impact if Vulnerability Confirmed:**
- Users can access other users' financial data
- Users can potentially modify/delete others' data
- Privacy breach - GDPR violation possible
- Loss of user trust
- Potential legal liability

**Testing Approach:**
1. Create two test users (User A, User B)
2. User A creates expense
3. User B tries to access User A's expense by ID
4. User B tries to list expenses (should only see own)
5. Document findings with screenshots/logs

---

## ✅ Start Session

Ready to begin security review. Please:
1. Load all required context documents (backend-api-context.md, database-context.md, code-workflow.md)
2. Review the target scope (personal finance APIs) and security checklist
3. Investigate reported issue:
   - Read `/api/personal/expenses/route.ts` (list endpoint)
   - Read `/api/personal/expenses/[expenseId]/route.ts` (detail endpoint)
   - Check if queries filter by `userId`
   - Verify authorization middleware is present
4. Analyze code for common vulnerabilities (OWASP Top 10):
   - Broken access control (PRIMARY CONCERN)
   - Missing authorization checks
   - IDOR vulnerabilities
5. Check authentication and authorization implementation:
   - Session validation
   - Permission checks
   - User data isolation
6. Review input validation and sanitization:
   - Zod schema validation
   - Output escaping
7. Verify secrets management:
   - Check for hardcoded secrets
   - Verify .env usage
8. Identify high-risk areas requiring immediate attention:
   - IDOR in expense endpoints
   - Missing rate limiting
   - Missing CSRF protection
9. Propose remediation plan with prioritization:
   - Critical: Fix IDOR (within 24 hours)
   - High: Add user filtering (within 24 hours)
   - Medium: Add rate limiting (within 1 week)
   - Low: Strengthen password policy (within 1 month)

**Expected Findings:**
- Likely to find IDOR vulnerability in expense detail endpoint
- Likely to find missing user ID filtering in some queries
- May find inconsistent permission checking
- Will find missing CSRF protection
- Will find no rate limiting

**Immediate Actions if Vulnerability Confirmed:**
1. Fix IDOR vulnerability immediately
2. Add user filtering to all personal finance queries
3. Deploy hotfix to production
4. Notify users if data was compromised
5. Review audit logs for unauthorized access

---
