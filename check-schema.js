const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTableSchema() {
  try {
    console.log('Checking personal_expenses table schema...\n');

    // Use raw query to check table structure
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'personal_expenses'
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log('Columns in personal_expenses table:');
    console.log('=====================================');
    result.forEach((col, index) => {
      console.log(`${index + 1}. ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableSchema();