const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findClothingBusiness() {
  const clothingBiz = await prisma.businesses.findFirst({
    where: { type: 'clothing' }
  });

  if (clothingBiz) {
    console.log('✅ Clothing Business Found:');
    console.log(`   ID: ${clothingBiz.id}`);
    console.log(`   Name: ${clothingBiz.name}`);
    console.log(`   Type: ${clothingBiz.type}`);
  } else {
    console.log('❌ No clothing business found in database');
    console.log('   You may need to create one first');
  }

  await prisma.$disconnect();
}

findClothingBusiness().catch(console.error);
