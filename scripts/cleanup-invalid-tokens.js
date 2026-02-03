/**
 * Cleanup script to remove invalid AVAILABLE tokens across ALL WLANs
 * These tokens were created for WLANs that may have been recreated,
 * making them unredeemable on the new WLAN.
 *
 * Run: node scripts/cleanup-invalid-tokens.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupAllInvalidTokens() {
  console.log('🔍 Finding all WLANs across all businesses...\n');

  // Find all WLANs
  const wlans = await prisma.r710Wlans.findMany({
    include: {
      businesses: {
        select: { id: true, name: true }
      }
    }
  });

  if (wlans.length === 0) {
    console.log('❌ No WLANs found');
    return;
  }

  console.log(`Found ${wlans.length} WLAN(s):\n`);

  let totalDeleted = 0;

  for (const wlan of wlans) {
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📡 WLAN: ${wlan.ssid}`);
    console.log(`   Business: ${wlan.businesses?.name || 'Unknown'}`);
    console.log(`   WLAN DB ID: ${wlan.id}`);
    console.log(`   Device WLAN ID: ${wlan.wlanId}`);

    // Count tokens by status
    const tokenCounts = await prisma.r710Tokens.groupBy({
      by: ['status'],
      where: { wlanId: wlan.id },
      _count: { id: true }
    });

    if (tokenCounts.length === 0) {
      console.log('   No tokens found for this WLAN\n');
      continue;
    }

    console.log('   Token counts:');
    tokenCounts.forEach(tc => {
      console.log(`      ${tc.status}: ${tc._count.id}`);
    });

    // Find AVAILABLE tokens count
    const availableCount = tokenCounts.find(tc => tc.status === 'AVAILABLE')?._count?.id || 0;

    if (availableCount === 0) {
      console.log('   ✅ No AVAILABLE tokens to clean up\n');
      continue;
    }

    // Delete the AVAILABLE tokens
    console.log(`   🗑️  Deleting ${availableCount} AVAILABLE tokens...`);
    const deleteResult = await prisma.r710Tokens.deleteMany({
      where: {
        wlanId: wlan.id,
        status: 'AVAILABLE'
      }
    });

    console.log(`   ✅ Deleted ${deleteResult.count} tokens\n`);
    totalDeleted += deleteResult.count;
  }

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📊 SUMMARY: Deleted ${totalDeleted} invalid tokens across ${wlans.length} WLAN(s)`);
}

cleanupAllInvalidTokens()
  .then(() => {
    console.log('\n✅ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
