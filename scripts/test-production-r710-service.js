/**
 * Test Production R710 Service
 *
 * Verifies that the RuckusR710ApiService now correctly:
 * 1. Creates WLANs and returns NUMERIC IDs
 * 2. Updates WLANs using NUMERIC IDs
 * 3. Verifies updates using NUMERIC IDs
 */

require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const { RuckusR710ApiService } = require('../dist/services/ruckus-r710-api.js');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('🧪 TESTING PRODUCTION R710 SERVICE');
    console.log('='.repeat(80));

    // Get R710 device from registry
    const device = await prisma.r710DeviceRegistry.findFirst({
      where: { ipAddress: '192.168.0.108' }
    });

    if (!device) {
      throw new Error('Device not found in registry');
    }

    console.log(`\n📡 Using device: ${device.ipAddress}`);
    console.log(`   Description: ${device.description}`);

    // Decrypt password
    const { decrypt } = require('../dist/lib/encryption.js');
    const adminPassword = decrypt(device.encryptedAdminPassword);

    console.log(`   Username: ${device.adminUsername}`);
    console.log(`   Password: [DECRYPTED]\n`);

    // Create service instance
    const r710Service = new RuckusR710ApiService({
      ipAddress: device.ipAddress,
      adminUsername: device.adminUsername,
      adminPassword
    });

    // Login and initialize
    console.log('🔐 Logging in...');
    const loginResult = await r710Service.login();

    if (!loginResult.success) {
      throw new Error(`Login failed: ${loginResult.error}`);
    }

    console.log('✅ Login successful\n');

    await r710Service.initializeSession();
    console.log('✅ Session initialized\n');

    const timestamp = Date.now();
    const originalSsid = `ProdTest-${timestamp}`;
    const updatedSsid = `ProdTest-${timestamp}-UPDATED`;

    // Step 1: Create WLAN
    console.log('─'.repeat(80));
    console.log('STEP 1: CREATE WLAN');
    console.log('─'.repeat(80));
    console.log(`Creating WLAN with SSID: "${originalSsid}"`);

    const createResult = await r710Service.createWlan({
      ssid: originalSsid,
      guestServiceId: '1',
      vlanId: '1',
      logoType: 'none',
      title: 'Test WLAN',
      validDays: 1,
      enableFriendlyKey: false
    });

    if (!createResult.success) {
      throw new Error(`Create failed: ${createResult.error}`);
    }

    const numericWlanId = createResult.wlanId;
    console.log(`\n✅ WLAN created successfully!`);
    console.log(`   wlanId returned: "${numericWlanId}"`);
    console.log(`   SSID: "${originalSsid}"`);

    // CRITICAL CHECK: Is it numeric?
    if (!/^\d+$/.test(numericWlanId)) {
      throw new Error(`❌ CRITICAL FAILURE: wlanId is NOT numeric! Got: "${numericWlanId}"`);
    }

    console.log(`\n✅ CRITICAL CHECK PASSED: wlanId is numeric!`);

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Update WLAN using numeric ID
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 2: UPDATE WLAN USING NUMERIC ID');
    console.log('─'.repeat(80));
    console.log(`Updating WLAN ID "${numericWlanId}" to SSID: "${updatedSsid}"`);

    const updateResult = await r710Service.updateWlan(numericWlanId, {
      ssid: updatedSsid,
      guestServiceId: '1',
      vlanId: '1',
      logoType: 'none',
      title: 'Test WLAN Updated',
      validDays: 1,
      enableFriendlyKey: false
    });

    if (!updateResult.success) {
      throw new Error(`Update failed: ${updateResult.error}`);
    }

    console.log(`\n✅ WLAN updated successfully!`);

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Verify update
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 3: VERIFY UPDATE');
    console.log('─'.repeat(80));
    console.log(`Verifying WLAN ID "${numericWlanId}" has SSID "${updatedSsid}"`);

    const verifyResult = await r710Service.verifyWlanUpdate(numericWlanId, updatedSsid);

    if (!verifyResult.success || !verifyResult.verified) {
      throw new Error(`Verification failed: ${verifyResult.error}`);
    }

    console.log(`\n✅ Verification passed!`);

    // Step 4: Discover WLANs (test new method)
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 4: DISCOVER WLANs');
    console.log('─'.repeat(80));

    const discoverResult = await r710Service.discoverWlans();

    if (!discoverResult.success) {
      throw new Error(`Discovery failed: ${discoverResult.error}`);
    }

    console.log(`\n✅ Discovered ${discoverResult.wlans.length} WLANs:`);
    discoverResult.wlans.forEach((wlan, i) => {
      const marker = wlan.id === numericWlanId ? ' ← OUR TEST WLAN' : '';
      console.log(`   ${i + 1}. ID: "${wlan.id}" | SSID: "${wlan.ssid}" | Guest: ${wlan.isGuest}${marker}`);
    });

    // Verify our WLAN is in the list
    const ourWlan = discoverResult.wlans.find(w => w.id === numericWlanId);
    if (!ourWlan) {
      throw new Error(`❌ Our WLAN (ID: ${numericWlanId}) not found in discovery!`);
    }

    if (ourWlan.ssid !== updatedSsid) {
      throw new Error(`❌ SSID mismatch! Expected: "${updatedSsid}", Got: "${ourWlan.ssid}"`);
    }

    console.log(`\n✅ Our WLAN confirmed in discovery with correct SSID`);

    // Step 5: Clean up
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 5: CLEANUP');
    console.log('─'.repeat(80));
    console.log(`Deleting test WLAN ID "${numericWlanId}"`);

    const deleteResult = await r710Service.deleteWlan(numericWlanId);

    if (!deleteResult.success) {
      console.warn(`⚠️  Delete failed: ${deleteResult.error}`);
    } else {
      console.log(`\n✅ Test WLAN deleted successfully`);
    }

    // Final summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(80));
    console.log('\nSummary:');
    console.log(`  ✅ createWlan() returned NUMERIC ID: "${numericWlanId}"`);
    console.log(`  ✅ updateWlan() worked with NUMERIC ID: "${numericWlanId}"`);
    console.log(`  ✅ verifyWlanUpdate() verified using NUMERIC ID`);
    console.log(`  ✅ discoverWlans() found WLAN with correct ID and SSID`);
    console.log(`  ✅ SSID changed from "${originalSsid}" to "${updatedSsid}"`);
    console.log(`  ✅ WLAN ID remained stable: "${numericWlanId}"`);
    console.log('\n🎉 Production R710 service is working correctly!\n');

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
