/**
 * Fix Missing R710 Expense Accounts
 * 
 * This script:
 * 1. Finds all R710 integrations without expense accounts
 * 2. Creates expense accounts for them
 * 3. Links the accounts to the integrations
 * 
 * Run this to fix existing integrations that were created before
 * the expense account field was added.
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixMissingR710ExpenseAccounts() {
  console.log('🔍 Finding R710 integrations without expense accounts...\n');

  try {
    // Find all R710 integrations without expense accounts
    const integrationsWithoutAccount = await prisma.r710BusinessIntegrations.findMany({
      where: {
        expenseAccountId: null
      },
      include: {
        businesses: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`Found ${integrationsWithoutAccount.length} integrations without expense accounts\n`);

    if (integrationsWithoutAccount.length === 0) {
      console.log('✅ All R710 integrations have expense accounts!');
      return;
    }

    let fixed = 0;
    let errors = 0;

    for (const integration of integrationsWithoutAccount) {
      const business = integration.businesses;
      const businessId = business.id;
      const accountNumber = `R710-${businessId.slice(-6)}`;

      try {
        console.log(`Processing: ${business.name} (${businessId})`);

        // Check if expense account already exists
        let expenseAccount = await prisma.expenseAccounts.findFirst({
          where: { accountNumber }
        });

        if (!expenseAccount) {
          // Create new expense account
          expenseAccount = await prisma.expenseAccounts.create({
            data: {
              accountNumber,
              accountName: `${business.name} - R710 WiFi Token Sales`,
              balance: 0,
              description: `R710 WiFi Token Sales revenue account for ${business.name}`,
              createdBy: 'admin-system-user-default',
              lowBalanceThreshold: 0,
              isActive: true
            }
          });
          console.log(`  ✅ Created expense account: ${expenseAccount.accountName} (${expenseAccount.accountNumber})`);
        } else {
          console.log(`  ℹ️  Using existing expense account: ${expenseAccount.accountName} (${expenseAccount.accountNumber})`);
        }

        // Link expense account to integration
        await prisma.r710BusinessIntegrations.update({
          where: { id: integration.id },
          data: { expenseAccountId: expenseAccount.id }
        });

        console.log(`  ✅ Linked expense account to integration\n`);
        fixed++;

      } catch (error) {
        console.error(`  ❌ Error processing ${business.name}:`, error);
        errors++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Fixed: ${fixed} integrations`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors} integrations`);
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Script error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixMissingR710ExpenseAccounts()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
