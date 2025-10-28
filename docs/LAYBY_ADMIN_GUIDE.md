# Layby Management - Administrator Guide

## Table of Contents
1. [Introduction](#introduction)
2. [System Architecture](#system-architecture)
3. [User Management](#user-management)
4. [Business Configuration](#business-configuration)
5. [Automation Management](#automation-management)
6. [Database Administration](#database-administration)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Security Management](#security-management)
9. [Performance Tuning](#performance-tuning)
10. [Backup and Recovery](#backup-and-recovery)
11. [API Management](#api-management)
12. [Troubleshooting](#troubleshooting)

---

## Introduction

### Purpose of This Guide

This guide is for system administrators responsible for:
- Configuring layby system settings
- Managing user permissions
- Monitoring system health
- Troubleshooting issues
- Maintaining database integrity
- Ensuring security compliance

### Administrator Responsibilities

**Daily Tasks:**
- Monitor system health
- Review automation job logs
- Address user support tickets
- Check for errors in logs

**Weekly Tasks:**
- Review system performance metrics
- Analyze usage patterns
- Update business rules if needed
- Backup verification

**Monthly Tasks:**
- Database optimization
- Security audit
- Performance tuning
- Generate administrative reports

### Prerequisites

**Required Knowledge:**
- Database administration (PostgreSQL/Prisma)
- Node.js and Next.js applications
- API concepts and REST principles
- User permission systems
- Server administration

**Required Access:**
- Database admin access
- Server/hosting admin access
- Application admin account
- Logging/monitoring tools

---

## System Architecture

### Technology Stack

**Backend:**
- Next.js 13+ (App Router)
- Prisma ORM
- PostgreSQL database
- API Routes

**Frontend:**
- React 18+
- TypeScript
- TailwindCSS

**Authentication:**
- NextAuth.js
- Session-based authentication
- Permission-based authorization

### Database Schema

**Main Tables:**
```
customer_laybys
├── id (cuid primary key)
├── laybyNumber (unique)
├── businessId (foreign key → businesses)
├── customerId (foreign key → business_customers)
├── status (enum: ACTIVE, COMPLETED, CANCELLED, DEFAULTED, ON_HOLD)
├── totalAmount, depositAmount, balanceRemaining, totalPaid
├── installmentAmount, installmentFrequency, paymentDueDate
├── serviceFee, lateFee, administrationFee, totalFees
├── items (JSON)
├── itemsReleased, itemsReleasedAt, itemsReleasedBy
├── createdAt, updatedAt, completedAt, cancelledAt
└── Relations: business, customer, creator, payments

customer_layby_payments
├── id (cuid primary key)
├── laybyId (foreign key → customer_laybys)
├── receiptNumber (unique)
├── amount, paymentMethod, paymentReference
├── paymentDate, processedBy, notes
├── isRefund, refundedPaymentId
└── Relations: layby, processor
```

**Key Indexes:**
- customer_laybys: businessId, customerId, status
- customer_layby_payments: laybyId

**Recommended Additional Indexes** (see Performance Tuning):
- Composite: (businessId, status, createdAt)
- Composite: (paymentDueDate, status, businessId)
- Composite: (paymentDate DESC, laybyId)

### API Endpoints

**Core APIs:**
```
GET    /api/laybys              # List laybys with filters
POST   /api/laybys              # Create new layby
GET    /api/laybys/[id]         # Get single layby
PUT    /api/laybys/[id]         # Update layby
POST   /api/laybys/[id]/payments         # Record payment
POST   /api/laybys/[id]/payments/[pid]/refund  # Refund payment
POST   /api/laybys/[id]/complete        # Complete layby
POST   /api/laybys/[id]/cancel          # Cancel layby
POST   /api/laybys/[id]/hold            # Put on hold
POST   /api/laybys/[id]/reactivate      # Reactivate
GET    /api/laybys/automation   # Automation status
POST   /api/laybys/automation/run       # Trigger automation
```

**Authentication:**
- All endpoints require authentication
- User-id header required (x-user-id)
- Business membership validated
- Permission checks enforced

### File Structure

```
src/
├── app/
│   ├── api/
│   │   └── laybys/             # API route handlers
│   └── business/
│       └── laybys/             # Frontend pages
├── components/
│   └── laybys/                 # React components
├── lib/
│   └── layby/                  # Business logic
│       ├── business-rules.ts   # Rule definitions
│       ├── automation.ts       # Automation tasks
│       ├── notifications.ts    # Notification templates
│       ├── scheduler.ts        # Job scheduler
│       ├── inventory-integration.ts
│       ├── order-integration.ts
│       └── analytics.ts
└── types/
    └── layby.ts                # TypeScript types
```

---

## User Management

### Permission System

**Permission: `canManageLaybys`**

Users need this permission to:
- View laybys page
- Create laybys
- Record payments
- Complete/cancel laybys
- Access automation page

**Permission Sources:**
1. Direct user permission (`Users.canManageLaybys`)
2. Inherited from role (`Roles.canManageLaybys`)

### Granting Layby Permission

**Via User Account:**
1. Navigate to User Management
2. Select user
3. Edit permissions
4. Enable `canManageLaybys`
5. Save changes

**Via Role:**
1. Navigate to Role Management
2. Select role (e.g., "Store Manager")
3. Edit permissions
4. Enable `canManageLaybys`
5. Save changes
6. All users with this role inherit permission

### Business Membership

**Important**: Permission alone is not enough. Users must also be:
1. Members of the business
2. Have active status

**Verify Membership:**
```sql
SELECT u.name, u.canManageLaybys, bu.businessId
FROM users u
JOIN business_users bu ON u.id = bu.userId
WHERE u.id = '[user-id]' AND bu.businessId = '[business-id]'
```

### Customer Layby Enablement

Before customers can use layby:

**Enable on Customer Account:**
1. Navigate to Customer Management
2. Select customer
3. Edit customer details
4. Enable `allowLayby` checkbox
5. Save changes

**Bulk Enable:**
```sql
-- Enable layby for all active customers in a business
UPDATE business_customers
SET "allowLayby" = true
WHERE "businessId" = '[business-id]' AND "isActive" = true
```

### Audit Trail

**Track User Actions:**
- All laybys record `createdBy` (user ID)
- All payments record `processedBy` (user ID)
- Item releases record `itemsReleasedBy` (user ID)

**View Audit Trail:**
```sql
-- Find all laybys created by a user
SELECT * FROM customer_laybys WHERE "createdBy" = '[user-id]'

-- Find all payments processed by a user
SELECT * FROM customer_layby_payments WHERE "processedBy" = '[user-id]'
```

---

## Business Configuration

### Business Rules

Each business type has specific rules. Rules are defined in:
`src/lib/layby/business-rules.ts`

**Rule Components:**
1. **Deposit Rules**: min%, max%, default%
2. **Installment Frequency**: Allowed options
3. **Duration**: Maximum days
4. **Fees**: Service%, Late$, Admin$, Cancellation%
5. **Policies**: Inventory, refunds, approval
6. **Automation**: Auto-complete, reminders, defaults
7. **Validation**: Min/max items, min/max amounts

### Viewing Business Rules

**For Users:**
- Navigate to `/business/laybys/rules`
- View-only, no editing

**For Admins:**
- Edit `src/lib/layby/business-rules.ts`
- Modify rule definitions
- Deploy changes

### Modifying Business Rules

**Example: Change Clothing Store Deposit Minimum**

1. Open `src/lib/layby/business-rules.ts`
2. Find `clothingBusinessRules`
3. Modify:
```typescript
depositPercent: {
  min: 20, // Change from 20 to 25
  max: 80,
  default: 20 // Update default if needed
}
```
4. Save file
5. Test changes in development
6. Deploy to production

**⚠️ Warning**: Changing rules affects:
- New laybys created after change
- Existing laybys use original rules
- Validation logic updates immediately

### Default Business Rules

If business type not found, system uses default rules:

```typescript
export const defaultBusinessRules: LaybyBusinessRule = {
  businessType: 'default',
  depositPercent: { min: 20, max: 80, default: 30 },
  installmentFrequency: {
    allowed: ['WEEKLY', 'FORTNIGHTLY', 'MONTHLY'],
    default: 'MONTHLY'
  },
  maxDurationDays: 90,
  fees: {
    serviceFeePercent: 0,
    lateFeeAmount: 5.00,
    administrationFeeAmount: 0,
    cancellationFeePercent: 10
  },
  // ... more rules
}
```

### Business Type Mapping

Business types supported:
- `clothing`
- `hardware`
- `grocery`
- `restaurant`
- `construction`
- `default` (fallback)

**Verify Business Type:**
```sql
SELECT id, name, type FROM businesses WHERE id = '[business-id]'
```

---

## Automation Management

### Automation Overview

Four automated tasks:
1. **Payment Reminders**: Send notifications before/on due date
2. **Overdue Notifications**: Alert customers with overdue payments
3. **Late Fee Application**: Apply fees to overdue laybys
4. **Default Processing**: Mark laybys as defaulted after threshold

### Scheduling Automation

**Recommended Schedule:**
- **Frequency**: Daily at 6:00 AM
- **Method**: Cron job or scheduled task

**Setup Cron (Linux):**
```bash
# Edit crontab
crontab -e

# Add line (runs daily at 6am)
0 6 * * * curl -X POST https://yourdomain.com/api/laybys/automation/run
```

**Setup Windows Task Scheduler:**
1. Open Task Scheduler
2. Create new task
3. Trigger: Daily at 6:00 AM
4. Action: Start program
5. Program: `curl`
6. Arguments: `-X POST https://yourdomain.com/api/laybys/automation/run`

**Setup Node Cron (In Application):**
```typescript
import cron from 'node-cron'
import { runScheduledJob } from '@/lib/layby/scheduler'

// Run daily at 6am
cron.schedule('0 6 * * *', async () => {
  console.log('Running layby automation...')
  await runScheduledJob()
})
```

### Manual Automation Trigger

**Via UI:**
1. Navigate to `/business/laybys/automation`
2. Click **"Run Now"** button
3. Wait for completion
4. View results

**Via API:**
```bash
curl -X POST https://yourdomain.com/api/laybys/automation/run \
  -H "Content-Type: application/json" \
  -H "x-user-id: [admin-user-id]"
```

**Via Database Script:**
```typescript
import { runScheduledJob } from '@/lib/layby/scheduler'

async function manualRun() {
  const result = await runScheduledJob()
  console.log('Automation complete:', result)
}

manualRun()
```

### Monitoring Automation

**Job History:**
- View at `/business/laybys/automation`
- Shows last 50 job runs
- Displays: job ID, start/end time, duration, processed count, errors

**Check Last Run:**
```typescript
import { getJobHistory } from '@/lib/layby/scheduler'

const history = getJobHistory()
const lastJob = history[history.length - 1]
console.log('Last run:', lastJob)
```

**Logs:**
```bash
# Check application logs for automation entries
grep "Automation" /var/log/application.log

# Check for errors
grep "ERROR.*layby" /var/log/application.log
```

### Automation Configuration

**Payment Reminders:**
- Trigger: 3 days before, 1 day before, on due date
- Channel: SMS + Email (if available)
- Skipped if already sent at that interval

**Late Fees:**
- Trigger: 1 day after due date (configurable per business type)
- Amount: Based on business rules
- Only applied once per overdue period

**Default Processing:**
- Trigger: After X missed payments (1-2 based on business type)
- Action: Change status to DEFAULTED
- Notification sent
- Inventory released

**Customize Settings:**
Edit `src/lib/layby/automation.ts` and business rule definitions.

---

## Database Administration

### Database Maintenance

**Weekly Tasks:**

**1. Vacuum Database:**
```sql
-- Reclaim space and update statistics
VACUUM ANALYZE customer_laybys;
VACUUM ANALYZE customer_layby_payments;
```

**2. Reindex:**
```sql
-- Rebuild indexes for performance
REINDEX TABLE customer_laybys;
REINDEX TABLE customer_layby_payments;
```

**3. Check Table Sizes:**
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename IN ('customer_laybys', 'customer_layby_payments')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Data Integrity Checks

**Verify Balance Calculations:**
```sql
-- Find laybys with incorrect balance calculations
SELECT
  id,
  "laybyNumber",
  "totalAmount",
  "totalPaid",
  "balanceRemaining",
  ("totalAmount" + "totalFees" - "totalPaid") AS calculated_balance
FROM customer_laybys
WHERE ABS("balanceRemaining" - ("totalAmount" + "totalFees" - "totalPaid")) > 0.01
  AND status = 'ACTIVE';
```

**Verify Completed Laybys:**
```sql
-- Find completed laybys with remaining balance
SELECT id, "laybyNumber", "balanceRemaining", status
FROM customer_laybys
WHERE status = 'COMPLETED' AND "balanceRemaining" > 0;
```

**Verify Payment Totals:**
```sql
-- Compare layby totalPaid with sum of payments
SELECT
  l.id,
  l."laybyNumber",
  l."totalPaid" AS layby_total,
  COALESCE(SUM(p.amount), 0) AS payments_sum,
  l."totalPaid" - COALESCE(SUM(p.amount), 0) AS difference
FROM customer_laybys l
LEFT JOIN customer_layby_payments p ON l.id = p."laybyId"
GROUP BY l.id, l."laybyNumber", l."totalPaid"
HAVING ABS(l."totalPaid" - COALESCE(SUM(p.amount), 0)) > 0.01;
```

### Database Migrations

**Apply Migration:**
```bash
# Development
npx prisma migrate dev --name migration_description

# Production
npx prisma migrate deploy
```

**Check Migration Status:**
```bash
npx prisma migrate status
```

**Rollback (if needed):**
```bash
# Manually revert in database
# No built-in rollback in Prisma Migrate

# Or restore from backup
```

### Data Cleanup

**Archive Old Completed Laybys:**
```sql
-- Move laybys completed > 2 years ago to archive table
INSERT INTO customer_laybys_archive
SELECT * FROM customer_laybys
WHERE status = 'COMPLETED'
  AND "completedAt" < NOW() - INTERVAL '2 years';

-- Delete from main table (optional, not recommended)
-- DELETE FROM customer_laybys WHERE ...
```

**Remove Test Data:**
```sql
-- Remove laybys created in development/testing
DELETE FROM customer_laybys
WHERE "laybyNumber" LIKE 'LAY-TEST%';
```

---

## Monitoring and Maintenance

### Application Monitoring

**Key Metrics to Monitor:**
1. API response times
2. Error rates
3. Database query performance
4. Active layby count
5. Daily payment volume
6. Automation job success rate

**Health Check Endpoint (if available):**
```bash
curl https://yourdomain.com/api/health
```

### Log Monitoring

**Application Logs:**
```bash
# Check for errors
grep "ERROR" /var/log/application.log | tail -50

# Check layby operations
grep "layby" /var/log/application.log | tail -50

# Check automation runs
grep "Automation" /var/log/application.log | tail -50
```

**Database Logs:**
```bash
# PostgreSQL logs
tail -f /var/log/postgresql/postgresql.log

# Filter for slow queries
grep "duration:" /var/log/postgresql/postgresql.log | grep "statement:"
```

### Performance Monitoring

**Slow Query Detection:**
```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = '1000'; -- Log queries > 1 second
SELECT pg_reload_conf();

-- View slow queries
SELECT * FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Database Connection Monitoring:**
```sql
-- View active connections
SELECT count(*) FROM pg_stat_activity;

-- View connections by state
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
```

### Alerts Setup

**Email Alerts for:**
- Automation job failures
- Database connection errors
- API endpoint errors > threshold
- Disk space < 20%
- Memory usage > 80%

**Example Alert Script:**
```bash
#!/bin/bash
# Check last automation run
ERRORS=$(curl -s https://yourdomain.com/api/laybys/automation/status | jq '.errors')

if [ "$ERRORS" -gt 0 ]; then
  echo "Layby automation errors detected" | mail -s "Alert: Layby Automation" admin@yourdomain.com
fi
```

---

## Security Management

### Access Control

**Principle of Least Privilege:**
- Grant only necessary permissions
- Review permissions quarterly
- Remove access for terminated employees immediately

**Permission Levels:**
1. **Read-Only**: View laybys only
2. **Standard User**: Create, view, record payments
3. **Manager**: All above + cancel, complete
4. **Admin**: All above + configuration, automation

### Data Protection

**Sensitive Data:**
- Customer personal information
- Payment details
- Transaction records

**Protection Measures:**
- Database encryption at rest
- SSL/TLS for data in transit
- Secure password policies
- Session timeouts

### Audit Logging

**What to Log:**
- User logins
- Permission changes
- Layby creation
- Payment recording
- Cancellations
- Configuration changes

**Log Review:**
```sql
-- Recent layby creations
SELECT "createdBy", COUNT(*) AS count
FROM customer_laybys
WHERE "createdAt" > NOW() - INTERVAL '7 days'
GROUP BY "createdBy"
ORDER BY count DESC;

-- Recent payments by user
SELECT "processedBy", COUNT(*) AS count, SUM(amount) AS total
FROM customer_layby_payments
WHERE "paymentDate" > NOW() - INTERVAL '7 days'
GROUP BY "processedBy"
ORDER BY total DESC;
```

### Security Best Practices

1. **Regular Updates**: Keep dependencies updated
2. **Password Policy**: Enforce strong passwords
3. **Two-Factor Authentication**: Enable if available
4. **IP Whitelisting**: Restrict admin access
5. **Regular Audits**: Review access logs monthly
6. **Backup Encryption**: Encrypt all backups
7. **Incident Response Plan**: Document procedures

---

## Performance Tuning

### Database Optimization

**Add Recommended Indexes:**
```sql
-- Composite index for common queries
CREATE INDEX idx_laybys_business_status_date
ON customer_laybys("businessId", status, "createdAt" DESC);

-- Index for due date queries
CREATE INDEX idx_laybys_payment_due
ON customer_laybys("paymentDueDate", status, "businessId")
WHERE status = 'ACTIVE';

-- Index for payment date queries
CREATE INDEX idx_payments_date_layby
ON customer_layby_payments("paymentDate" DESC, "laybyId");
```

**Query Optimization:**
```sql
-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE
SELECT * FROM customer_laybys
WHERE "businessId" = '[business-id]' AND status = 'ACTIVE'
ORDER BY "createdAt" DESC
LIMIT 50;
```

### Caching Strategy

**Implement Redis Caching:**
```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

// Cache analytics for 15 minutes
async function getLaybyAnalytics(businessId: string) {
  const cacheKey = `analytics:layby:${businessId}`

  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  const analytics = await computeAnalytics(businessId)
  await redis.setex(cacheKey, 900, JSON.stringify(analytics))

  return analytics
}
```

**Cache Invalidation:**
- Invalidate analytics cache when layby created/updated
- Invalidate business rules cache when rules updated
- Use cache TTL appropriately (15 min - 1 hour)

### API Rate Limiting

**Protect Expensive Endpoints:**
```typescript
import rateLimit from 'express-rate-limit'

const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests, please try again later'
})

// Apply to analytics endpoint
app.use('/api/laybys/analytics', analyticsLimiter)
```

### Frontend Optimization

**Implement Pagination:**
- Limit list views to 50 items per page
- Use cursor-based pagination for large datasets
- Load more on demand

**Lazy Loading:**
- Load payment history on demand
- Defer loading of analytics
- Use React.lazy() for heavy components

---

## Backup and Recovery

### Backup Strategy

**Full Database Backup (Daily):**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/database"

pg_dump -U postgres -d yourdatabase -F c -f "$BACKUP_DIR/layby_backup_$DATE.dump"

# Verify backup
pg_restore --list "$BACKUP_DIR/layby_backup_$DATE.dump" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Backup successful: $DATE"
else
  echo "Backup verification failed!" | mail -s "Backup Error" admin@domain.com
fi

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "layby_backup_*.dump" -mtime +30 -delete
```

**Incremental Backup (Hourly):**
```bash
# WAL archiving for point-in-time recovery
archive_mode = on
archive_command = 'cp %p /backups/wal/%f'
```

**Backup Verification:**
```bash
# Test restore to separate database
createdb test_restore
pg_restore -U postgres -d test_restore /backups/database/layby_backup_latest.dump

# Verify data
psql -U postgres -d test_restore -c "SELECT COUNT(*) FROM customer_laybys;"

# Cleanup
dropdb test_restore
```

### Disaster Recovery

**Recovery Time Objective (RTO):** 4 hours
**Recovery Point Objective (RPO):** 1 hour

**Recovery Procedure:**

**1. Assess Damage:**
- Determine extent of data loss
- Identify last known good backup
- Calculate data loss window

**2. Restore Database:**
```bash
# Stop application
systemctl stop application

# Drop damaged database (if needed)
dropdb yourdatabase

# Create new database
createdb yourdatabase

# Restore from backup
pg_restore -U postgres -d yourdatabase /backups/database/layby_backup_YYYYMMDD.dump

# Apply WAL logs (if available)
# For point-in-time recovery
```

**3. Verify Data:**
```sql
-- Check record counts
SELECT COUNT(*) FROM customer_laybys;
SELECT COUNT(*) FROM customer_layby_payments;

-- Check most recent records
SELECT MAX("createdAt") FROM customer_laybys;
SELECT MAX("paymentDate") FROM customer_layby_payments;
```

**4. Restart Application:**
```bash
systemctl start application

# Verify application starts
curl https://yourdomain.com/api/health
```

**5. Communicate:**
- Notify users of restoration
- Explain data loss window (if any)
- Provide alternative procedures for gap

### Backup Storage

**Storage Locations:**
1. **Primary**: Local disk (fast access)
2. **Secondary**: Network storage (redundancy)
3. **Tertiary**: Cloud storage (disaster recovery)

**Encryption:**
```bash
# Encrypt backup
gpg --encrypt --recipient admin@domain.com layby_backup.dump

# Decrypt for restore
gpg --decrypt layby_backup.dump.gpg > layby_backup.dump
```

---

## API Management

### API Authentication

All layby API endpoints require:
1. **Session Authentication**: Valid user session
2. **User ID Header**: `x-user-id` header with valid user ID
3. **Permission Check**: User has `canManageLaybys` permission
4. **Business Membership**: User is member of business

**Example API Call:**
```bash
curl -X GET "https://yourdomain.com/api/laybys?businessId=123" \
  -H "x-user-id: user-abc-123" \
  -H "Cookie: next-auth.session-token=..."
```

### API Rate Limits

**Default Limits:**
- Standard endpoints: 100 requests/minute
- Analytics endpoints: 10 requests/minute
- Automation trigger: 1 request/5 minutes

**Override Limits (if needed):**
Edit rate limit configuration in API middleware.

### API Monitoring

**Track Metrics:**
- Request count by endpoint
- Response times (p50, p95, p99)
- Error rates
- Most active users

**Example Monitoring Query:**
```sql
-- If logging API calls to database
SELECT
  endpoint,
  COUNT(*) AS requests,
  AVG(duration_ms) AS avg_duration,
  MAX(duration_ms) AS max_duration
FROM api_logs
WHERE endpoint LIKE '%/api/laybys%'
  AND timestamp > NOW() - INTERVAL '1 day'
GROUP BY endpoint
ORDER BY requests DESC;
```

### API Documentation

**Generate API Docs:**
- Use tools like Swagger/OpenAPI
- Document all endpoints, parameters, responses
- Include example requests/responses
- Keep updated with code changes

---

## Troubleshooting

### Common Issues

#### Issue: Users Cannot Access Layby Pages

**Symptoms:**
- "You don't have permission" message
- Page doesn't load

**Diagnosis:**
1. Check user has `canManageLaybys` permission
2. Check user is member of business
3. Check session is valid

**Resolution:**
```sql
-- Grant permission
UPDATE users SET "canManageLaybys" = true WHERE id = '[user-id]';

-- Verify business membership
SELECT * FROM business_users WHERE "userId" = '[user-id]' AND "businessId" = '[business-id]';
```

#### Issue: Layby Balance Incorrect

**Symptoms:**
- Balance doesn't match payments
- Cannot complete layby

**Diagnosis:**
```sql
-- Check balance calculation
SELECT
  id,
  "totalAmount",
  "totalFees",
  "totalPaid",
  "balanceRemaining",
  ("totalAmount" + "totalFees" - "totalPaid") AS calculated
FROM customer_laybys
WHERE id = '[layby-id]';
```

**Resolution:**
```sql
-- Recalculate balance
UPDATE customer_laybys
SET "balanceRemaining" = ("totalAmount" + "totalFees" - "totalPaid")
WHERE id = '[layby-id]';
```

#### Issue: Automation Not Running

**Symptoms:**
- No payment reminders sent
- Late fees not applied
- Job history empty

**Diagnosis:**
1. Check cron job is configured
2. Check job logs for errors
3. Verify automation endpoint accessible

**Resolution:**
```bash
# Test automation manually
curl -X POST https://yourdomain.com/api/laybys/automation/run \
  -H "x-user-id: admin-user-id"

# Check logs
tail -f /var/log/application.log | grep Automation

# Verify cron job
crontab -l | grep automation
```

#### Issue: Cannot Create Order on Completion

**Symptoms:**
- Layby completes but no order created
- Error message about order creation

**Diagnosis:**
1. Check order integration enabled
2. Check order number generation
3. Check product/inventory availability

**Resolution:**
- Review `src/lib/layby/order-integration.ts`
- Check logs for specific error
- Verify BusinessOrders table accessible

### Emergency Procedures

**System Down:**
1. Check application logs
2. Check database connectivity
3. Restart application
4. Restore from backup if needed

**Data Corruption:**
1. Stop writes immediately
2. Backup current state
3. Assess extent of corruption
4. Restore from last good backup
5. Replay transactions if possible

**Security Breach:**
1. Disconnect affected systems
2. Change all passwords
3. Review audit logs
4. Patch vulnerability
5. Restore from clean backup
6. Notify affected users

---

## Appendix

### Quick Reference Commands

**Database:**
```bash
# Connect to database
psql -U postgres -d yourdatabase

# Backup
pg_dump -U postgres -d yourdatabase -F c -f backup.dump

# Restore
pg_restore -U postgres -d yourdatabase backup.dump
```

**Application:**
```bash
# Start application
npm run start

# Build application
npm run build

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

**Monitoring:**
```bash
# Check application status
systemctl status application

# View logs
tail -f /var/log/application.log

# Check disk space
df -h

# Check memory
free -m
```

### Contact Information

**Emergency Contacts:**
- Technical Lead: [name] - [phone]
- Database Admin: [name] - [phone]
- On-Call: [rotation schedule]

**Vendor Support:**
- Hosting Provider: [contact]
- Database Support: [contact]
- Application Support: [contact]

---

**Document Version**: 1.0
**Last Updated**: 2025-10-27
**For System Version**: 1.0
