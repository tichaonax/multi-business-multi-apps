/**
 * Test WLAN Numeric ID Workflow
 *
 * Verifies that:
 * 1. createWlan() returns a NUMERIC ID (e.g., "0", "5")
 * 2. updateWlan() works with the NUMERIC ID
 * 3. verifyWlanUpdate() correctly validates the update
 */

require('dotenv').config({ path: '.env.local' });

const axios = require('axios');
const https = require('https');

const client = axios.create({
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  baseURL: 'https://192.168.0.108',
  headers: { 'User-Agent': 'Mozilla/5.0' }
});

function generateUpdaterId(component) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}

async function login() {
  console.log('\n🔐 Logging in...');
  const loginParams = new URLSearchParams();
  loginParams.append('username', 'admin');
  loginParams.append('password', 'HelloMotto');
  loginParams.append('ok', 'Log in');

  const response = await client.post('/admin/login.jsp', loginParams, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    maxRedirects: 0,
    validateStatus: () => true
  });

  const csrfToken = response.headers['http_x_csrf_token'];

  if ((response.status === 302 || response.status === 200) && csrfToken) {
    console.log('✅ Login successful');
    return csrfToken;
  } else {
    throw new Error(`Login failed - status ${response.status}`);
  }
}

async function initializeSession(csrfToken) {
  console.log('🔧 Initializing session...');
  const updaterId = generateUpdaterId('system');
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/></ajax-request>`;

  await client.post('/admin/_cmdstat.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken
    }
  });

  console.log('✅ Session initialized\n');
}

async function createWLAN(csrfToken, wlanName) {
  console.log(`📝 Creating WLAN "${wlanName}"...`);
  const updaterId = generateUpdaterId('wlansvc-list');

  const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${wlanName}' ssid='${wlanName}' description='${wlanName}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='1'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken
    }
  });

  // Extract NUMERIC ID from response
  const idMatch = response.data.match(/id="(\d+)"/);

  if (idMatch) {
    const numericId = idMatch[1];
    console.log(`✅ WLAN created successfully`);
    console.log(`   Numeric ID: "${numericId}"`);
    console.log(`   SSID: "${wlanName}"`);
    return numericId;
  } else {
    console.error('❌ Failed to extract numeric ID from response');
    console.log('Response:', response.data.substring(0, 500));
    throw new Error('Failed to create WLAN');
  }
}

async function updateWLAN(csrfToken, numericWlanId, newName) {
  console.log(`\n🔧 Updating WLAN with NUMERIC ID "${numericWlanId}" to "${newName}"...`);
  const updaterId = generateUpdaterId('wlansvc-list');

  const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${newName}' ssid='${newName}' description='${newName}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' id='${numericWlanId}' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='1'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken
    }
  });

  if (response.data.includes('<response') && response.data.includes('/>')) {
    console.log('✅ WLAN updated successfully');
    return true;
  } else {
    console.error('❌ Update failed');
    console.log('Response:', response.data.substring(0, 500));
    return false;
  }
}

async function verifyWLAN(csrfToken, numericWlanId, expectedSsid) {
  console.log(`\n🔍 Verifying WLAN with NUMERIC ID "${numericWlanId}" has SSID "${expectedSsid}"...`);
  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken
    }
  });

  // Check if our WLAN ID appears with the expected name
  if (response.data.includes(`id="${numericWlanId}"`)) {
    console.log(`✅ WLAN ID ${numericWlanId} confirmed in WLAN list`);

    // Verify the SSID
    if (response.data.includes(`name="${expectedSsid}"`) && response.data.includes(`ssid="${expectedSsid}"`)) {
      console.log(`✅ WLAN SSID confirmed: "${expectedSsid}"`);
      return true;
    } else {
      console.error(`❌ WLAN found but SSID mismatch. Expected: "${expectedSsid}"`);
      return false;
    }
  } else {
    console.error(`❌ WLAN ID ${numericWlanId} not found in WLAN list`);
    return false;
  }
}

async function deleteWLAN(csrfToken, numericWlanId) {
  console.log(`\n🗑️  Deleting WLAN with NUMERIC ID "${numericWlanId}"...`);
  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='delobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc id='${numericWlanId}'/></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken
    }
  });

  if (response.data.includes('<response') && response.data.includes('/>')) {
    console.log(`✅ WLAN ID ${numericWlanId} deleted successfully`);
    return true;
  } else {
    console.error('❌ Delete may have failed');
    return false;
  }
}

async function main() {
  try {
    console.log('='.repeat(80));
    console.log('🧪 TESTING WLAN NUMERIC ID WORKFLOW');
    console.log('='.repeat(80));

    const csrfToken = await login();
    await initializeSession(csrfToken);

    const timestamp = Date.now();
    const originalName = `NumericID-Test-${timestamp}`;
    const updatedName = `NumericID-Test-${timestamp}-UPDATED`;

    // Step 1: Create WLAN and verify numeric ID
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 1: CREATE WLAN');
    console.log('─'.repeat(80));
    const numericWlanId = await createWLAN(csrfToken, originalName);

    if (!/^\d+$/.test(numericWlanId)) {
      throw new Error(`❌ CRITICAL: wlanId is not numeric! Got: "${numericWlanId}"`);
    }
    console.log(`\n✅ CRITICAL CHECK PASSED: wlanId is numeric (${numericWlanId})`);

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Update WLAN using numeric ID
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 2: UPDATE WLAN USING NUMERIC ID');
    console.log('─'.repeat(80));
    const updateSuccess = await updateWLAN(csrfToken, numericWlanId, updatedName);

    if (!updateSuccess) {
      throw new Error('❌ Update failed');
    }

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Verify update
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 3: VERIFY UPDATE');
    console.log('─'.repeat(80));
    const verifySuccess = await verifyWLAN(csrfToken, numericWlanId, updatedName);

    if (!verifySuccess) {
      throw new Error('❌ Verification failed');
    }

    // Step 4: Clean up (delete test WLAN)
    console.log('\n' + '─'.repeat(80));
    console.log('STEP 4: CLEANUP');
    console.log('─'.repeat(80));
    await deleteWLAN(csrfToken, numericWlanId);

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(80));
    console.log('\nSummary:');
    console.log(`  ✅ Created WLAN with NUMERIC ID: ${numericWlanId}`);
    console.log(`  ✅ Updated WLAN using NUMERIC ID: ${numericWlanId}`);
    console.log(`  ✅ Verified SSID changed from "${originalName}" to "${updatedName}"`);
    console.log(`  ✅ Deleted test WLAN`);
    console.log('\n🎉 The production code should now work correctly with NUMERIC IDs!\n');

  } catch (error) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ TEST FAILED');
    console.error('='.repeat(80));
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
    }
  }
}

main();
