# Debugging Session Template

> **Template Type:** Bug Analysis & Resolution
> **Version:** 1.0
> **Last Updated:** October 17, 2025

---

## 🎯 Purpose

For analyzing bugs, identifying causes, and proposing safe fixes.

---

## 📋 Required Context Documents

**IMPORTANT:** Before starting this session, load the following context documents:

### Core Contexts (Always Load)
- `ai-contexts/code-workflow.md` - Standard workflow and task tracking
- `ai-contexts/master-context.md` - General principles and conventions
- `ai-contexts/general-problem-solving-context.md` - Debugging methodology

### Module-Specific Contexts (Load based on bug location)
- `ai-contexts/frontend/component-context.md` - For UI/component bugs
- `ai-contexts/frontend/ui-context.md` - For styling/layout issues
- `ai-contexts/backend/backend-api-context.md` - For API/endpoint bugs
- `ai-contexts/backend/database-context.md` - For database-related issues
- `ai-contexts/testing/unit-testing-context.md` - For test failures

### Optional Contexts
- Domain-specific contexts for the affected module

**How to load:** Use the Read tool to load each relevant context document before beginning debugging.

---

## 🐛 Bug Report

<!-- Document the bug details before starting -->

**Bug Title:**
Dashboard Stats Showing Incorrect Revenue Total After Project Transaction Created

**Description:**
When a user creates a new income transaction for a construction project, the dashboard total revenue stat updates correctly. However, when they create an expense transaction for the same project, the total revenue number incorrectly increases instead of remaining the same (only expenses should increase, not revenue). This happens consistently but only for construction project transactions - personal finance transactions work correctly.

**Steps to Reproduce:**
1. Log in as admin user (admin@business.local)
2. Navigate to dashboard - note current "Total Revenue" value (e.g., $50,000)
3. Go to active construction project (e.g., "Office Building Renovation")
4. Create new expense transaction:
   - Type: Expense
   - Description: "Concrete materials"
   - Amount: $5,000
   - Category: Materials
   - Click "Save"
5. Return to dashboard
6. Observe "Total Revenue" incorrectly shows $55,000 (increased by expense amount)

**Expected Behavior:**
- Creating an expense transaction should NOT increase the "Total Revenue" stat
- Total Revenue should only include income transactions, not expenses
- In this example, Total Revenue should remain $50,000

**Actual Behavior:**
- Total Revenue increases by the expense amount ($5,000)
- Dashboard shows $55,000 instead of $50,000
- The stat is double-counting expenses as both expenses AND revenue

**Environment:**
- OS: Windows 10
- Browser/Runtime: Chrome 120, Firefox 121 (both affected)
- Version: Latest from main branch (commit: 865e36d)
- Database: PostgreSQL 15.4
- Node.js: v20.10.0

**Error Messages/Logs:**
```
No console errors displayed to user.

Server logs show:
[2025-10-18 14:32:15] INFO: Transaction created successfully {
  id: "tx-abc123",
  type: "expense",
  amount: 5000,
  projectId: "proj-456"
}

[2025-10-18 14:32:16] INFO: Dashboard stats calculated {
  totalRevenue: 55000,  // <-- INCORRECT
  activeProjects: 12,
  pendingTasks: 3
}

No error stack traces, operation appears to succeed incorrectly.
```

---

## 🔍 Investigation Notes

<!-- Add debugging observations, hypotheses, or findings -->

**Potential Causes:**
1. **Dashboard stats API query bug**: The `/api/dashboard/stats` endpoint might be using wrong SQL query that doesn't filter by transaction type
2. **Database model confusion**: Possible confusion between `ConstructionTransaction` and `PersonalExpense` models
3. **Frontend calculation error**: Dashboard component might be calculating total incorrectly on client-side
4. **Transaction type field issue**: Transaction `type` field might not be properly stored or retrieved from database
5. **Aggregation logic error**: Prisma aggregation might be summing all amounts regardless of type

**Related Code/Files:**
- `/src/app/api/dashboard/stats/route.ts` - Dashboard stats calculation endpoint (MOST LIKELY)
- `/src/app/dashboard/page.tsx` - Dashboard component that displays stats
- `/prisma/schema.prisma` - Database models for ConstructionTransaction
- `/src/app/api/construction/projects/[projectId]/transactions/route.ts` - Transaction creation endpoint

