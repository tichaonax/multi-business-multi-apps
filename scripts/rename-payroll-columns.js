const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function renameColumns() {
  try {
    console.log('Renaming payroll_entries columns to camelCase...');

    // Rename columns in payroll_entries table
    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "absence_days" TO "absenceDays"');
    console.log('✓ Renamed absence_days → absenceDays');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "date_of_birth" TO "dateOfBirth"');
    console.log('✓ Renamed date_of_birth → dateOfBirth');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "hire_date" TO "hireDate"');
    console.log('✓ Renamed hire_date → hireDate');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "leave_days" TO "leaveDays"');
    console.log('✓ Renamed leave_days → leaveDays');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "processed_by" TO "processedBy"');
    console.log('✓ Renamed processed_by → processedBy');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "sick_days" TO "sickDays"');
    console.log('✓ Renamed sick_days → sickDays');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "termination_date" TO "terminationDate"');
    console.log('✓ Renamed termination_date → terminationDate');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "work_days" TO "workDays"');
    console.log('✓ Renamed work_days → workDays');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "absence_fraction" TO "absenceFraction"');
    console.log('✓ Renamed absence_fraction → absenceFraction');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "contract_id" TO "contractId"');
    console.log('✓ Renamed contract_id → contractId');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "contract_number" TO "contractNumber"');
    console.log('✓ Renamed contract_number → contractNumber');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "contract_start_date" TO "contractStartDate"');
    console.log('✓ Renamed contract_start_date → contractStartDate');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "contract_end_date" TO "contractEndDate"');
    console.log('✓ Renamed contract_end_date → contractEndDate');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_entries" RENAME COLUMN "is_prorated" TO "isProrated"');
    console.log('✓ Renamed is_prorated → isProrated');

    console.log('\nRenaming payroll_adjustments columns to camelCase...');

    // Rename columns in payroll_adjustments table
    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_adjustments" RENAME COLUMN "approved_at" TO "approvedAt"');
    console.log('✓ Renamed approved_at → approvedAt');

    await prisma.$executeRawUnsafe('ALTER TABLE "payroll_adjustments" RENAME COLUMN "approved_by" TO "approvedBy"');
    console.log('✓ Renamed approved_by → approvedBy');

    console.log('\n✅ All columns successfully renamed to camelCase!');
  } catch (error) {
    console.error('❌ Error renaming columns:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

renameColumns();
