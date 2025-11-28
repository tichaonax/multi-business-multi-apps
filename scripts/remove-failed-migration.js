const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function removeFailedMigration() {
  try {
    await prisma.$executeRaw`
      DELETE FROM _prisma_migrations
      WHERE migration_name = '20251127140000_seed_complete_clothing_categories'
    `;
    console.log('✅ Removed failed migration record');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

removeFailedMigration();
