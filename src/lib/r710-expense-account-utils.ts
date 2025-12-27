import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * R710 Expense Account Utility Functions
 *
 * Handles automatic creation and management of business-specific R710 WiFi token sales expense accounts
 */

/**
 * Create R710 expense account for a business
 *
 * @param businessId - The business ID to create the expense account for
 * @param createdBy - The user ID creating this account
 * @returns The created or existing R710 expense account
 */
export async function createR710ExpenseAccount(businessId: string, createdBy: string = 'admin-system-user-default') {
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
      console.log(`R710 expense account already exists for business ${business.name}: ${existingAccount.accountName} (${existingAccount.accountNumber})`);
      return existingAccount;
    }

    // Create the R710 expense account
    const expenseAccount = await prisma.expenseAccounts.create({
      data: {
        accountNumber,
        accountName: `${business.name} - R710 WiFi Token Sales`,
        balance: 0,
        description: `R710 WiFi Token Sales revenue account for ${business.name}`,
        createdBy,
        lowBalanceThreshold: 0,
        isActive: true
      }
    });

    console.log(`Created R710 expense account for ${business.name}: ${expenseAccount.accountName} (${expenseAccount.accountNumber})`);
    return expenseAccount;

  } catch (error) {
    console.error('Error creating R710 expense account:', error);
    throw error;
  }
}

/**
 * Get or create R710 expense account for a business
 *
 * @param businessId - The business ID
 * @param createdBy - Optional user ID creating this account
 * @returns The R710 expense account (existing or newly created)
 */
export async function getOrCreateR710ExpenseAccount(businessId: string, createdBy?: string) {
  // Generate account number from last 6 characters of businessId
  const accountNumber = `R710-${businessId.slice(-6)}`;

  // Check if account already exists
  const existingAccount = await prisma.expenseAccounts.findFirst({
    where: {
      accountNumber
    }
  });

  if (existingAccount) {
    return existingAccount;
  }

  // Create if doesn't exist
  return createR710ExpenseAccount(businessId, createdBy);
}

/**
 * Rename ESP32 expense accounts to distinguish from R710
 * This should be run as a one-time migration
 *
 * @returns Number of accounts renamed
 */
export async function renameESP32ExpenseAccounts() {
  try {
    console.log('🔄 Renaming ESP32 WiFi Token Sales expense accounts...');

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

    console.log(`Found ${wifiAccounts.length} WiFi token sales accounts to rename`);

    let renamedCount = 0;

    for (const account of wifiAccounts) {
      // Update name to include ESP32 prefix
      let newName = account.accountName;
      newName = newName.replace('WiFi Token Sales', 'ESP32 WiFi Token Sales');
      newName = newName.replace('WiFi Token Revenue', 'ESP32 WiFi Token Revenue');

      await prisma.expenseAccounts.update({
        where: { id: account.id },
        data: { accountName: newName }
      });

      console.log(`  ✅ Renamed: "${account.accountName}" → "${newName}"`);
      renamedCount++;
    }

    console.log(`\n✅ Successfully renamed ${renamedCount} ESP32 expense accounts`);
    return renamedCount;

  } catch (error) {
    console.error('Error renaming ESP32 expense accounts:', error);
    throw error;
  }
}

/**
 * Bulk create R710 expense accounts for all businesses
 * Useful for initial setup or migration
 *
 * @param businessIds - Optional array of specific business IDs. If not provided, creates for all businesses.
 * @param createdBy - Optional user ID creating these accounts
 * @returns Array of created expense accounts
 */
export async function bulkCreateR710ExpenseAccounts(businessIds?: string[], createdBy?: string) {
  try {
    console.log('🔄 Bulk creating R710 expense accounts...');

    // Get businesses to process
    const businesses = await prisma.businesses.findMany({
      where: businessIds ? { id: { in: businessIds } } : {},
      select: { id: true, name: true }
    });

    console.log(`Processing ${businesses.length} businesses...`);

    const createdAccounts = [];

    for (const business of businesses) {
      try {
        const account = await getOrCreateR710ExpenseAccount(business.id, createdBy);
        createdAccounts.push(account);
      } catch (error) {
        console.error(`  ❌ Failed to create R710 expense account for ${business.name}:`, error);
      }
    }

    console.log(`\n✅ Successfully processed ${createdAccounts.length} businesses`);
    return createdAccounts;

  } catch (error) {
    console.error('Error in bulk create R710 expense accounts:', error);
    throw error;
  }
}
