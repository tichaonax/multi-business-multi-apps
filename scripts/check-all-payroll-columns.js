const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'payroll_entries'
      ORDER BY column_name
    `;

    console.log(`Total columns in payroll_entries: ${columns.length}\n`);

    const contractCols = columns.filter(c => c.column_name.includes('contract') || c.column_name.includes('prorated'));
    console.log('Contract and proration columns:');
    contractCols.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type})`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkColumns();
