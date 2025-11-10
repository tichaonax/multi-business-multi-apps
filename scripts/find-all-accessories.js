const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findAllAccessories() {
  console.log('=== SEARCHING ALL DOMAINS FOR ACCESSORIES ===\n');

  // Get ALL domains (all business types)
  const allDomains = await prisma.inventoryDomains.findMany();

  console.log(`Total domains (all business types): ${allDomains.length}\n`);

  // Search for any domain with "Accessories" in name
  const accessoriesExact = allDomains.filter(d => d.name === 'Accessories');
  const accessoriesLike = allDomains.filter(d => d.name.toLowerCase().includes('accessor'));

  console.log('=== EXACT MATCH: "Accessories" ===');
  if (accessoriesExact.length > 0) {
    accessoriesExact.forEach(d => {
      console.log(`✓ FOUND!`);
      console.log(`  ID: ${d.id}`);
      console.log(`  Name: "${d.name}"`);
      console.log(`  Business Type: ${d.businessType}`);
      console.log(`  Emoji: ${d.emoji}`);
      console.log(`  Description: ${d.description}`);
      console.log('');
    });
  } else {
    console.log('  No exact match found\n');
  }

  console.log('=== PARTIAL MATCH: Contains "accessor" ===');
  if (accessoriesLike.length > 0) {
    accessoriesLike.forEach(d => {
      console.log(`  - ${d.businessType}: "${d.name}" (ID: ${d.id})`);
    });
  } else {
    console.log('  No partial matches found');
  }

  await prisma.$disconnect();
}

findAllAccessories().catch(console.error);
