-- Migration: Add Performance Indexes for Expense Account System
-- Created: 2025-11-26
-- Purpose: Improve query performance for expense account operations
-- Expected Impact: 10-100x faster queries on large datasets

-- ============================================================================
-- EXPENSE ACCOUNT PAYMENTS INDEXES
-- ============================================================================

-- Index for querying payments by account and status (most common query)
CREATE INDEX IF NOT EXISTS "idx_expense_payments_account_status"
ON "expense_account_payments"("expenseAccountId", "status");

-- Indexes for payee queries (by type)
CREATE INDEX IF NOT EXISTS "idx_expense_payments_employee_status"
ON "expense_account_payments"("payeeEmployeeId", "status")
WHERE "payeeEmployeeId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_expense_payments_user_status"
ON "expense_account_payments"("payeeUserId", "status")
WHERE "payeeUserId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_expense_payments_person_status"
ON "expense_account_payments"("payeePersonId", "status")
WHERE "payeePersonId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_expense_payments_business_status"
ON "expense_account_payments"("payeeBusinessId", "status")
WHERE "payeeBusinessId" IS NOT NULL;

-- Index for date range queries
CREATE INDEX IF NOT EXISTS "idx_expense_payments_payment_date"
ON "expense_account_payments"("paymentDate" DESC);

-- Index for sorting by creation time
CREATE INDEX IF NOT EXISTS "idx_expense_payments_created_at"
ON "expense_account_payments"("createdAt" DESC);

-- Index for category grouping and filtering
CREATE INDEX IF NOT EXISTS "idx_expense_payments_category"
ON "expense_account_payments"("categoryId")
WHERE "categoryId" IS NOT NULL;

-- Composite index for account + date range queries (reporting)
CREATE INDEX IF NOT EXISTS "idx_expense_payments_account_date"
ON "expense_account_payments"("expenseAccountId", "paymentDate" DESC);

-- ============================================================================
-- EXPENSE ACCOUNT DEPOSITS INDEXES
-- ============================================================================

-- Index for querying deposits by account
CREATE INDEX IF NOT EXISTS "idx_expense_deposits_account"
ON "expense_account_deposits"("expenseAccountId");

-- Index for date range queries
CREATE INDEX IF NOT EXISTS "idx_expense_deposits_date"
ON "expense_account_deposits"("depositDate" DESC);

-- Index for filtering by deposit type
CREATE INDEX IF NOT EXISTS "idx_expense_deposits_type"
ON "expense_account_deposits"("sourceType");

-- Composite index for account + date range queries
CREATE INDEX IF NOT EXISTS "idx_expense_deposits_account_date"
ON "expense_account_deposits"("expenseAccountId", "depositDate" DESC);

-- ============================================================================
-- EXPENSE ACCOUNTS INDEXES
-- ============================================================================

-- Index for filtering active/inactive accounts
CREATE INDEX IF NOT EXISTS "idx_expense_accounts_active"
ON "expense_accounts"("isActive");

-- Index for low balance queries (dashboard alerts)
CREATE INDEX IF NOT EXISTS "idx_expense_accounts_balance"
ON "expense_accounts"("balance");

-- Index for sorting by creation date
CREATE INDEX IF NOT EXISTS "idx_expense_accounts_created"
ON "expense_accounts"("createdAt" DESC);

-- Composite index for active + low balance queries
CREATE INDEX IF NOT EXISTS "idx_expense_accounts_active_balance"
ON "expense_accounts"("isActive", "balance")
WHERE "isActive" = true;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify indexes created)
-- ============================================================================

-- List all indexes on expense_account_payments
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'expense_account_payments' ORDER BY indexname;

-- List all indexes on expense_account_deposits
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'expense_account_deposits' ORDER BY indexname;

-- List all indexes on expense_accounts
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'expense_accounts' ORDER BY indexname;

-- ============================================================================
-- PERFORMANCE TESTING QUERIES (Run after migration to test performance)
-- ============================================================================

-- Test 1: Query payments by account (should use idx_expense_payments_account_status)
-- EXPLAIN ANALYZE SELECT * FROM expense_account_payments WHERE "expenseAccountId" = 'acc_xxx' AND status = 'SUBMITTED';

-- Test 2: Query payments by employee payee (should use idx_expense_payments_employee_status)
-- EXPLAIN ANALYZE SELECT * FROM expense_account_payments WHERE "payeeEmployeeId" = 'emp_xxx' AND status = 'SUBMITTED';

-- Test 3: Query payments by date range (should use idx_expense_payments_payment_date)
-- EXPLAIN ANALYZE SELECT * FROM expense_account_payments WHERE "paymentDate" BETWEEN '2024-01-01' AND '2024-12-31';

-- Test 4: Query low balance accounts (should use idx_expense_accounts_active_balance)
-- EXPLAIN ANALYZE SELECT * FROM expense_accounts WHERE "isActive" = true AND balance < 1000;

-- ============================================================================
-- ROLLBACK (If needed)
-- ============================================================================

-- To rollback this migration, run:
-- DROP INDEX IF EXISTS "idx_expense_payments_account_status";
-- DROP INDEX IF EXISTS "idx_expense_payments_employee_status";
-- DROP INDEX IF EXISTS "idx_expense_payments_user_status";
-- DROP INDEX IF EXISTS "idx_expense_payments_person_status";
-- DROP INDEX IF EXISTS "idx_expense_payments_business_status";
-- DROP INDEX IF EXISTS "idx_expense_payments_payment_date";
-- DROP INDEX IF EXISTS "idx_expense_payments_created_at";
-- DROP INDEX IF EXISTS "idx_expense_payments_category";
-- DROP INDEX IF EXISTS "idx_expense_payments_account_date";
-- DROP INDEX IF EXISTS "idx_expense_deposits_account";
-- DROP INDEX IF EXISTS "idx_expense_deposits_date";
-- DROP INDEX IF EXISTS "idx_expense_deposits_type";
-- DROP INDEX IF EXISTS "idx_expense_deposits_account_date";
-- DROP INDEX IF EXISTS "idx_expense_accounts_active";
-- DROP INDEX IF EXISTS "idx_expense_accounts_balance";
-- DROP INDEX IF EXISTS "idx_expense_accounts_created";
-- DROP INDEX IF EXISTS "idx_expense_accounts_active_balance";
