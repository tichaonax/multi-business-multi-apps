import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAndReseed() {
  try {
    console.log('🗑️  Deleting existing expense category data...\n');

    // Delete in reverse order of dependencies
    await prisma.expenseSubcategories.deleteMany({});
    console.log('✅ Deleted all subcategories');

    await prisma.expenseCategories.deleteMany({});
    console.log('✅ Deleted all categories');

    await prisma.expenseDomains.deleteMany({});
    console.log('✅ Deleted all domains');

    console.log('\n✅ Database cleared! Now run the seed script:\n');
    console.log('   npx tsx src/lib/seed-data/expense-categories-seed.ts\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetAndReseed();
