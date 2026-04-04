-- Add projectId column to expense_account_payments to link payments to projects
ALTER TABLE "expense_account_payments" ADD COLUMN "project_id" TEXT;

-- Add foreign key constraint with SET NULL on project deletion
ALTER TABLE "expense_account_payments" 
  ADD CONSTRAINT "expense_account_payments_project_id_fkey" 
  FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for efficient project-based lookups
CREATE INDEX "idx_expense_payments_project_id" ON "expense_account_payments"("project_id");
