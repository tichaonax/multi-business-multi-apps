/**
 * Test Ruckus R710 WLAN API with Proper Session Initialization
 *
 * Theory: The browser loads the dashboard page first, which may initialize
 * session state needed for subsequent API calls.
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
 * Initialize session by loading the dashboard
 */
async function initializeSession(client) {
  console.log('\n📝 Initializing session by loading dashboard...\n');

  try {
    const response = await client.get('/admin/dashboard.jsp', {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate'
      }
    });

    console.log(`✅ Dashboard loaded: ${response.status}`);
    console.log(`📏 Content-Length: ${response.headers['content-length']}`);

    return response.status === 200;
  } catch (error) {
    console.error(`❌ Error loading dashboard: ${error.message}`);
    return false;
  }
}

/**
 * Get WLAN list using _conf.jsp endpoint (from browser capture)
 */
async function getWlanList(client, csrfToken) {
  console.log('\n📝 Getting WLAN list (_conf.jsp endpoint)...\n');

  const updaterId = generateUpdaterId('wlansvc-list');

  // Build XML payload
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  logger.logDiscovery('/admin/_conf.jsp', 'POST', 'Get WLAN list (after session init)');

  try {
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/xml',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    console.log(`✅ Response Status: ${response.status}`);
    console.log(`📦 Content-Type: ${response.headers['content-type']}`);
    console.log(`📏 Content-Length: ${response.headers['content-length']}`);

    if (response.status === 200 && response.data && response.data.length > 10) {
      // Parse XML response
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

      // Extract WLAN list
      const wlanList = result?.['ajax-response']?.response?.[0]?.['wlansvc-list']?.[0]?.wlansvc || [];

      console.log(`\n🌐 Found ${wlanList.length} WLAN(s):\n`);

      wlanList.forEach((wlan, index) => {
        const attrs = wlan.$;
        console.log(`${index + 1}. ${attrs.name}`);
        console.log(`   ID: ${attrs.id}`);
        console.log(`   SSID: ${attrs.ssid}`);
        console.log(`   Usage: ${attrs.usage}`);
        console.log(`   Is Guest: ${attrs['is-guest']}`);
        console.log(`   Authentication: ${attrs.authentication}`);
        console.log(`   Encryption: ${attrs.encryption || 'none'}`);

        if (attrs['is-guest'] === 'true') {
          console.log(`   ⭐ Guest Auth: ${attrs['guest-auth']}`);
          console.log(`   ⭐ Guest Service ID: ${attrs['guestservice-id']}`);
          console.log(`   ⭐ Web Auth: ${attrs['web-auth']}`);
        }

        console.log('');
      });

      return wlanList;
    } else {
      console.log(`⚠️ Empty or invalid response`);
      console.log(`Response data preview: ${JSON.stringify(response.data).substring(0, 200)}`);
      return [];
    }

  } catch (error) {
    console.error(`❌ Error getting WLAN list: ${error.message}`);
    if (error.response) {
      console.error(`   Response status: ${error.response.status}`);
      console.error(`   Response data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
    }
    return [];
  }
}

async function main() {
  console.log('\n🔍 Testing Ruckus R710 WLAN API (With Session Initialization)\n');
  console.log('='.repeat(80));

  const { client } = createHttpClient();
  let csrfToken = null;

  try {
    // Step 1: Login and get CSRF token
    console.log('\n📝 Step 1: Authenticating and obtaining CSRF token...\n');

    const loginResult = await login(client);

    if (!loginResult || !loginResult.success) {
      console.error('❌ Login failed. Cannot proceed.');
      return;
    }

    csrfToken = loginResult.csrfToken;

    if (!csrfToken) {
      console.error('❌ No CSRF token received. API calls may fail.');
      return;
    }

    console.log(`\n✅ Authentication successful!`);
    console.log(`✅ CSRF Token: ${csrfToken}\n`);

    // Step 2: Initialize session by loading dashboard
    const sessionInitialized = await initializeSession(client);

    if (!sessionInitialized) {
      console.error('❌ Failed to initialize session. Continuing anyway...');
    }

    // Step 3: Get WLAN list
    const wlans = await getWlanList(client, csrfToken);

    // Step 4: Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST RESULTS');
    console.log('='.repeat(80));
    console.log(`\n✅ Total WLANs Retrieved: ${wlans.length}`);

    if (wlans.length === 0) {
      console.log(`\n⚠️  No WLANs found. Possible reasons:`);
      console.log(`   1. No WLANs configured on the router`);
      console.log(`   2. Session not fully initialized`);
      console.log(`   3. Different endpoint or headers needed`);
      console.log(`   4. API permissions issue`);
    } else {
      const guestWlans = wlans.filter(w => w.$['is-guest'] === 'true');
      console.log(`✅ Guest WLANs: ${guestWlans.length}`);

      if (guestWlans.length > 0) {
        console.log(`\n🎯 Guest WLAN Details:`);
        guestWlans.forEach(wlan => {
          const attrs = wlan.$;
          console.log(`   - "${attrs.name}" (ID: ${attrs.id}, Guest Service: ${attrs['guestservice-id']})`);
        });
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('📁 Full logs: ./logs/ruckus-api-requests-' + new Date().toISOString().split('T')[0] + '.log');
    console.log('='.repeat(80));
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
main().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
