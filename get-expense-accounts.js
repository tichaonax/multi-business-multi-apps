const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function getExpenseAccounts() {
  try {
    const accounts = await prisma.expenseAccounts.findMany({
      where: {
        businessId: 'd624b077-eb26-4eb4-9260-81056aa0c58f',
      },
      select: {
        id: true,
        name: true,
        businessId: true,
      },
      take: 5,
    });

    console.log('Expense Accounts:');
    console.log(JSON.stringify(accounts, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getExpenseAccounts();