/**
 * Update WiFi Token Expense Account Thresholds
 *
 * Sets lowBalanceThreshold to 0 for all WiFi token expense accounts
 * (both ESP32 and R710) that currently have non-zero thresholds
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateWiFiExpenseAccountThresholds() {
  try {
    console.log('🔄 Updating WiFi token expense account thresholds...\n');

    // Find all WiFi token expense accounts with non-zero threshold
    const wifiAccounts = await prisma.expenseAccounts.findMany({
      where: {
        OR: [
          // R710 accounts
          { accountNumber: { startsWith: 'R710-' } },
          // ESP32 accounts
          { accountNumber: { startsWith: 'WIFI-' } },
          { accountName: { contains: 'WiFi Token' } },
          { accountName: { contains: 'R710' } }
        ],
        AND: {
          lowBalanceThreshold: { not: 0 }
        }
      },
      orderBy: {
        accountName: 'asc'
      }
    });

    console.log(`Found ${wifiAccounts.length} WiFi token expense accounts with non-zero threshold:\n`);

    if (wifiAccounts.length === 0) {
      console.log('✅ All WiFi token expense accounts already have threshold set to $0');
      return;
    }

    // Display accounts that will be updated
    console.log('Accounts to update:');
    console.log('─'.repeat(80));
    wifiAccounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.accountName}`);
      console.log(`   Account #: ${account.accountNumber}`);
      console.log(`   Current Threshold: $${Number(account.lowBalanceThreshold).toFixed(2)}`);
      console.log(`   Balance: $${Number(account.balance).toFixed(2)}`);
      console.log('');
    });
    console.log('─'.repeat(80));
    console.log('');

    // Update all accounts to have threshold of 0
    const updateResult = await prisma.expenseAccounts.updateMany({
      where: {
        id: {
          in: wifiAccounts.map(a => a.id)
        }
      },
      data: {
        lowBalanceThreshold: 0,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Successfully updated ${updateResult.count} WiFi token expense accounts`);
    console.log('   New threshold: $0.00\n');

    // Verify the update
    const verifyAccounts = await prisma.expenseAccounts.findMany({
      where: {
        id: {
          in: wifiAccounts.map(a => a.id)
        }
      },
      select: {
        accountName: true,
        accountNumber: true,
        lowBalanceThreshold: true
      }
    });

    console.log('Verification - Updated accounts:');
    console.log('─'.repeat(80));
    verifyAccounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.accountName}`);
      console.log(`   Account #: ${account.accountNumber}`);
      console.log(`   New Threshold: $${Number(account.lowBalanceThreshold).toFixed(2)} ✓`);
      console.log('');
    });
    console.log('─'.repeat(80));
    console.log('\n✅ All WiFi token expense accounts now have $0 threshold');

  } catch (error) {
    console.error('❌ Error updating WiFi expense account thresholds:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updateWiFiExpenseAccountThresholds()
  .then(() => {
    console.log('\n✅ Update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });
