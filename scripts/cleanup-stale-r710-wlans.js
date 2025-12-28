/**
 * Cleanup Stale R710 WLAN Records
 *
 * Removes R710 WLAN records that have SSID-based wlanIds instead of numeric IDs.
 * These records are out of sync with the device and need to be removed.
 *
 * The database should only contain WLANs with NUMERIC wlanIds (e.g., "0", "5", "1"),
 * not SSID strings (e.g., "HXI Eats Guest WiFi").
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('🧹 R710 WLAN CLEANUP SCRIPT');
    console.log('='.repeat(80));
    console.log('\nThis script will remove R710 WLAN records with SSID-based wlanIds.');
    console.log('These records are out of sync with the device.\n');

    // Find all R710 WLANs
    const allWlans = await prisma.r710Wlans.findMany({
      include: {
        businesses: {
          select: {
            id: true,
            name: true,
            type: true
          }
        },
        device_registry: {
          select: {
            id: true,
            ipAddress: true,
            description: true
          }
        }
      }
    });

    console.log(`📊 Found ${allWlans.length} total R710 WLAN records in database\n`);

    // Filter stale WLANs (non-numeric wlanIds)
    const staleWlans = allWlans.filter(wlan => !/^\d+$/.test(wlan.wlanId));
    const validWlans = allWlans.filter(wlan => /^\d+$/.test(wlan.wlanId));

    console.log('─'.repeat(80));
    console.log('ANALYSIS');
    console.log('─'.repeat(80));
    console.log(`✅ Valid WLANs (numeric IDs): ${validWlans.length}`);
    console.log(`❌ Stale WLANs (SSID-based IDs): ${staleWlans.length}\n`);

    if (validWlans.length > 0) {
      console.log('✅ Valid WLANs (will be kept):\n');
      validWlans.forEach((wlan, i) => {
        console.log(`   ${i + 1}. wlanId: "${wlan.wlanId}" (numeric)`);
        console.log(`      SSID: "${wlan.ssid}"`);
        console.log(`      Business: ${wlan.businesses.name}`);
        console.log(`      Device: ${wlan.device_registry.ipAddress}`);
        console.log('');
      });
    }

    if (staleWlans.length === 0) {
      console.log('✅ No stale WLANs found! Database is clean.\n');
      return;
    }

    console.log('❌ Stale WLANs (will be deleted):\n');
    staleWlans.forEach((wlan, i) => {
      console.log(`   ${i + 1}. wlanId: "${wlan.wlanId}" (SSID-based - INVALID)`);
      console.log(`      SSID: "${wlan.ssid}"`);
      console.log(`      Business: ${wlan.businesses.name}`);
      console.log(`      Device: ${wlan.device_registry.ipAddress}`);
      console.log('');
    });

    // Check for related records that will be affected
    console.log('─'.repeat(80));
    console.log('IMPACT ANALYSIS');
    console.log('─'.repeat(80));

    for (const wlan of staleWlans) {
      // Check for token configs
      const tokenConfigs = await prisma.r710TokenConfigs.count({
        where: { wlanId: wlan.id }
      });

      // Check for business menu items (need to join through token configs)
      const menuItems = await prisma.r710BusinessTokenMenuItems.count({
        where: {
          r710_token_configs: {
            wlanId: wlan.id
          }
        }
      });

      // Check for tokens (need to join through token configs)
      const tokens = await prisma.r710Tokens.count({
        where: {
          r710_token_configs: {
            wlanId: wlan.id
          }
        }
      });

      if (tokenConfigs > 0 || menuItems > 0 || tokens > 0) {
        console.log(`\n⚠️  WLAN "${wlan.ssid}" has related records:`);
        if (tokenConfigs > 0) console.log(`   - ${tokenConfigs} token package(s)`);
        if (menuItems > 0) console.log(`   - ${menuItems} menu item(s)`);
        if (tokens > 0) console.log(`   - ${tokens} token(s)`);
        console.log('   These will be CASCADE deleted.');
      }
    }

    console.log('\n' + '─'.repeat(80));
    console.log('CONFIRMATION');
    console.log('─'.repeat(80));
    console.log(`\n⚠️  This will delete ${staleWlans.length} stale WLAN record(s).`);
    console.log('⚠️  Related token configs, menu items, and tokens will also be deleted (CASCADE).');
    console.log('⚠️  This action CANNOT be undone.\n');

    // Wait for user input
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      rl.question('Type "DELETE" to confirm deletion: ', (ans) => {
        rl.close();
        resolve(ans);
      });
    });

    if (answer !== 'DELETE') {
      console.log('\n❌ Deletion cancelled. No changes were made.\n');
      return;
    }

    // Perform deletion
    console.log('\n🗑️  Deleting stale WLANs...\n');

    let deletedCount = 0;
    const staleWlanIds = staleWlans.map(w => w.id);

    // Delete in transaction
    await prisma.$transaction(async (tx) => {
      // Delete token menu items first (references token configs)
      const deletedMenuItems = await tx.r710BusinessTokenMenuItems.deleteMany({
        where: {
          r710_token_configs: {
            wlanId: {
              in: staleWlanIds
            }
          }
        }
      });
      if (deletedMenuItems.count > 0) {
        console.log(`   ✅ Deleted ${deletedMenuItems.count} menu item(s)`);
      }

      // Delete tokens (references token configs)
      const deletedTokens = await tx.r710Tokens.deleteMany({
        where: {
          r710_token_configs: {
            wlanId: {
              in: staleWlanIds
            }
          }
        }
      });
      if (deletedTokens.count > 0) {
        console.log(`   ✅ Deleted ${deletedTokens.count} token(s)`);
      }

      // Delete token configs (references WLANs)
      const deletedConfigs = await tx.r710TokenConfigs.deleteMany({
        where: {
          wlanId: {
            in: staleWlanIds
          }
        }
      });
      if (deletedConfigs.count > 0) {
        console.log(`   ✅ Deleted ${deletedConfigs.count} token config(s)`);
      }

      // Finally, delete the WLANs
      const deletedWlans = await tx.r710Wlans.deleteMany({
        where: {
          id: {
            in: staleWlanIds
          }
        }
      });
      deletedCount = deletedWlans.count;
      console.log(`   ✅ Deleted ${deletedCount} WLAN record(s)`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ CLEANUP COMPLETE');
    console.log('='.repeat(80));
    console.log(`\n✅ Successfully deleted ${deletedCount} stale WLAN record(s)`);
    console.log('\n📋 Next steps:');
    console.log('   1. Businesses can now create NEW R710 integrations via the UI');
    console.log('   2. New WLANs will be created with NUMERIC IDs from the device');
    console.log('   3. The sync mechanism will work correctly with numeric IDs\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
