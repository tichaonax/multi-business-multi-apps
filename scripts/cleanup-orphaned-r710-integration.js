/**
 * Cleanup Orphaned R710 Integration
 *
 * Removes integration records that were created but the R710 WLAN creation failed
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupOrphanedIntegration() {
  try {
    console.log('🧹 Cleaning up orphaned R710 integration...\n');

    const integrationId = '8a457393-2b5c-4a80-adbe-0d2f8ed653dc';
    const businessId = 'a3f37582-5ca7-48ac-94c3-6613452bb871';

    // Check if integration exists
    const integration = await prisma.r710BusinessIntegrations.findUnique({
      where: { id: integrationId },
      include: {
        businesses: {
          select: {
            id: true,
            name: true
          }
        },
        device_registry: {
          select: {
            ipAddress: true,
            description: true
          }
        }
      }
    });

    if (!integration) {
      console.log('❌ Integration not found');
      return;
    }

    console.log('Found orphaned integration:');
    console.log('─'.repeat(80));
    console.log(`Integration ID: ${integration.id}`);
    console.log(`Business: ${integration.businesses.name} (${integration.businessId})`);
    console.log(`Device: ${integration.device_registry.ipAddress}`);
    console.log('');

    // Check for WLAN records
    const wlans = await prisma.r710Wlans.findMany({
      where: {
        businessId: integration.businessId,
        deviceRegistryId: integration.deviceRegistryId
      }
    });

    if (wlans.length > 0) {
      console.log(`⚠️ Found ${wlans.length} WLAN record(s):`);
      wlans.forEach((wlan, index) => {
        console.log(`  ${index + 1}. WLAN ID: ${wlan.wlanId}, SSID: ${wlan.ssid}`);
      });
      console.log('');
      console.log('Deleting WLAN records first...');

      await prisma.r710Wlans.deleteMany({
        where: {
          businessId: integration.businessId,
          deviceRegistryId: integration.deviceRegistryId
        }
      });

      console.log(`✅ Deleted ${wlans.length} WLAN record(s)`);
    } else {
      console.log('ℹ️ No WLAN records found (orphaned integration)');
    }

    // Delete the integration record
    console.log('\nDeleting integration record...');
    await prisma.r710BusinessIntegrations.delete({
      where: { id: integrationId }
    });

    console.log('✅ Integration deleted successfully');
    console.log('');
    console.log('─'.repeat(80));
    console.log('✅ Cleanup complete! You can now retry creating the integration.');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupOrphanedIntegration();
