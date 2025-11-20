const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugInventoryAdd() {
  try {
    const businessId = 'e5bc7e64-a140-4990-870c-59398594cbb2';
    const inventoryType = 'clothing';
    const userId = '2cd606cd-f91a-49e3-9053-04214343c472';

    console.log('Checking business access...');

    const business = await prisma.businesses.findUnique({
      where: { id: businessId }
    });

    if (!business) {
      console.log('Business not found');
      return;
    }

    console.log('Business:', { id: business.id, name: business.name, type: business.type });

    const memberships = await prisma.businessMemberships.findMany({
      where: { businessId: businessId }
    });

    console.log('Memberships for business:', memberships.length);
    memberships.forEach(m => console.log('  - User:', m.userId, 'Active:', m.isActive));

    const adminMembership = memberships.find(m => m.userId === userId);
    console.log('Admin membership:', adminMembership);

    const barcode = 'F5600035002BB13CC0436';
    const existingBarcode = await prisma.productBarcodes.findUnique({
      where: { barcode }
    });
    console.log('Barcode exists:', !!existingBarcode);

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

debugInventoryAdd();