const { PrismaClient } = require('@prisma/client');

(async () => {
  const p = new PrismaClient();
  try {
    console.log('Creating payroll_exports table (if not exists)...');
    await p.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS public.payroll_exports (
        id TEXT NOT NULL,
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
        notes TEXT,
        CONSTRAINT payroll_exports_pkey PRIMARY KEY (id)
      );
    `);

    // Add FKs (ignore if they already exist)
    const fks = [
      `ALTER TABLE public.payroll_exports ADD CONSTRAINT payroll_exports_payrollPeriodId_fkey FOREIGN KEY (payrollPeriodId) REFERENCES public.payroll_periods(id) ON DELETE RESTRICT ON UPDATE CASCADE;`,
      `ALTER TABLE public.payroll_exports ADD CONSTRAINT payroll_exports_businessId_fkey FOREIGN KEY (businessId) REFERENCES public.businesses(id) ON DELETE RESTRICT ON UPDATE CASCADE;`,
      `ALTER TABLE public.payroll_exports ADD CONSTRAINT payroll_exports_exportedBy_fkey FOREIGN KEY (exportedBy) REFERENCES public.users(id) ON DELETE RESTRICT ON UPDATE CASCADE;`,
    ];

    for (const sql of fks) {
      try {
        await p.$executeRawUnsafe(sql);
      } catch (e) {
        // If constraint already exists or other benign error, log and continue
        console.warn('FK creation skipped or failed:', e.message || e);
      }
    }

    console.log('Done.');
  } catch (err) {
    console.error('Failed to create table:', err);
  } finally {
    await p.$disconnect();
  }
})();
