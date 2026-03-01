import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAndReseed() {
  try {
    console.log('🗑️  Deleting seeded expense category data (user-created records preserved)...\n');

    // Warn if user-created categories exist — they will be kept
    const userCreatedCount = await prisma.expenseCategories.count({ where: { isUserCreated: true } });
    if (userCreatedCount > 0) {
      console.log(`ℹ️  ${userCreatedCount} user-created categories found — they will NOT be deleted.\n`);
    }

    // Delete only seeded (non-user-created) records in reverse dependency order
    await prisma.expenseSubcategories.deleteMany({ where: { isUserCreated: false } });
    console.log('✅ Deleted seeded subcategories');

    await prisma.expenseCategories.deleteMany({ where: { isUserCreated: false } });
    console.log('✅ Deleted seeded categories');

    // Domains are always system-level — safe to delete all
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
