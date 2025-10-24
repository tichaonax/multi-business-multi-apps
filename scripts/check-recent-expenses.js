const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkRecentExpenses() {
  try {
    console.log('Checking recent expenses...\n');

    const expenses = await prisma.personalExpenses.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        expense_category: {
          select: {
            name: true,
            emoji: true,
          }
        },
        expense_subcategory: {
          select: {
            name: true,
            emoji: true,
          }
        }
      }
    });

    console.log(`Found ${expenses.length} recent expenses:\n`);

    expenses.forEach((expense, index) => {
      console.log(`${index + 1}. ${expense.description}`);
      console.log(`   Amount: $${Number(expense.amount).toFixed(2)}`);
      console.log(`   Date: ${expense.date}`);
      console.log(`   Category: ${expense.category}`);
      if (expense.expense_category) {
        console.log(`   Category Object: ${expense.expense_category.emoji} ${expense.expense_category.name}`);
      }
      if (expense.expense_subcategory) {
        console.log(`   Subcategory: ${expense.expense_subcategory.emoji} ${expense.expense_subcategory.name}`);
      }
      console.log(`   Created: ${expense.createdAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRecentExpenses();
