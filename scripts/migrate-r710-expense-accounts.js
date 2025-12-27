const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Migration Script: R710 Expense Accounts Setup
 *
 * This script performs a one-time migration to:
 * 1. Rename existing WiFi Token Sales accounts to ESP32 WiFi Token Sales
 * 2. Create new R710 WiFi Token Sales expense accounts for all businesses
 */

async function renameESP32ExpenseAccounts() {
  console.log('\n' + '='.repeat(80));
  console.log('STEP 1: Renaming ESP32 WiFi Token Sales Expense Accounts');
  console.log('='.repeat(80) + '\n');

  try {
    // Find all WiFi token sales accounts that don't have ESP32 or R710 prefix
    const wifiAccounts = await prisma.expenseAccounts.findMany({
      where: {
        OR: [
          { accountName: { contains: 'WiFi Token Sales' } },
          { accountName: { contains: 'WiFi Token Revenue' } },
          { accountNumber: { startsWith: 'WIFI-' } }
        ],
        AND: [
          { accountName: { not: { contains: 'ESP32' } } },
          { accountName: { not: { contains: 'R710' } } },
          { accountNumber: { not: { startsWith: 'R710-' } } }
        ]
      }
    });

    if (wifiAccounts.length === 0) {
      console.log('✅ No ESP32 WiFi Token Sales accounts need renaming\n');
      return 0;
    }

    console.log(`Found ${wifiAccounts.length} WiFi token sales accounts to rename:\n`);

    let renamedCount = 0;

    for (const account of wifiAccounts) {
      const oldName = account.accountName;
      let newName = oldName;
      newName = newName.replace('WiFi Token Sales', 'ESP32 WiFi Token Sales');
      newName = newName.replace('WiFi Token Revenue', 'ESP32 WiFi Token Revenue');

      await prisma.expenseAccounts.update({
        where: { id: account.id },
        data: { accountName: newName }
      });

      console.log(`✅ Renamed Account:`);
      console.log(`   Old Name: ${oldName}`);
      console.log(`   New Name: ${newName}`);
      console.log(`   Account Number: ${account.accountNumber}\n`);

      renamedCount++;
    }

    console.log(`✅ Successfully renamed ${renamedCount} ESP32 expense accounts\n`);
    return renamedCount;

  } catch (error) {
    console.error('❌ Error renaming ESP32 expense accounts:', error);
    throw error;
  }
}

async function createR710ExpenseAccounts() {
  console.log('='.repeat(80));
  console.log('STEP 2: Creating R710 WiFi Token Sales Expense Accounts');
  console.log('='.repeat(80) + '\n');

  try {
    // Get all businesses
    const businesses = await prisma.businesses.findMany({
      select: { id: true, name: true }
    });

    console.log(`Processing ${businesses.length} businesses...\n`);

    const createdAccounts = [];
    const skippedAccounts = [];

    for (const business of businesses) {
      // Generate account number from last 6 characters of businessId
      const accountNumber = `R710-${business.id.slice(-6)}`;

      // Check if R710 expense account already exists
      const existingAccount = await prisma.expenseAccounts.findFirst({
        where: {
          accountNumber
        }
      });

      if (existingAccount) {
        console.log(`⏭️  Skipped: ${business.name}`);
        console.log(`   Already has R710 account: ${existingAccount.accountName} (${existingAccount.accountNumber})\n`);
        skippedAccounts.push(business);
        continue;
      }

      // Create the R710 expense account
      const expenseAccount = await prisma.expenseAccounts.create({
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

      console.log(`✅ Created: ${business.name}`);
      console.log(`   Account Name: ${expenseAccount.accountName}`);
      console.log(`   Account Number: ${expenseAccount.accountNumber}\n`);

      createdAccounts.push(expenseAccount);
    }

    console.log('='.repeat(80));
    console.log('SUMMARY:');
    console.log(`  Total Businesses: ${businesses.length}`);
    console.log(`  Created Accounts: ${createdAccounts.length}`);
    console.log(`  Skipped (Already Exist): ${skippedAccounts.length}`);
    console.log('='.repeat(80) + '\n');

    return createdAccounts;

  } catch (error) {
    console.error('❌ Error creating R710 expense accounts:', error);
    throw error;
  }
}

async function runMigration() {
  console.log('\n' + '='.repeat(80));
  console.log('R710 EXPENSE ACCOUNTS MIGRATION');
  console.log('='.repeat(80));

  try {
    // Step 1: Rename ESP32 accounts
    const renamedCount = await renameESP32ExpenseAccounts();

    // Step 2: Create R710 accounts
    const createdAccounts = await createR710ExpenseAccounts();

    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY\n');
    console.log(`Summary:`);
    console.log(`  - ESP32 accounts renamed: ${renamedCount}`);
    console.log(`  - R710 accounts created: ${createdAccounts.length}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
runMigration();
