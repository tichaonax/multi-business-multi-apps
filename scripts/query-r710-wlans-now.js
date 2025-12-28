require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { getR710SessionManager } = require('../src/lib/r710-session-manager');
const { decrypt } = require('../src/lib/encryption');

async function queryDeviceWlans() {
  try {
    // Get device info
    const device = await prisma.r710DeviceRegistry.findFirst({
      where: { ipAddress: '192.168.0.108' }
    });

    if (!device) {
      console.log('Device not found');
      return;
    }

    console.log('\n📡 Querying R710 device for WLANs...\n');

    const sessionManager = getR710SessionManager();
    const adminPassword = decrypt(device.encryptedAdminPassword);

    const r710Service = await sessionManager.getSession({
      ipAddress: device.ipAddress,
      adminUsername: device.adminUsername,
      adminPassword
    });

    // Query WLANs
    const result = await r710Service.discoverWlans();

    console.log('WLANs on device:');
    console.log(JSON.stringify(result.wlans, null, 2));

    console.log('\n📊 Summary:');
    result.wlans.forEach(wlan => {
      console.log(`  - ID: "${wlan.id}" | SSID: "${wlan.ssid}" | Name: "${wlan.name}"`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

queryDeviceWlans();
