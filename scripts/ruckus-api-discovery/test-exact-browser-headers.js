/**
 * Test with EXACT browser headers from user's capture
 *
 * Key insight: Content-Type should be application/x-www-form-urlencoded
 * even though payload is XML
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
 * Get WLAN list using EXACT browser headers
 */
async function getWlanList(client, csrfToken) {
  console.log('\n📝 Getting WLAN list (EXACT browser headers)...\n');

  const updaterId = generateUpdaterId('wlansvc-list');

  // Build XML payload - same as browser
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  logger.logDiscovery('/admin/_conf.jsp', 'POST', 'Get WLAN list with exact browser headers');

  try {
    // Try _conf.jsp first (from Request-01.txt)
    console.log('🔍 Trying /admin/_conf.jsp with exact headers...');
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',  // KEY CHANGE!
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'Origin': config.ruckus.baseUrl,
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    });

    console.log(`✅ Response Status: ${response.status}`);
    console.log(`📦 Content-Type: ${response.headers['content-type']}`);
    console.log(`📏 Content-Length: ${response.headers['content-length']}`);

    if (response.status === 200 && response.data && response.data.length > 50) {
      // Parse XML response
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

      console.log('\n📝 Raw parsed result structure:');
      console.log(JSON.stringify(result, null, 2).substring(0, 500));

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

        if (attrs['is-guest'] === 'true') {
          console.log(`   ⭐ Guest Auth: ${attrs['guest-auth']}`);
          console.log(`   ⭐ Guest Service ID: ${attrs['guestservice-id']}`);
        }

        console.log('');
      });

      return { endpoint: '_conf.jsp', wlans: wlanList };
    } else {
      console.log(`⚠️ Empty response from _conf.jsp`);
      console.log(`Response preview: ${JSON.stringify(response.data).substring(0, 100)}`);
    }

  } catch (error) {
    console.error(`❌ Error with _conf.jsp: ${error.message}`);
  }

  // If _conf.jsp didn't work, try _cmdstat.jsp
  try {
    console.log('\n🔍 Trying /admin/_cmdstat.jsp with exact headers...');
    const updaterId2 = generateUpdaterId('wlansvc-list');
    const xmlPayload2 = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId2}' comp='wlansvc-list'/>`;

    const response = await client.post('/admin/_cmdstat.jsp', xmlPayload2, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'Origin': config.ruckus.baseUrl,
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`,
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
      }
    });

    console.log(`✅ Response Status: ${response.status}`);
    console.log(`📦 Content-Type: ${response.headers['content-type']}`);
    console.log(`📏 Content-Length: ${response.headers['content-length']}`);

    if (response.status === 200 && response.data && response.data.length > 50) {
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

      console.log('\n📝 Raw parsed result structure:');
      console.log(JSON.stringify(result, null, 2).substring(0, 500));

      const wlanList = result?.['ajax-response']?.response?.[0]?.['wlansvc-list']?.[0]?.wlansvc || [];

      console.log(`\n🌐 Found ${wlanList.length} WLAN(s) from _cmdstat.jsp:\n`);

      wlanList.forEach((wlan, index) => {
        const attrs = wlan.$;
        console.log(`${index + 1}. ${attrs.name}`);
        console.log(`   ID: ${attrs.id}`);
        console.log(`   SSID: ${attrs.ssid}`);
        console.log(`   Is Guest: ${attrs['is-guest']}`);
        console.log('');
      });

      return { endpoint: '_cmdstat.jsp', wlans: wlanList };
    } else {
      console.log(`⚠️ Empty response from _cmdstat.jsp`);
      console.log(`Response preview: ${JSON.stringify(response.data).substring(0, 200)}`);
    }

  } catch (error) {
    console.error(`❌ Error with _cmdstat.jsp: ${error.message}`);
  }

  return { endpoint: null, wlans: [] };
}

async function main() {
  console.log('\n🔍 Testing with EXACT Browser Headers\n');
  console.log('='.repeat(80));

  const { client } = createHttpClient();

  try {
    // Step 1: Login
    console.log('\n📝 Step 1: Login and get CSRF token...\n');
    const loginResult = await login(client);

    if (!loginResult || !loginResult.success) {
      console.error('❌ Login failed');
      return;
    }

    const csrfToken = loginResult.csrfToken;
    console.log(`✅ CSRF Token: ${csrfToken}\n`);

    // Step 2: Load dashboard
    console.log('📝 Step 2: Loading dashboard...\n');
    await client.get('/admin/dashboard.jsp');
    console.log('✅ Dashboard loaded\n');

    // Step 3: Get WLAN list
    const result = await getWlanList(client, csrfToken);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTS');
    console.log('='.repeat(80));
    if (result.endpoint) {
      console.log(`✅ Working endpoint: /admin/${result.endpoint}`);
      console.log(`✅ Total WLANs: ${result.wlans.length}`);

      const guestWlans = result.wlans.filter(w => w.$['is-guest'] === 'true');
      console.log(`✅ Guest WLANs: ${guestWlans.length}`);
    } else {
      console.log(`❌ No working endpoint found`);
      console.log(`\n🔍 Troubleshooting suggestions:`);
      console.log(`   1. Check if WLANs are actually configured in the router web UI`);
      console.log(`   2. Try capturing a fresh browser request in Network tab`);
      console.log(`   3. Check if there are prerequisite API calls before WLAN list`);
      console.log(`   4. Verify the router firmware version matches: ${config.ruckus.firmwareVersion}`);
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
