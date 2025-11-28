const { PrismaClient } = require('@prisma/client');

async function checkMigrations() {
  const prisma = new PrismaClient();

  try {
    const migrations = await prisma.$queryRaw`SELECT migration_name FROM _prisma_migrations ORDER BY migration_name`;
    console.log('Applied migrations:', migrations.map(m => m.migration_name));

    // Also check if the column exists
    const columns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'inter_business_loans' AND column_name = 'lender_person_id'`;
    console.log('lender_person_id column exists:', columns.length > 0);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigrations();