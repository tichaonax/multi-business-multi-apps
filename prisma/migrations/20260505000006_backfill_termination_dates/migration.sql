-- Backfill terminationDate for employees who are terminated but have no date recorded.
-- Uses updatedAt as the best available proxy — the record was last modified when they were terminated.
-- IDEMPOTENT: WHERE clause limits to only NULL rows.

UPDATE employees
SET "terminationDate" = "updatedAt"
WHERE "employmentStatus" = 'terminated'
  AND "terminationDate" IS NULL;
