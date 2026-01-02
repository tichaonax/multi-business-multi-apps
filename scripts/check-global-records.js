const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGlobalRecords() {
  console.log('🔍 Checking for global (businessId: NULL) records across all tables...\n');

  // Tables that have optional businessId fields
  const tablesToCheck = [
    { name: 'payrollAccounts', model: prisma.payrollAccounts },
    { name: 'expenseAccounts', model: prisma.expenseAccounts },
    { name: 'fundSources', model: prisma.fundSources },
    { name: 'projects', model: prisma.projects },
  ];

  let foundGlobals = false;

  for (const { name, model } of tablesToCheck) {
    try {
      const globalRecords = await model.count({
        where: { businessId: null }
      });

      if (globalRecords > 0) {
        foundGlobals = true;
        console.log(`❌ ${name}: ${globalRecords} global record(s) with businessId: NULL`);

        // Get details of first few records
        const examples = await model.findMany({
          where: { businessId: null },
          take: 3
        });

        for (const record of examples) {
          console.log(`   • ID: ${record.id}, Created: ${record.createdAt}`);
        }
        console.log('');
      } else {
        console.log(`✅ ${name}: No global records`);
      }
    } catch (error) {
      console.log(`⚠️  ${name}: Error checking (${error.message})`);
    }
  }

  if (foundGlobals) {
    console.log('\n⚠️  RECOMMENDATION: Update backup query for tables with global records to include:');
    console.log('   OR: [');
    console.log('     { businessId: { in: businessIds } },');
    console.log('     { businessId: null }');
    console.log('   ]');
  } else {
    console.log('\n✅ No global records found in checked tables');
  }

  await prisma.$disconnect();
}

checkGlobalRecords().catch(console.error);
