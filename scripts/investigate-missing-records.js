const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigate() {
  try {
    console.log('🔍 Investigating Missing Records\n');

    // Get non-demo business IDs (what the backup uses)
    const businesses = await prisma.businesses.findMany({
      where: { isDemo: false },
      select: { id: true, name: true, type: true }
    });
    const businessIds = businesses.map(b => b.id);

    console.log('Non-demo businesses:', businessIds.length);
    businesses.forEach(b => console.log('  -', b.name, `(${b.type})`));
    console.log('');

    // 1. Check sessions
    console.log('=== SESSIONS ===');
    const allSessions = await prisma.sessions.findMany({
      select: { id: true, userId: true, users: { select: { email: true } } }
    });
    console.log('Total sessions in DB:', allSessions.length);
    allSessions.forEach(s => {
      console.log('  Session:', s.id);
      console.log('    User:', s.users?.email || 'N/A');
    });
    console.log('');

    // 2. Check expenseAccounts
    console.log('=== EXPENSE ACCOUNTS ===');
    const allExpenseAccounts = await prisma.expenseAccounts.findMany({
      select: {
        id: true,
        accountNumber: true,
        accountName: true,
        businessId: true,
        businesses: { select: { name: true, isDemo: true } }
      }
    });
    console.log('Total expenseAccounts in DB:', allExpenseAccounts.length);
    allExpenseAccounts.forEach(ea => {
      console.log('  Account:', ea.accountNumber, '-', ea.accountName);
      console.log('    businessId:', ea.businessId || 'null');
      if (ea.businesses) {
        console.log('    Business:', ea.businesses.name, '(isDemo:', ea.businesses.isDemo + ')');
      }
      const wouldBackup = !ea.businessId || businessIds.includes(ea.businessId);
      console.log('    Would backup?', wouldBackup ? 'YES' : 'NO');
    });
    console.log('');

    // 3. Check expenseAccountDeposits
    console.log('=== EXPENSE ACCOUNT DEPOSITS ===');
    const allDeposits = await prisma.expenseAccountDeposits.findMany({
      select: {
        id: true,
        amount: true,
        expenseAccountId: true,
        expense_accounts: {
          select: {
            accountNumber: true,
            businessId: true,
            businesses: { select: { name: true, isDemo: true } }
          }
        }
      }
    });
    console.log('Total deposits in DB:', allDeposits.length);
    allDeposits.forEach(d => {
      console.log('  Deposit:', d.id, 'Amount:', d.amount);
      console.log('    Expense Account:', d.expense_accounts.accountNumber);
      console.log('    Account businessId:', d.expense_accounts.businessId || 'null');
      if (d.expense_accounts.businesses) {
        console.log('    Business:', d.expense_accounts.businesses.name, '(isDemo:', d.expense_accounts.businesses.isDemo + ')');
      }
    });
    console.log('');

    // 4. Check expenseAccountPayments
    console.log('=== EXPENSE ACCOUNT PAYMENTS ===');
    const allPayments = await prisma.expenseAccountPayments.findMany({
      select: {
        id: true,
        amount: true,
        expenseAccountId: true,
        expense_accounts: {
          select: {
            accountNumber: true,
            businessId: true,
            businesses: { select: { name: true, isDemo: true } }
          }
        }
      }
    });
    console.log('Total payments in DB:', allPayments.length);
    allPayments.forEach(p => {
      console.log('  Payment:', p.id, 'Amount:', p.amount);
      console.log('    Expense Account:', p.expense_accounts.accountNumber);
      console.log('    Account businessId:', p.expense_accounts.businessId || 'null');
      if (p.expense_accounts.businesses) {
        console.log('    Business:', p.expense_accounts.businesses.name, '(isDemo:', p.expense_accounts.businesses.isDemo + ')');
      }
    });
    console.log('');

    // 5. Check vehicleExpenses
    console.log('=== VEHICLE EXPENSES ===');
    const allVehicleExpenses = await prisma.vehicleExpenses.findMany({
      select: {
        id: true,
        amount: true,
        vehicleId: true,
        vehicles: {
          select: {
            plateNumber: true,
            businessId: true,
            businesses: { select: { name: true, isDemo: true } }
          }
        }
      }
    });
    console.log('Total vehicleExpenses in DB:', allVehicleExpenses.length);
    allVehicleExpenses.forEach(ve => {
      console.log('  Vehicle Expense:', ve.id, 'Amount:', ve.amount);
      console.log('    Vehicle:', ve.vehicles.plateNumber);
      console.log('    Vehicle businessId:', ve.vehicles.businessId);
      console.log('    Business:', ve.vehicles.businesses.name, '(isDemo:', ve.vehicles.businesses.isDemo + ')');
      const wouldBackup = businessIds.includes(ve.vehicles.businessId);
      console.log('    Would backup?', wouldBackup ? 'YES' : 'NO');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigate();
