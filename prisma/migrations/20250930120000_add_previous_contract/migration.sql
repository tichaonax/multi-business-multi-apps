-- Add previousContractId column to employee_contracts and FK constraint
ALTER TABLE "employee_contracts"
ADD COLUMN
IF NOT EXISTS "previousContractId" TEXT;

-- Add foreign key constraint to reference employee_contracts(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
    FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'employee_contracts'
        AND kcu.column_name = 'previousContractId'
    ) THEN
    ALTER TABLE "employee_contracts"
        ADD CONSTRAINT "employee_contracts_previous_contract_fkey"
        FOREIGN KEY ("previousContractId") REFERENCES "employee_contracts" ("id") ON DELETE SET NULL;
END
IF;
END $$;

-- Optional index for faster lookups
CREATE INDEX
IF NOT EXISTS "idx_employee_contracts_previousContractId" ON "employee_contracts"
("previousContractId");
