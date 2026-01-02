const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  console.log('🔍 Investigating the mystery payroll account...\n');

  // Get all payroll accounts
  const payrollAccounts = await prisma.payrollAccounts.findMany({
    include: {
      businesses: {
        select: {
          id: true,
          name: true,
          type: true
        }
      },
      users: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Found ${payrollAccounts.length} payroll account(s):\n`);

  for (const account of payrollAccounts) {
    console.log('═══════════════════════════════════════════════════');
    console.log(`ID: ${account.id}`);
    console.log(`Business: ${account.businesses?.name || 'NULL'} (${account.businessId || 'NULL'})`);
    console.log(`Business Type: ${account.businesses?.type || 'N/A'}`);
    console.log(`Account Number: ${account.accountNumber || 'N/A'}`);
    console.log(`Balance: ${account.balance}`);
    console.log(`Created By: ${account.users?.name || account.users?.email || account.createdBy}`);
    console.log(`Created: ${account.createdAt}`);
    console.log(`Updated: ${account.updatedAt}`);
    console.log(`Is Active: ${account.isActive}`);
    console.log('═══════════════════════════════════════════════════\n');
  }

  // Check if there were any businesses in the backup
  const businesses = await prisma.businesses.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`\n📊 Total businesses in database: ${businesses.length}`);
  console.log('\nBusinesses:');
  for (const biz of businesses.slice(0, 5)) {
    console.log(`  • ${biz.name} (${biz.type}) - Created: ${biz.createdAt}`);
  }

  // Check when the payroll account was created vs when businesses were created
  if (payrollAccounts.length > 0 && businesses.length > 0) {
    const payrollCreated = new Date(payrollAccounts[0].createdAt);
    const oldestBusiness = businesses.reduce((oldest, b) =>
      b.createdAt < oldest.createdAt ? b : oldest
    );
    const newestBusiness = businesses.reduce((newest, b) =>
      b.createdAt > newest.createdAt ? b : newest
    );

    console.log('\n⏰ Timeline Analysis:');
    console.log(`  Oldest Business: ${new Date(oldestBusiness.createdAt).toISOString()}`);
    console.log(`  Newest Business: ${new Date(newestBusiness.createdAt).toISOString()}`);
    console.log(`  Payroll Account: ${payrollCreated.toISOString()}`);

    if (payrollCreated > new Date(newestBusiness.createdAt)) {
      console.log('\n  ⚠️  PAYROLL ACCOUNT WAS CREATED AFTER THE NEWEST BUSINESS!');
      console.log('  This suggests it was auto-created during restore or after.');
    } else {
      console.log('\n  ✓ Payroll account was created before or at the same time as businesses.');
    }
  }

  await prisma.$disconnect();
}

investigate().catch(console.error);
