/**
 * Check HXI Eats WLAN/SSID Name
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHXIEatsWLAN() {
  try {
    console.log('🔍 Looking for HXI Eats business...\n');

    // Find HXI Eats business
    const business = await prisma.businesses.findFirst({
      where: {
        name: {
          contains: 'HXI Eats',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        type: true
      }
    });

    if (!business) {
      console.log('❌ HXI Eats business not found');
      return;
    }

    console.log(`✅ Found business: ${business.name} (${business.id})\n`);

    // Find R710 integration for this business
    const integration = await prisma.r710BusinessIntegrations.findFirst({
      where: {
        businessId: business.id
      },
      include: {
        device_registry: {
          select: {
            ipAddress: true,
            description: true,
            connectionStatus: true
          }
        }
      }
    });

    if (!integration) {
      console.log('❌ No R710 integration found for HXI Eats');
      return;
    }

    console.log('📡 R710 Integration Details:');
    console.log('─'.repeat(80));
    console.log(`Integration ID: ${integration.id}`);
    console.log(`Device IP: ${integration.device_registry.ipAddress}`);
    console.log(`Device Description: ${integration.device_registry.description || 'N/A'}`);
    console.log(`Status: ${integration.isActive ? '✅ Active' : '❌ Inactive'}`);
    console.log('');

    // Find WLANs for this integration
    const wlans = await prisma.r710Wlans.findMany({
      where: {
        businessId: business.id,
        deviceRegistryId: integration.deviceRegistryId
      }
    });

    if (wlans.length === 0) {
      console.log('❌ No WLANs found for HXI Eats');
      return;
    }

    console.log('📶 WLAN Details:');
    console.log('─'.repeat(80));
    wlans.forEach((wlan, index) => {
      console.log(`\nWLAN ${index + 1}:`);
      console.log(`  WLAN ID: ${wlan.wlanId}`);
      console.log(`  SSID (Network Name): ${wlan.ssid}`);
      console.log(`  Guest Service: ${wlan.guestServiceId}`);
      console.log(`  Title: ${wlan.title}`);
      console.log(`  Logo Type: ${wlan.logoType}`);
      console.log(`  Valid Days: ${wlan.validDays}`);
      console.log(`  Friendly Key: ${wlan.enableFriendlyKey ? 'Enabled' : 'Disabled'}`);
      console.log(`  Status: ${wlan.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`  Created: ${wlan.createdAt}`);
    });
    console.log('');
    console.log('─'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHXIEatsWLAN();
