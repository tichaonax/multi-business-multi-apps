const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Get business IDs
    const businesses = await prisma.businesses.findMany({
      where: { isDemo: false },
      select: { id: true, name: true }
    });
    const businessIds = businesses.map(b => b.id);
    console.log('Business IDs:', businessIds);
    console.log('');

    // Get user IDs with memberships
    const users = await prisma.users.findMany({
      where: {
        business_memberships: {
          some: { businessId: { in: businessIds } }
        }
      },
      select: { id: true, email: true }
    });
    const userIds = users.map(u => u.id);
    console.log('User IDs with memberships:', userIds);
    console.log('');

    // 1. Sessions
    console.log('=== SESSIONS ===');
    const sessions = await prisma.sessions.findMany();
    console.log('All sessions:', sessions.length);
    console.log('Sessions would NOT be backed up (as confirmed by user)');
    console.log('');

    // 2. Expense Accounts
    console.log('=== EXPENSE ACCOUNTS ===');
    const allAccounts = await prisma.expenseAccounts.findMany({
      select: { id: true, accountNumber: true, accountName: true, createdBy: true }
    });
    console.log('Total accounts:', allAccounts.length);

    for (const acc of allAccounts) {
      const createdByInList = userIds.includes(acc.createdBy);
      const hasDeposits = await prisma.expenseAccountDeposits.count({
        where: {
          expenseAccountId: acc.id,
          sourceBusinessId: { in: businessIds }
        }
      });
      const hasPayments = await prisma.expenseAccountPayments.count({
        where: {
          expenseAccountId: acc.id,
          payeeBusinessId: { in: businessIds }
        }
      });

      const wouldBackup = createdByInList || hasDeposits > 0 || hasPayments > 0;

      console.log(`  ${acc.accountNumber} - ${acc.accountName}`);
      console.log(`    createdBy in userIds: ${createdByInList}`);
      console.log(`    deposits from businesses: ${hasDeposits}`);
      console.log(`    payments to businesses: ${hasPayments}`);
      console.log(`    Would backup? ${wouldBackup ? 'YES' : 'NO'}`);
    }
    console.log('');

    // 3. Expense Account Deposits
    console.log('=== EXPENSE ACCOUNT DEPOSITS ===');
    const allDeposits = await prisma.expenseAccountDeposits.findMany({
      select: { id: true, amount: true, sourceBusinessId: true }
    });
    console.log('Total deposits:', allDeposits.length);

    for (const dep of allDeposits) {
      const wouldBackup = dep.sourceBusinessId && businessIds.includes(dep.sourceBusinessId);
      console.log(`  Deposit ${dep.id}: ${dep.amount}`);
      console.log(`    sourceBusinessId: ${dep.sourceBusinessId || 'null'}`);
      console.log(`    Would backup? ${wouldBackup ? 'YES' : 'NO'}`);
    }
    console.log('');

    // 4. Expense Account Payments
    console.log('=== EXPENSE ACCOUNT PAYMENTS ===');
    const allPayments = await prisma.expenseAccountPayments.findMany({
      select: { id: true, amount: true, payeeBusinessId: true }
    });
    console.log('Total payments:', allPayments.length);

    for (const pay of allPayments) {
      const wouldBackup = pay.payeeBusinessId && businessIds.includes(pay.payeeBusinessId);
      console.log(`  Payment ${pay.id}: ${pay.amount}`);
      console.log(`    payeeBusinessId: ${pay.payeeBusinessId || 'null'}`);
      console.log(`    Would backup? ${wouldBackup ? 'YES' : 'NO'}`);
    }
    console.log('');

    // 5. Vehicle Expenses
    console.log('=== VEHICLE EXPENSES ===');
    const allVehicleExpenses = await prisma.vehicleExpenses.findMany({
      select: { id: true, amount: true, businessId: true }
    });
    console.log('Total vehicle expenses:', allVehicleExpenses.length);

    for (const ve of allVehicleExpenses) {
      const wouldBackup = businessIds.includes(ve.businessId);
      console.log(`  Expense ${ve.id}: ${ve.amount}`);
      console.log(`    businessId: ${ve.businessId}`);
      console.log(`    Would backup? ${wouldBackup ? 'YES' : 'NO'}`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
