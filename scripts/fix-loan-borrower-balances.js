/**
 * Script to retroactively credit business balances for existing loans
 * where the business was the borrower but didn't receive the loan proceeds.
 *
 * Run: node scripts/fix-loan-borrower-balances.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixLoanBorrowerBalances() {
  console.log('🔍 Finding loans where business is borrower...\n');

  try {
    // Find all loans where borrowerType is 'business' and has a borrowerBusinessId
    const loansWithBusinessBorrower = await prisma.interBusinessLoans.findMany({
      where: {
        borrowerType: 'business',
        borrowerBusinessId: { not: null }
      },
      include: {
        businesses_inter_business_loans_borrowerBusinessIdTobusinesses: {
          select: { id: true, name: true }
        },
        businesses_inter_business_loans_lenderBusinessIdTobusinesses: {
          select: { name: true }
        },
        persons_lender: {
          select: { fullName: true }
        }
      }
    });

    console.log(`Found ${loansWithBusinessBorrower.length} loans with business as borrower\n`);

    if (loansWithBusinessBorrower.length === 0) {
      console.log('✅ No loans to fix.');
      return;
    }

    let fixedCount = 0;
    let alreadyFixedCount = 0;
    let errorCount = 0;

    for (const loan of loansWithBusinessBorrower) {
      const businessId = loan.borrowerBusinessId;
      const businessName = loan.businesses_inter_business_loans_borrowerBusinessIdTobusinesses?.name || 'Unknown';
      const lenderName = loan.lenderType === 'business'
        ? loan.businesses_inter_business_loans_lenderBusinessIdTobusinesses?.name
        : loan.persons_lender?.fullName || 'External Lender';
      const principal = Number(loan.principalAmount);

      console.log(`\n📋 Processing Loan: ${loan.loanNumber}`);
      console.log(`   Lender: ${lenderName} (${loan.lenderType})`);
      console.log(`   Borrower: ${businessName} (business)`);
      console.log(`   Principal: $${principal.toFixed(2)}`);

      // Check if a 'loan_received' transaction already exists for this loan
      const existingTransaction = await prisma.businessTransactions.findFirst({
        where: {
          businessId: businessId,
          referenceId: loan.id,
          referenceType: 'loan',
          type: 'loan_received'
        }
      });

      if (existingTransaction) {
        console.log(`   ⏭️  Already has loan_received transaction - SKIPPING`);
        alreadyFixedCount++;
        continue;
      }

      // Get current business balance (create account if not exists)
      let businessAccount = await prisma.businessAccounts.findUnique({
        where: { businessId: businessId }
      });

      if (!businessAccount) {
        console.log(`   📝 Creating business account (none exists)...`);
        businessAccount = await prisma.businessAccounts.create({
          data: {
            businessId: businessId,
            balance: 0,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });
      }

      const currentBalance = Number(businessAccount.balance);
      const newBalance = currentBalance + principal;

      console.log(`   Current Balance: $${currentBalance.toFixed(2)}`);
      console.log(`   New Balance: $${newBalance.toFixed(2)}`);

      try {
        // Create the transaction and update balance in a transaction
        await prisma.$transaction(async (tx) => {
          // Update business account balance
          await tx.businessAccounts.update({
            where: { businessId: businessId },
            data: {
              balance: newBalance,
              updatedAt: new Date()
            }
          });

          // Create business transaction record
          await tx.businessTransactions.create({
            data: {
              businessId: businessId,
              type: 'loan_received',
              amount: principal,
              description: `[RETROACTIVE] Loan received from ${lenderName} - ${loan.loanNumber}`,
              referenceId: loan.id,
              referenceType: 'loan',
              balanceAfter: newBalance,
              notes: `Retroactively added loan proceeds - Original loan date: ${loan.loanDate?.toISOString().split('T')[0]}`,
              createdBy: loan.createdBy || 'system'
            }
          });
        });

        console.log(`   ✅ FIXED - Balance credited`);
        fixedCount++;

      } catch (error) {
        console.log(`   ❌ ERROR: ${error.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total loans processed: ${loansWithBusinessBorrower.length}`);
    console.log(`✅ Fixed: ${fixedCount}`);
    console.log(`⏭️  Already fixed: ${alreadyFixedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixLoanBorrowerBalances();