**Recent Changes:**
- Commit 865e36d: "Fix all API field name mismatches across entire codebase"
  - This changed many field names from snake_case to camelCase
  - May have introduced a bug in field references
- Commit fed50fb: "Fix user update false error message and complete Prisma model name corrections"
  - Updated model names to PascalCase
  - Possible that some queries weren't updated to match new field names

**Debugging Steps Taken:**
1. ✅ Verified issue reproduces consistently (tested 3 times)
2. ✅ Checked browser console - no JavaScript errors
3. ✅ Checked server logs - no error logs, operation completes
4. ✅ Tested with personal finance expense - works correctly (revenue doesn't change)
5. ✅ Tested with construction income transaction - works correctly (revenue increases)
6. ⏳ Need to inspect database to see actual transaction records
7. ⏳ Need to review `/api/dashboard/stats` query logic
8. ⏳ Need to check if transaction `type` field is being saved correctly

**Hypotheses Ranked by Likelihood:**
1. **HIGH**: Dashboard stats query not filtering by transaction type properly
2. **MEDIUM**: Field name mismatch after recent camelCase refactor (e.g., `transactionType` vs `transaction_type`)
3. **LOW**: Frontend calculation error (unlikely since personal finance works)
4. **LOW**: Database constraint issue allowing wrong data

---

## 🧪 Testing Plan

<!-- Define how to verify the fix -->

**Test Cases:**
1. **Verify fix for construction expense**:
   - Create construction expense transaction
   - Check dashboard revenue remains unchanged
   - Verify expense is recorded in database with type='expense'

2. **Verify construction income still works**:
   - Create construction income transaction
   - Check dashboard revenue increases by income amount
   - Verify income is recorded correctly

3. **Verify personal finance unaffected**:
   - Create personal expense
   - Create personal income
   - Check both work correctly (already working)

4. **Test edge cases**:
   - Create multiple transactions in quick succession
   - Test with zero-amount transactions
   - Test with very large amounts

**Regression Tests:**
- Run existing dashboard stats tests (if they exist)
- Add new test case specifically for this scenario
- Test all transaction types across all modules

**Manual Verification:**
```sql
-- Check database records after creating expense
SELECT id, type, amount, description
FROM construction_transactions
WHERE id = 'tx-abc123';

-- Manually calculate expected revenue
SELECT SUM(amount) as total_revenue
FROM construction_transactions
WHERE type = 'income' AND status != 'cancelled';

-- Compare with API response
curl http://localhost:8080/api/dashboard/stats
```

---

## 📝 Session Notes

<!-- Add any additional context or constraints -->

**Additional Context:**
- This bug was discovered by user during normal operations (not found by tests)
- Affects production data accuracy - HIGH PRIORITY
- Users have been creating transactions for 2 weeks, so multiple records may be affected
- Need to verify if bug affects only display or if it corrupts balance calculations

**Impact Assessment:**
- **Severity**: HIGH - Shows incorrect financial data to users
- **Scope**: Affects all construction project transactions
- **Data Integrity**: Unknown - need to check if balances are corrupted or just display bug
- **User Impact**: Multiple users affected, financial reporting inaccurate

**Constraints:**
- Must fix without data migration if possible
- Cannot break existing working features (personal finance)
- Need to verify historical data wasn't corrupted
- Fix should be backward compatible with existing transactions

**Related Issues:**
- No similar issues reported for other transaction types
- Dashboard stats work correctly for other metrics (active projects, team members)
- This appears isolated to revenue calculation for construction transactions

---

## ✅ Start Session

Ready to begin debugging. Please:
1. Load all required context documents (code-workflow.md, backend-api-context.md, database-context.md, general-problem-solving-context.md)
2. Analyze the bug report and formulate hypotheses about the root cause
3. Read `/src/app/api/dashboard/stats/route.ts` to examine revenue calculation logic
4. Check for field name mismatches (snake_case vs camelCase) introduced by recent refactor
5. Inspect database schema for ConstructionTransaction model
6. Propose specific investigation steps to isolate the bug
7. Once root cause identified, suggest potential solutions with trade-offs
8. Recommend fix with minimal risk to existing functionality
9. Create test cases to verify fix and prevent regression

**Expected Debugging Workflow:**
1. Read dashboard stats API code
2. Identify incorrect query/filter logic
3. Propose fix (likely add WHERE clause for type='income')
4. Test fix locally
5. Verify all transaction types still work correctly
6. Add regression test
7. Deploy fix

---
