-- AlterTable: Add createdBy column to business_orders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_orders' AND column_name = 'createdBy'
  ) THEN
    ALTER TABLE "business_orders" ADD COLUMN "createdBy" TEXT;
  END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'business_orders_createdBy_fkey'
  ) THEN
    ALTER TABLE "business_orders"
      ADD CONSTRAINT "business_orders_createdBy_fkey"
      FOREIGN KEY ("createdBy") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateIndex (idempotent)
CREATE INDEX IF NOT EXISTS "business_orders_createdBy_idx" ON "business_orders"("createdBy");

-- Backfill strategy 1: Match via employeeId → employees.userId
UPDATE "business_orders" bo
SET "createdBy" = e."userId"
FROM "employees" e
WHERE bo."employeeId" = e."id"
  AND bo."createdBy" IS NULL
  AND e."userId" IS NOT NULL;

-- Backfill strategy 2: Match via attributes.employeeName → users.name
-- Many orders have no employeeId but store the salesperson name in JSON attributes
UPDATE "business_orders" bo
SET "createdBy" = u."id"
FROM "users" u
WHERE bo."createdBy" IS NULL
  AND bo."attributes" IS NOT NULL
  AND bo."attributes"->>'employeeName' IS NOT NULL
  AND bo."attributes"->>'employeeName' = u."name";
