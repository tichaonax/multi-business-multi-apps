const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testPersonalExpensesAPI() {
  try {
    console.log('Testing personal expenses API query...\n');

    // This mimics the exact query from the API route
    const expenses = await prisma.personalExpenses.findMany({
      where: { userId: 'test-user-id' }, // Using a dummy user ID for testing
      include: {
        expense_category: {
          include: {
            domain: true,
          },
        },
        expense_subcategory: true,
        project_transactions: {
          include: {
            project_contractors: {
              include: {
                persons: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    email: true
                  }
                }
              }
            },
            construction_projects: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        loan_transactions: {
          include: {
            inter_business_loans: {
              include: {
                businesses_inter_business_loans_borrowerBusinessIdTobusinesses: { select: { name: true } },
                persons_borrower: { select: { fullName: true } },
                persons_lender: { select: { fullName: true } },
                businesses_inter_business_loans_lenderBusinessIdTobusinesses: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: [
        { createdAt: 'desc' },
        { updatedAt: 'desc' }
      ]
    });

    console.log(`✅ Query successful! Found ${expenses.length} expenses.`);
    console.log('✅ The Prisma include statement fix is working correctly.');

    if (expenses.length > 0) {
      console.log('\nSample expense structure:');
      const sample = expenses[0];
      console.log(`- Has loan transactions: ${sample.loan_transactions?.length > 0}`);
      if (sample.loan_transactions?.length > 0) {
        const loanTx = sample.loan_transactions[0];
        console.log(`- Loan transaction has inter_business_loans: ${!!loanTx.inter_business_loans}`);
        if (loanTx.inter_business_loans) {
          console.log(`- Inter business loan has borrower person: ${!!loanTx.inter_business_loans.persons_borrower}`);
          console.log(`- Inter business loan has lender person: ${!!loanTx.inter_business_loans.persons_lender}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Query failed:', error.message);
    if (error.message.includes('persons')) {
      console.error('❌ The persons relation error still exists!');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testPersonalExpensesAPI();