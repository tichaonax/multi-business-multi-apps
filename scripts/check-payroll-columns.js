const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkColumns() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'payroll_entries'
      AND column_name LIKE '%contract%'
      ORDER BY column_name
    `;

    console.log('Contract-related columns in payroll_entries table:');
    if (columns.length === 0) {
      console.log('❌ NO contract columns found!');
    } else {
      columns.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

checkColumns();
