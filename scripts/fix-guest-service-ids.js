/**
 * Fix guest service IDs from 'guest-default' to '1'
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixGuestServiceIds() {
  try {
    console.log('\n🔧 Fixing guest service IDs...\n');

    // Update all WLANs with 'guest-default' to use '1'
    const result = await prisma.r710Wlans.updateMany({
      where: {
        guestServiceId: 'guest-default'
      },
      data: {
        guestServiceId: '1'
      }
    });

    console.log(`✅ Updated ${result.count} WLAN records`);
    console.log('   Changed guestServiceId from "guest-default" to "1"\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixGuestServiceIds();
