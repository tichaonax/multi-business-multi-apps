const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkContract() {
  const contract = await prisma.employeeContract.findFirst({
    where: { contractNumber: 'CON1759232800545' }
  });

  console.log(JSON.stringify(contract, null, 2));
  await prisma.$disconnect();
}

checkContract().catch(console.error);
