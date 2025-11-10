const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugAccessoriesDomain() {
  console.log('=== DEBUGGING ACCESSORIES DOMAIN ===\n');

  // Get ALL clothing domains
  const allDomains = await prisma.inventoryDomains.findMany({
    where: { businessType: 'clothing' }
  });

  console.log(`Total clothing domains: ${allDomains.length}\n`);

  allDomains.forEach(d => {
    console.log(`ID: ${d.id}`);
    console.log(`Name: "${d.name}"`);
    console.log(`Emoji: ${d.emoji}`);
    console.log(`Description: ${d.description}`);
    console.log('---');
  });

  // Look specifically for Accessories-related domains
  console.log('\n=== SEARCHING FOR ACCESSORIES ===\n');

  const accessoriesLike = allDomains.filter(d =>
    d.name.toLowerCase().includes('accessor') ||
    d.description?.toLowerCase().includes('accessor')
  );

  if (accessoriesLike.length > 0) {
    console.log('Found Accessories-related domains:');
    accessoriesLike.forEach(d => {
      console.log(`  - ID: ${d.id}, Name: "${d.name}"`);
    });
  } else {
    console.log('❌ No Accessories domain found!');
  }

  // Check if domain_clothing_accessories exists
  const expectedId = await prisma.inventoryDomains.findUnique({
    where: { id: 'domain_clothing_accessories' }
  });

  console.log('\n=== CHECKING EXPECTED ID ===');
  console.log(`domain_clothing_accessories exists: ${expectedId ? 'YES' : 'NO'}`);
  if (expectedId) {
    console.log(`  Name: "${expectedId.name}"`);
  }

  await prisma.$disconnect();
}

debugAccessoriesDomain().catch(console.error);
