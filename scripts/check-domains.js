const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDomains() {
  try {
    const clothingDomains = await prisma.inventoryDomains.findMany({
      where: { businessType: 'clothing', isActive: true }
    });

    const restaurantDomains = await prisma.inventoryDomains.findMany({
      where: { businessType: 'restaurant', isActive: true }
    });

    console.log('Clothing domains:', clothingDomains.length);
    clothingDomains.forEach(d => console.log('  -', d.emoji, d.name, '(', d.id, ')'));

    console.log('\nRestaurant domains:', restaurantDomains.length);
    restaurantDomains.forEach(d => console.log('  -', d.emoji, d.name, '(', d.id, ')'));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDomains();
