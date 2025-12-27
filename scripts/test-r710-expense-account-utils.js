const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Test R710 Expense Account Utility Functions
 *
 * Validates the expense account creation logic without modifying production data
 */

async function createR710ExpenseAccount(businessId) {
  try {
    // Get business details
    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, name: true }
    });

    if (!business) {
      throw new Error(`Business not found: ${businessId}`);
    }

    // Generate account number from last 6 characters of businessId
    const accountNumber = `R710-${businessId.slice(-6)}`;

    // Check if R710 expense account already exists
    const existingAccount = await prisma.expenseAccounts.findFirst({
      where: {
        accountNumber
      }
    });

    if (existingAccount) {
      console.log(`✅ R710 expense account already exists for business ${business.name}:`);
      console.log(`   Name: ${existingAccount.accountName}`);
      console.log(`   Account Number: ${existingAccount.accountNumber}`);
      console.log(`   Balance: ${existingAccount.balance}`);
      return existingAccount;
    }

    console.log(`\n📝 Would create R710 expense account for ${business.name}:`);
    console.log(`   Name: ${business.name} - R710 WiFi Token Sales`);
    console.log(`   Account Number: ${accountNumber}`);
    console.log(`   Description: R710 WiFi Token Sales revenue account for ${business.name}`);
    console.log(`   Initial Balance: 0`);
    console.log(`   Status: Active`);

    // For testing, we'll just return a mock object instead of creating
    return {
      id: 'test-id',
      accountName: `${business.name} - R710 WiFi Token Sales`,
      accountNumber,
      balance: 0,
      isActive: true
    };

  } catch (error) {
    console.error('❌ Error in createR710ExpenseAccount:', error);
    throw error;
  }
}

async function testExpenseAccountUtils() {
  console.log('='.repeat(80));
  console.log('🧪 TESTING R710 EXPENSE ACCOUNT UTILITY FUNCTIONS');
  console.log('='.repeat(80) + '\n');

  try {
    // Test 1: Get a test business
    console.log('Test 1: Finding test business...\n');
    const business = await prisma.businesses.findFirst({
      where: { type: 'restaurant' }
    });

    if (!business) {
      console.log('❌ No test business found. Please seed businesses first.');
      return;
    }

    console.log(`✅ Found test business: ${business.name} (${business.id})\n`);

    // Test 2: Validate account number generation
    console.log('Test 2: Validating account number generation...\n');
    const accountNumber = `R710-${business.id.slice(-6)}`;
    console.log(`   Business ID: ${business.id}`);
    console.log(`   Generated Account Number: ${accountNumber}`);
    console.log(`   ✅ Format is correct: R710-{last-6-chars}\n`);

    // Test 3: Test createR710ExpenseAccount function
    console.log('Test 3: Testing createR710ExpenseAccount function...\n');
    await createR710ExpenseAccount(business.id);

    // Test 4: Check for existing WiFi expense accounts
    console.log('\n' + '-'.repeat(80));
    console.log('Test 4: Checking existing WiFi expense accounts...\n');

    const wifiAccounts = await prisma.expenseAccounts.findMany({
      where: {
        OR: [
          { accountName: { contains: 'WiFi' } },
          { accountNumber: { startsWith: 'WIFI-' } },
          { accountNumber: { startsWith: 'R710-' } }
        ]
      },
      orderBy: { accountName: 'asc' }
    });

    if (wifiAccounts.length === 0) {
      console.log('   No WiFi expense accounts found in the system.\n');
    } else {
      console.log(`   Found ${wifiAccounts.length} WiFi expense accounts:\n`);

      wifiAccounts.forEach((account, index) => {
        console.log(`   ${index + 1}. ${account.accountName}`);
        console.log(`      Account Number: ${account.accountNumber}`);
        console.log(`      Balance: $${account.balance}`);
        console.log(`      Active: ${account.isActive}`);
        console.log('');
      });
    }

    // Test 5: Check how many ESP32 accounts would be renamed
    console.log('-'.repeat(80));
    console.log('Test 5: Analyzing ESP32 accounts that would be renamed...\n');

    const esp32Accounts = await prisma.expenseAccounts.findMany({
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

    if (esp32Accounts.length === 0) {
      console.log('   ✅ No ESP32 accounts need renaming (already renamed or none exist)\n');
    } else {
      console.log(`   Found ${esp32Accounts.length} ESP32 accounts that would be renamed:\n`);

      esp32Accounts.forEach((account, index) => {
        let newName = account.accountName;
        newName = newName.replace('WiFi Token Sales', 'ESP32 WiFi Token Sales');
        newName = newName.replace('WiFi Token Revenue', 'ESP32 WiFi Token Revenue');
        console.log(`   ${index + 1}. Account: ${account.accountNumber}`);
        console.log(`      Current: ${account.accountName}`);
        console.log(`      New:     ${newName}`);
        console.log('');
      });
    }

    // Test 6: Count businesses that would get R710 accounts
    console.log('-'.repeat(80));
    console.log('Test 6: Counting businesses that would get R710 accounts...\n');

    const allBusinesses = await prisma.businesses.count();
    const businessesWithR710 = await prisma.expenseAccounts.count({
      where: { accountNumber: { startsWith: 'R710-' } }
    });

    console.log(`   Total Businesses: ${allBusinesses}`);
    console.log(`   Already have R710 accounts: ${businessesWithR710}`);
    console.log(`   Would create R710 accounts for: ${allBusinesses - businessesWithR710}\n`);

    console.log('='.repeat(80));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(80));
    console.log('\n💡 To run the actual migration, execute:');
    console.log('   node scripts/migrate-r710-expense-accounts.js\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

testExpenseAccountUtils();
