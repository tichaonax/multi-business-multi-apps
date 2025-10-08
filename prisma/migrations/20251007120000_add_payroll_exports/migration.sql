-- Clean idempotent migration for payroll_exports
-- Create the table if it does not already exist
CREATE TABLE IF NOT EXISTS public.payroll_exports (
    id TEXT PRIMARY KEY,
    payrollPeriodId TEXT NOT NULL,
    businessId TEXT NOT NULL,
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    fileName TEXT NOT NULL,
    fileUrl TEXT NOT NULL,
    fileSize INTEGER NOT NULL,
    format TEXT NOT NULL DEFAULT 'excel',
    includesMonths INTEGER[],
    employeeCount INTEGER NOT NULL,
    totalGrossPay NUMERIC(12,2) NOT NULL,
    totalNetPay NUMERIC(12,2) NOT NULL,
    exportedAt TIMESTAMP(3),
    exportedBy TEXT NOT NULL,
    generationType TEXT NOT NULL,
    notes TEXT
);

-- Add foreign keys if they do not already exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_exports_payrollPeriodId_fkey') THEN
        ALTER TABLE public.payroll_exports
            ADD CONSTRAINT payroll_exports_payrollPeriodId_fkey FOREIGN KEY (payrollPeriodId) REFERENCES public.payroll_periods(id) ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_exports_businessId_fkey') THEN
        ALTER TABLE public.payroll_exports
            ADD CONSTRAINT payroll_exports_businessId_fkey FOREIGN KEY (businessId) REFERENCES public.businesses(id) ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_exports_exportedBy_fkey') THEN
        ALTER TABLE public.payroll_exports
            ADD CONSTRAINT payroll_exports_exportedBy_fkey FOREIGN KEY (exportedBy) REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END$$;
