/**
 * Check R710 Device Registry
 * Diagnostic script to see what devices are registered and their status
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkR710Devices() {
  try {
    console.log('🔍 Checking R710 Device Registry...\n');

    // Get all devices (including inactive)
    const allDevices = await prisma.r710DeviceRegistry.findMany({
      select: {
        id: true,
        ipAddress: true,
        adminUsername: true,
        description: true,
        model: true,
        firmwareVersion: true,
        isActive: true,
        connectionStatus: true,
        lastHealthCheck: true,
        createdAt: true,
        _count: {
          select: {
            r710_business_integrations: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`📊 Total devices in registry: ${allDevices.length}\n`);

    if (allDevices.length === 0) {
      console.log('❌ No R710 devices registered in the database.');
      console.log('   Go to /r710-portal/devices to register a device.\n');
      return;
    }

    // Display each device
    allDevices.forEach((device, index) => {
      console.log(`Device #${index + 1}:`);
      console.log(`  ID: ${device.id}`);
      console.log(`  IP Address: ${device.ipAddress}`);
      console.log(`  Username: ${device.adminUsername}`);
      console.log(`  Description: ${device.description || 'N/A'}`);
      console.log(`  Model: ${device.model || 'N/A'}`);
      console.log(`  Firmware: ${device.firmwareVersion || 'N/A'}`);
      console.log(`  Active: ${device.isActive ? '✅ YES' : '❌ NO'}`);
      console.log(`  Connection Status: ${device.connectionStatus}`);
      console.log(`  Last Health Check: ${device.lastHealthCheck || 'Never'}`);
      console.log(`  Business Integrations: ${device._count.r710_business_integrations}`);
      console.log(`  Created: ${device.createdAt}`);

      // Check if device would be available
      if (!device.isActive) {
        console.log(`  ⚠️  NOT AVAILABLE: Device is marked as inactive`);
      } else if (device.connectionStatus !== 'CONNECTED') {
        console.log(`  ⚠️  NOT AVAILABLE: Connection status is ${device.connectionStatus} (needs to be CONNECTED)`);
      } else if (!device.lastHealthCheck) {
        console.log(`  ⚠️  NOT AVAILABLE: No health check performed yet`);
      } else {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (device.lastHealthCheck < fiveMinutesAgo) {
          console.log(`  ⚠️  NOT AVAILABLE (cached): Last health check was more than 5 minutes ago`);
          console.log(`     But will be tested in real-time when using testRealTime=true`);
        } else {
          console.log(`  ✅ AVAILABLE: Device should appear in setup dropdown`);
        }
      }

      console.log('');
    });

    // Check active devices
    const activeDevices = allDevices.filter(d => d.isActive);
    console.log(`\n📈 Summary:`);
    console.log(`   Total devices: ${allDevices.length}`);
    console.log(`   Active devices: ${activeDevices.length}`);
    console.log(`   Connected devices: ${allDevices.filter(d => d.connectionStatus === 'CONNECTED').length}`);
    console.log(`   Devices with recent health check: ${allDevices.filter(d => {
      if (!d.lastHealthCheck) return false;
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      return d.lastHealthCheck >= fiveMinutesAgo;
    }).length}`);

  } catch (error) {
    console.error('❌ Error checking R710 devices:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkR710Devices();
