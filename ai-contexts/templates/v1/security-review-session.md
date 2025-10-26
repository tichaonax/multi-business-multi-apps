# Security Review Session Template

> **Template Type:** Security Audit & Vulnerability Assessment
> **Version:** 1.0
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For conducting security reviews, identifying vulnerabilities, and implementing security best practices.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents **IN THE EXACT ORDER LISTED BELOW**.

### Core Contexts (Load in this EXACT order - ONE AT A TIME)

**CRITICAL:** Read these files sequentially. Do not proceed to the next document until you have fully read and understood the previous one.

1. **FIRST:** `ai-contexts/master-context.md` - General principles and conventions
   - ⚠️ Contains critical instruction to read code-workflow.md
   - ⚠️ Defines operating principles
   - ⚠️ Contains mandatory workflow enforcement
   - ⚠️ Defines example adherence requirements

2. **SECOND:** `ai-contexts/code-workflow.md` - Standard workflow and task tracking
   - Contains MANDATORY workflow requirements
   - Requires creating project plan BEFORE any code changes
   - Defines approval checkpoint process

### Security-Relevant Contexts (Load after core contexts)

- `ai-contexts/backend/backend-api-context.md` - API security patterns
- `ai-contexts/backend/database-context.md` - Database security (SQL injection, etc.)
- `ai-contexts/frontend/component-context.md` - Frontend security (XSS, CSRF)

### Optional Contexts

- Domain-specific contexts for the module under review

**How to load:** Use the Read tool to load each relevant context document before beginning security review.

---

## 🔍 Review Scope

<!-- Define what's being reviewed -->

**Ticket:** <!-- e.g., HPP-1234, or NOTKT if no ticket -->

**Review Type:**

- [ ] Authentication System
- [ ] Authorization & Permissions
- [ ] Data Validation & Sanitization
- [ ] API Security
- [ ] Database Security
- [ ] Frontend Security (XSS, CSRF)
- [ ] Secrets Management
- [ ] Third-party Dependencies
- [ ] Full Application Audit

**Target Area:**

**Priority Level:**

- [ ] Critical - Production security issue
- [ ] High - Potential vulnerability
- [ ] Medium - Security improvement
- [ ] Low - Best practice review

---

## 🛡️ Security Checklist

### Authentication & Authorization

**Authentication:**

- [ ] Secure password storage (hashing with salt)
- [ ] Session management secure
- [ ] Token expiration implemented
- [ ] Multi-factor authentication (if applicable)
- [ ] Account lockout on failed attempts
- [ ] Password complexity requirements

**Authorization:**

- [ ] Role-based access control (RBAC) implemented
- [ ] Permission checks on all sensitive endpoints
- [ ] User data isolation (users can't access others' data)
- [ ] Admin-only routes protected
- [ ] API endpoints check user permissions

### Input Validation & Sanitization

**Backend Validation:**

- [ ] All user inputs validated
- [ ] Type checking enforced
- [ ] Length limits applied
- [ ] Format validation (email, phone, etc.)
- [ ] SQL injection prevented (using Prisma/parameterized queries)
- [ ] NoSQL injection prevented

**Frontend Validation:**

- [ ] Client-side validation present (UX)
- [ ] Server-side validation enforced (security)
- [ ] XSS prevention (sanitize outputs)
- [ ] CSRF protection implemented
- [ ] File upload validation (type, size, content)

### Data Security

**Data Storage:**

- [ ] Sensitive data encrypted at rest
- [ ] Passwords hashed (bcrypt, argon2, etc.)
- [ ] API keys/secrets not in code
- [ ] Environment variables used for secrets
- [ ] Database connection strings secured
- [ ] PII data handling compliant

**Data Transmission:**

- [ ] HTTPS enforced
- [ ] Secure cookies (HttpOnly, Secure, SameSite)
- [ ] Sensitive data not in URLs
- [ ] API responses don't leak sensitive info

### API Security

