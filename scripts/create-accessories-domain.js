const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createAccessoriesDomain() {
  console.log('=== CREATING ACCESSORIES DOMAIN ===\n');

  const accessoriesDomain = {
    id: 'domain_clothing_accessories',
    name: 'Accessories',
    emoji: '👔',
    description: 'Fashion accessories, bags, and jewelry',
    businessType: 'clothing',
    isActive: true,
    isSystemTemplate: true
  };

  try {
    // Check if it exists
    const existing = await prisma.inventoryDomains.findUnique({
      where: { id: 'domain_clothing_accessories' }
    });

    if (existing) {
      console.log('✅ Accessories domain already exists');
      console.log(`   ID: ${existing.id}`);
      console.log(`   Name: ${existing.name}`);
    } else {
      // Create it
      const created = await prisma.inventoryDomains.create({
        data: accessoriesDomain
      });

      console.log('✅ Created Accessories domain');
      console.log(`   ID: ${created.id}`);
      console.log(`   Name: ${created.name}`);
      console.log(`   Emoji: ${created.emoji}`);
    }

    // Verify total count
    const totalClothingDomains = await prisma.inventoryDomains.count({
      where: { businessType: 'clothing' }
    });

    console.log(`\n📊 Total clothing domains: ${totalClothingDomains}`);
    console.log('   Expected: 10 (4 original + 6 new)');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createAccessoriesDomain();
