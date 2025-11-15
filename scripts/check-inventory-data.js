const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkInventory() {
  try {
    console.log('Checking inventory data...\n');

    // Check InventoryItems for clothing
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { businessType: 'clothing' },
      include: {
        business_categories: {
          include: {
            domain: true
          }
        }
      },
      take: 5
    });
    console.log('InventoryItem clothing count:', inventoryItems.length);
    console.log('Sample:', JSON.stringify(inventoryItems, null, 2));

    // Check domains
    const domains = await prisma.inventoryDomains.findMany({
      where: { businessType: 'clothing' }
    });
    console.log('\n\nInventory Domains for clothing:', JSON.stringify(domains, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkInventory();
