const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClothingDomains() {
  try {
    console.log('=== Checking Clothing Domains ===\n');

    // Method 1: Direct clothing domains
    const directDomains = await prisma.inventoryDomains.findMany({
      where: { businessType: 'clothing', isActive: true }
    });
    console.log('1. Direct clothing domains (businessType="clothing"):', directDomains.length);
    directDomains.forEach(d => console.log('   -', d.emoji, d.name));

    // Method 2: Domains used by clothing categories
    const clothingCategories = await prisma.businessCategories.findMany({
      where: {
        businessType: 'clothing',
        domainId: { not: null }
      },
      include: {
        domain: true
      },
      distinct: ['domainId']
    });

    console.log('\n2. Domains used by clothing categories:', clothingCategories.length);
    clothingCategories.forEach(cat => {
      if (cat.domain) {
        console.log('   -', cat.domain.emoji, cat.domain.name, `(${cat.domain.businessType})`);
      }
    });

    // Method 3: All unique domains linked to clothing categories
    const uniqueDomains = new Map();
    clothingCategories.forEach(cat => {
      if (cat.domain) {
        uniqueDomains.set(cat.domain.id, cat.domain);
      }
    });

    console.log('\n3. Unique domains that should appear for clothing:');
    Array.from(uniqueDomains.values()).forEach(d => {
      console.log('   -', d.emoji, d.name, `[${d.businessType}]`, `(${d.id})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClothingDomains();