**Endpoint Protection:**

- [ ] Authentication required for sensitive endpoints
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Request size limits enforced
- [ ] Error messages don't leak system info
- [ ] Proper HTTP methods used (GET/POST/PUT/DELETE)

**API Keys & Tokens:**

- [ ] API keys rotated regularly
- [ ] JWT tokens have expiration
- [ ] Refresh token strategy secure
- [ ] Token validation on every request

### Frontend Security

**Cross-Site Scripting (XSS):**

- [ ] User input sanitized before rendering
- [ ] React escapes content by default (verify)
- [ ] Dangerous HTML avoided (dangerouslySetInnerHTML)
- [ ] Content Security Policy (CSP) headers

**Cross-Site Request Forgery (CSRF):**

- [ ] CSRF tokens on state-changing requests
- [ ] SameSite cookie attribute set
- [ ] Origin/Referer header validation

### Dependency Security

**Third-Party Packages:**

- [ ] Dependencies up to date
- [ ] No known vulnerabilities (npm audit)
- [ ] Unnecessary packages removed
- [ ] Package lock files committed
- [ ] Source verified for critical packages

---

## 🚨 Vulnerability Assessment

**Known Vulnerabilities:**

**OWASP Top 10 Review:**

1. **Broken Access Control** -
2. **Cryptographic Failures** -
3. **Injection** -
4. **Insecure Design** -
5. **Security Misconfiguration** -
6. **Vulnerable Components** -
7. **Authentication Failures** -
8. **Data Integrity Failures** -
9. **Logging/Monitoring Failures** -
10. **Server-Side Request Forgery** -

---

## 🔐 Secrets Management

**Environment Variables:**

- [ ] .env file in .gitignore
- [ ] No secrets in codebase
- [ ] Production secrets different from dev
- [ ] Secret rotation process documented

**API Keys:**

- [ ] Third-party API keys secured
- [ ] Database credentials secured
- [ ] OAuth client secrets protected

---

## 📊 Logging & Monitoring

**Audit Logging:**

- [ ] Failed login attempts logged
- [ ] Sensitive operations logged
- [ ] User actions auditable
- [ ] Logs don't contain sensitive data

**Security Monitoring:**

- [ ] Anomaly detection in place
- [ ] Alerts for suspicious activity
- [ ] Error tracking configured
- [ ] Rate limit violations tracked

---

## 🧪 Security Testing

**Testing Methods:**

- [ ] Static analysis (linters, security scanners)
- [ ] Dependency vulnerability scanning (npm audit)
- [ ] Authentication/authorization tests
- [ ] Input validation tests
- [ ] Penetration testing (if applicable)

**Test Cases:**

1. SQL injection attempts
2. XSS injection attempts
3. CSRF attacks
4. Unauthorized access attempts
5. Privilege escalation attempts
6. Brute force attacks

---

## 🔧 Remediation Plan

**High Priority Fixes:**

1.
2.
3.

**Medium Priority Fixes:**

1.
2.
3.

**Best Practice Improvements:**

1.
2.
3.

---

## 📋 Compliance Requirements

**Regulations:**

- [ ] GDPR (if handling EU data)
- [ ] CCPA (if handling CA data)
- [ ] HIPAA (if handling health data)
- [ ] PCI DSS (if handling payment data)
- [ ] Other: **\_**

**Privacy Considerations:**

- [ ] Privacy policy present
- [ ] User consent for data collection
- [ ] Data deletion process
- [ ] Data export functionality

---

## 📝 Session Notes

<!-- Add any additional context, constraints, or findings -->

---

## ✅ Start Session

Ready to begin security review. Please:

1. Review the target scope and security checklist
2. Analyze code for common vulnerabilities (OWASP Top 10)
3. Check authentication and authorization implementation
4. Verify input validation and sanitization
5. Review secrets management and environment variables
6. Identify high-risk areas requiring immediate attention
7. Propose remediation plan with prioritization

---
