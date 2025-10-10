const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testContractFields() {
  try {
    // Try to query with contract fields in select
    const result = await prisma.payrollEntry.findFirst({
      select: {
        id: true,
        contractId: true,
        contractNumber: true,
        contractStartDate: true,
        contractEndDate: true,
        isProrated: true
      }
    });

    console.log('✅ SUCCESS! Prisma client recognizes contract fields');
    console.log('Sample entry:', result);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ ERROR! Prisma client does NOT recognize contract fields');
    console.error(error.message);
    await prisma.$disconnect();
  }
}

testContractFields();
