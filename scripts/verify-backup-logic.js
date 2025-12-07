const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    // Check what businesses exist
    const businesses = await prisma.businesses.findMany({
      where: { isDemo: false },
      select: { id: true, name: true, type: true }
    });

    console.log('=== NON-DEMO BUSINESSES ===');
    console.log('Count:', businesses.length);
    businesses.forEach(b => console.log('  -', b.type, ':', b.name));

    const businessIds = businesses.map(b => b.id);

    // Check total categories
    const totalCategories = await prisma.businessCategories.count();
    console.log('\n=== ALL CATEGORIES IN DATABASE ===');
    console.log('Total:', totalCategories);

    // Check system-wide categories by type
    const systemCategories = await prisma.businessCategories.findMany({
      where: { businessId: null },
      select: { businessType: true }
    });

    const typeCount = {};
    systemCategories.forEach(c => {
      typeCount[c.businessType] = (typeCount[c.businessType] || 0) + 1;
    });

    console.log('\n=== SYSTEM-WIDE CATEGORIES (businessId=null) ===');
    console.log('Total:', systemCategories.length);
    Object.entries(typeCount).sort().forEach(([type, count]) => {
      console.log('  ', type, ':', count);
    });

    // Simulate the backup filter
    const backupCategories = await prisma.businessCategories.findMany({
      where: {
        OR: [
          { businessId: { in: businessIds } },
          { businessId: null }
        ]
      }
    });

    console.log('\n=== CATEGORIES THAT WOULD BE BACKED UP ===');
    console.log('Total:', backupCategories.length);

    const backupByType = {};
    backupCategories.forEach(c => {
      backupByType[c.businessType] = (backupByType[c.businessType] || 0) + 1;
    });

    Object.entries(backupByType).sort().forEach(([type, count]) => {
      console.log('  ', type, ':', count);
    });

    // Check if we're missing anything
    console.log('\n=== VERIFICATION ===');
    if (backupCategories.length === totalCategories) {
      console.log('✅ ALL categories would be backed up!');
    } else {
      console.log('❌ WARNING: Missing', totalCategories - backupCategories.length, 'categories');
    }

  } finally {
    await prisma.$disconnect();
  }
}

test().catch(console.error);
