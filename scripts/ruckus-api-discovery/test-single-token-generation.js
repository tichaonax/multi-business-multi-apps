/**
 * Test Ruckus R710 Single Guest Token Generation
 *
 * This tests creating a single guest pass on-the-fly (not from pool)
 *
 * API Flow:
 * 1. Login → Get CSRF token
 * 2. System init call
 * 3. Get session key from mon_guestdata.jsp
 * 4. Create single guest pass with mon_createguest.jsp (gentype=single)
 */

const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');
const xml2js = require('xml2js');

/**
 * Generate updater ID (timestamp + random)
 */
function generateUpdaterId(component) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}

/**
 * Initialize session with system status call
 */
async function initializeSession(client, csrfToken) {
  console.log('\n📝 Initializing session...\n');

  const updaterId = generateUpdaterId('system');
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/><adv-radio/><mgmt-ip/><admin/><WAN/><email-server/><sms-server/><zero-it/><bypassCNA/><internal-gateway/><dual-wan-gateway/><registration-token/><mesh-policy/><aws-sns/><pubnub/><self-heal/><guest-access/><mobile-app-promotion/><ap-policy/><credential-reset/><dhcps/><addif/><remote-mgmt/><log/><time/><unleashed-network/><dhcpp/><background-scan/><wips/><ips/><mdnsproxyrule-enable-ap/><icx/><wlansvc-standard-template/><speedflex/><iotg/><cluster/><onearm-gateway/><tunnel/><dedicated/><tun-cfg/><zd-pif/><client-load-balancing/><band-balancing/><scand/><debug-components/><debug-log/><upload-debug/><snmp/><snmpv3/><snmp-trap/><tr069/><SR-info/><mgmt-vlan/></ajax-request>`;

  try {
    await client.post('/admin/_cmdstat.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken
      }
    });
    console.log('✅ Session initialized');
    return true;
  } catch (error) {
    console.error(`❌ Session init failed: ${error.message}`);
    return false;
  }
}

/**
 * Get guest WLANs list
 */
async function getGuestWlans(client, csrfToken) {
  console.log('\n📝 Getting Guest WLANs...\n');

  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  try {
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken,
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    const wlanList = result?.['ajax-response']?.response?.[0]?.['wlansvc-list']?.[0]?.wlansvc || [];

    const guestWlans = wlanList.filter(w => w.$['is-guest'] === 'true');

    console.log(`Found ${guestWlans.length} Guest WLAN(s):`);
    guestWlans.forEach((wlan, index) => {
      const attrs = wlan.$;
      console.log(`${index + 1}. ${attrs.name} (SSID: ${attrs.ssid})`);
    });

    return guestWlans;
  } catch (error) {
    console.error(`❌ Error getting WLANs: ${error.message}`);
    return [];
  }
}

/**
 * Get session key for token generation
 * CRITICAL: This generates a unique key needed for creating guest passes
 */
async function getGuestPassSessionKey(client, csrfToken) {
  console.log('\n📝 Getting guest pass session key...\n');

  logger.logDiscovery('/admin/mon_guestdata.jsp', 'POST', 'Get session key for single token generation');

  try {
    const response = await client.post('/admin/mon_guestdata.jsp', '', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    console.log(`✅ Response Status: ${response.status}`);

    if (response.status === 200 && response.data) {
      const data = response.data;
      console.log(`📦 Session Key Data:`, data);

      return {
        wlanName: data.wlanName || null,
        key: data.key || null
      };
    }

    return null;
  } catch (error) {
    console.error(`❌ Error getting session key: ${error.message}`);
    return null;
  }
}

/**
 * Generate custom username format for R710 direct sales
 * Format: DS-YYMMDD-HHMMSS-RND
 * Example: DS-251227-143052-A3F
 */
function generateDirectSaleUsername() {
  const now = new Date();

  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  // Generate 3-character random suffix (hex)
  const random = Math.floor(Math.random() * 4096).toString(16).toUpperCase().padStart(3, '0');

  return `DS-${year}${month}${day}-${hours}${minutes}${seconds}-${random}`;
}

/**
 * Create Single Guest Pass (Token)
 *
 * CRITICAL DIFFERENCE from batch creation:
 * - gentype='single' instead of 'multiple'
 * - fullname is the actual username/identifier
 * - No createToNum parameter
 * - Response format is different (DONE vs OK)
 */
async function createSingleGuestPass(client, csrfToken, options = {}) {
  const {
    guestWlan = 'Fashions Guest Access',
    sessionKey,
    duration = 1,
    durationUnit = 'day_Days', // day_Days, hour_Hours, week_Weeks
    deviceLimit = 2,
    username = generateDirectSaleUsername()
  } = options;

  console.log('\n📝 Creating Single Guest Pass...\n');
  console.log(`   Guest WLAN: ${guestWlan}`);
  console.log(`   Username: ${username}`);
  console.log(`   Duration: ${duration} ${durationUnit.split('_')[1]}`);
  console.log(`   Device Limit: ${deviceLimit}`);
  console.log('');

  logger.logDiscovery('/admin/mon_createguest.jsp', 'POST', `Create single guest pass: ${username}`);

  // Build form data for SINGLE token
  const formParams = new URLSearchParams();
  formParams.append('gentype', 'single');  // ← CRITICAL: 'single' not 'multiple'
  formParams.append('fullname', username);  // ← This becomes the username
  formParams.append('remarks', '');
  formParams.append('duration', duration.toString());
  formParams.append('duration-unit', durationUnit);
  formParams.append('key', sessionKey);
  formParams.append('createToNum', '');  // ← Empty for single
  formParams.append('batchpass', '');
  formParams.append('guest-wlan', guestWlan);
  formParams.append('shared', 'true');
  formParams.append('reauth', 'false');
  formParams.append('reauth-time', '');
  formParams.append('reauth-unit', 'min');
  formParams.append('email', '');
  formParams.append('countrycode', '');
  formParams.append('phonenumber', '');
  formParams.append('limitnumber', deviceLimit.toString());
  formParams.append('_', '');

  try {
    const response = await client.post('/admin/mon_createguest.jsp', formParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    console.log(`✅ Response Status: ${response.status}`);

    if (response.status === 200 && response.data) {
      const jsonData = response.data;

      console.log(`\n🎉 Guest Pass Creation Result: ${jsonData.result}\n`);

      if (jsonData.result === 'DONE') {  // ← Note: 'DONE' for single, 'OK' for batch
        console.log(`✅ Successfully created single guest pass!`);
        console.log(`   Username: ${jsonData.fullname || username}`);
        console.log(`   Password: ${jsonData.key}`);  // ← Password is in 'key' field
        console.log(`   WLAN: ${jsonData.wlan}`);
        console.log(`   Duration: ${jsonData.duration} ${jsonData.duration_unit}`);
        console.log(`   Expire Time: ${new Date(parseInt(jsonData.expiretime) * 1000).toISOString()}`);

        return {
          success: true,
          token: {
            username: jsonData.fullname || username,
            password: jsonData.key,  // ← Password comes from 'key' field
            wlan: jsonData.wlan,
            duration: jsonData.duration,
            durationUnit: jsonData.duration_unit,
            expiresAt: new Date(parseInt(jsonData.expiretime) * 1000)
          }
        };
      } else {
        console.error(`❌ Creation failed: ${jsonData.errorMsg}`);
        return { success: false, error: jsonData.errorMsg };
      }
    }

    return { success: false, error: 'Invalid response' };

  } catch (error) {
    console.error(`❌ Error creating single guest pass: ${error.message}`);
    if (error.response) {
      console.error(`   Response status: ${error.response.status}`);
      console.error(`   Response data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🔍 Testing Ruckus R710 Single Guest Pass Generation\n');
  console.log('='.repeat(80));

  const { client } = createHttpClient();
  let csrfToken = null;

  try {
    // Step 1: Login
    console.log('\n📝 Step 1: Login...\n');
    const loginResult = await login(client);

    if (!loginResult || !loginResult.success) {
      console.error('❌ Login failed');
      return;
    }

    csrfToken = loginResult.csrfToken;
    console.log(`✅ CSRF Token: ${csrfToken}\n`);

    // Step 2: Initialize session
    console.log('📝 Step 2: Initialize session...\n');
    await initializeSession(client, csrfToken);

    // Step 3: Get Guest WLANs
    console.log('📝 Step 3: Get Guest WLANs...\n');
    const guestWlans = await getGuestWlans(client, csrfToken);

    if (guestWlans.length === 0) {
      console.error('❌ No guest WLANs found');
      return;
    }

    // Use first guest WLAN
    const targetWlan = guestWlans[0].$;
    console.log(`\n✅ Using Guest WLAN: ${targetWlan.name}\n`);

    // Step 4: Get session key for token generation
    console.log('📝 Step 4: Get session key...\n');
    const sessionKeyData = await getGuestPassSessionKey(client, csrfToken);

    if (!sessionKeyData || !sessionKeyData.key) {
      console.error('❌ Failed to get session key');
      return;
    }

    console.log(`✅ Session Key: ${sessionKeyData.key}\n`);

    // Step 5: Generate custom username
    const customUsername = generateDirectSaleUsername();
    console.log(`📝 Step 5: Generated Custom Username: ${customUsername}\n`);

    // Step 6: Create single guest pass
    console.log('📝 Step 6: Create single guest pass...\n');
    const result = await createSingleGuestPass(client, csrfToken, {
      guestWlan: targetWlan.name,
      sessionKey: sessionKeyData.key,
      username: customUsername,
      duration: 4,
      durationUnit: 'day_Days',
      deviceLimit: 2
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    if (result.success) {
      console.log(`\n✅ SUCCESS! Created single guest pass`);
      console.log(`✅ Username: ${result.token.username}`);
      console.log(`✅ Password: ${result.token.password}`);
      console.log(`✅ WLAN: ${result.token.wlan}`);
      console.log(`✅ Duration: ${result.token.duration} ${result.token.durationUnit}`);
      console.log(`✅ Expires: ${result.token.expiresAt.toISOString()}`);
      console.log(`✅ Token is ready for immediate use!`);
    } else {
      console.log(`\n❌ FAILED: ${result.error}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('📁 Full logs: ./logs/ruckus-api-requests-' + new Date().toISOString().split('T')[0] + '.log');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
  }
}

main().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
