/**
 * Test Ruckus R710 Guest Pass (Token) Creation API
 *
 * Discovered API Flow:
 * 1. Login → Get CSRF token
 * 2. System init call
 * 3. Get session key from mon_guestdata.jsp
 * 4. Create guest passes with mon_createguest.jsp
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

  logger.logDiscovery('/admin/mon_guestdata.jsp', 'POST', 'Get session key for token generation');

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
 * Create Guest Passes (Tokens)
 */
async function createGuestPasses(client, csrfToken, options = {}) {
  const {
    guestWlan = 'Fashions Guest Access',
    sessionKey,
    count = 3,
    duration = 2,
    durationUnit = 'hour_Hours', // day_Days, hour_Hours, week_Weeks
    fullname = '',
    email = '',
    phone = ''
  } = options;

  console.log('\n📝 Creating Guest Passes...\n');
  console.log(`   Guest WLAN: ${guestWlan}`);
  console.log(`   Count: ${count}`);
  console.log(`   Duration: ${duration} ${durationUnit.split('_')[1]}`);
  console.log('');

  logger.logDiscovery('/admin/mon_createguest.jsp', 'POST', `Create ${count} guest passes`);

  // Build form data
  const formParams = new URLSearchParams();
  formParams.append('gentype', 'multiple');
  formParams.append('fullname', fullname);
  formParams.append('remarks', '');
  formParams.append('duration', duration.toString());
  formParams.append('duration-unit', durationUnit);
  formParams.append('key', sessionKey);
  formParams.append('createToNum', count.toString());
  formParams.append('batchpass', '');
  formParams.append('guest-wlan', guestWlan);
  formParams.append('shared', 'true');
  formParams.append('reauth', 'false');
  formParams.append('reauth-time', '');
  formParams.append('reauth-unit', 'min');
  formParams.append('email', email);
  formParams.append('countrycode', '');
  formParams.append('phonenumber', phone);
  formParams.append('limitnumber', '2');
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
      // Response is mixed: JavaScript array pushes + JSON
      const responseText = response.data;

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const jsonData = JSON.parse(jsonMatch[0]);

        console.log(`\n🎉 Guest Pass Creation Result: ${jsonData.result}\n`);

        if (jsonData.result === 'OK') {
          console.log(`✅ Successfully created guest passes!`);
          console.log(`   WLAN: ${jsonData.wlan}`);
          console.log(`   Duration: ${jsonData.duration} ${jsonData.duration_unit}`);
          console.log(`   Expire Time: ${new Date(parseInt(jsonData.expiretime) * 1000).toISOString()}`);
          console.log(`   Token IDs: ${jsonData.ids}`);

          // Extract individual tokens from JavaScript arrays
          const tokenRegex = /batchEmailData\.push\('([^|]+)\|([^|]+)\|'\);/g;
          const tokens = [];
          let match;

          while ((match = tokenRegex.exec(responseText)) !== null) {
            tokens.push({
              username: match[1],
              password: match[2]
            });
          }

          console.log(`\n🎫 Generated ${tokens.length} Token(s):\n`);
          tokens.forEach((token, index) => {
            console.log(`${index + 1}. Username: ${token.username}`);
            console.log(`   Password: ${token.password}`);
            console.log('');
          });

          return {
            success: true,
            result: jsonData,
            tokens: tokens
          };
        } else {
          console.error(`❌ Creation failed: ${jsonData.errorMsg}`);
          return { success: false, error: jsonData.errorMsg };
        }
      }

      console.log(`Response (raw): ${responseText.substring(0, 500)}`);
      return { success: false, error: 'Could not parse response' };
    }

    return { success: false, error: 'Invalid response' };

  } catch (error) {
    console.error(`❌ Error creating guest passes: ${error.message}`);
    if (error.response) {
      console.error(`   Response status: ${error.response.status}`);
      console.error(`   Response data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n🔍 Testing Ruckus R710 Guest Pass Creation API\n');
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

    // Step 5: Create guest passes
    console.log('📝 Step 5: Create guest passes...\n');
    const result = await createGuestPasses(client, csrfToken, {
      guestWlan: targetWlan.name,
      sessionKey: sessionKeyData.key,
      count: 5,
      duration: 2,
      durationUnit: 'hour_Hours'
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));

    if (result.success) {
      console.log(`\n✅ SUCCESS! Created ${result.tokens.length} guest passes`);
      console.log(`✅ WLAN: ${result.result.wlan}`);
      console.log(`✅ Duration: ${result.result.duration} ${result.result.duration_unit}`);
      console.log(`✅ Tokens are ready for use!`);
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
