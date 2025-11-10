const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findClothingBusiness() {
  try {
    const business = await prisma.businesses.findFirst({
      where: { type: 'clothing' },
      select: {
        id: true,
        name: true,
        type: true
      }
    });

    console.log('Clothing Business:');
    console.log(JSON.stringify(business, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findClothingBusiness();
