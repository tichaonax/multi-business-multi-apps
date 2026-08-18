-- MBM-270 Phase 4: link sales (materials sold) to a project — mirrors
-- 20260404000002_link_payments_to_projects for expense_account_payments.

ALTER TABLE "business_orders" ADD COLUMN "project_id" TEXT;

ALTER TABLE "business_orders"
  ADD CONSTRAINT "business_orders_project_id_fkey"
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "idx_business_orders_project_id" ON "business_orders"("project_id");
