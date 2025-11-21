const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.businessAccounts.findMany({
    take: 10,
    select: { id: true, businessId: true, balance: true }
  });
  console.log('Business Accounts:', JSON.stringify(accounts, null, 2));

  // Check for clothing-demo-business specifically
  const clothingAccount = await prisma.businessAccounts.findUnique({
    where: { businessId: 'clothing-demo-business' }
  });
  console.log('\nClothing Demo Account:', clothingAccount);

  // Check businesses table
  const clothingBusiness = await prisma.businesses.findUnique({
    where: { id: 'clothing-demo-business' },
    select: { id: true, name: true }
  });
  console.log('\nClothing Demo Business:', clothingBusiness);

  await prisma.$disconnect();
}

main();
