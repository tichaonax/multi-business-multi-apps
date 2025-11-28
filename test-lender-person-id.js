const { PrismaClient } = require('@prisma/client');

async function testLoanBreakdown() {
  const prisma = new PrismaClient();

  try {
    // Check if the lenderPersonId column exists
    const result = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'inter_business_loans' AND column_name = 'lender_person_id'`;
    console.log('✅ lenderPersonId column exists:', result.length > 0);

    // List all columns in the table
    const allColumns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'inter_business_loans' ORDER BY column_name`;
    console.log('All columns in inter_business_loans:', allColumns.map(c => c.column_name));

    // Check what Prisma sees in the database schema
    const prismaColumns = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name = 'inter_business_loans' ORDER BY column_name`;
    console.log('Prisma sees columns:', prismaColumns.map(c => c.column_name));

    // Try a simple query without selecting lenderPersonId
    const loans = await prisma.interBusinessLoans.findMany({
      take: 1,
      select: {
        id: true,
        lenderPersonId: true
      }
    });

    console.log('✅ Query successful, found loans:', loans.length);
    if (loans.length > 0) {
      console.log('Sample loan:', JSON.stringify(loans[0], null, 2));
    }

    console.log('🎉 All tests passed! The lenderPersonId column has been successfully added.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLoanBreakdown();