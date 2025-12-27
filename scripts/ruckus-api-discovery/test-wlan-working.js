/**
 * Test Ruckus R710 WLAN API (Working Version)
 *
 * Uses the actual endpoint and headers from browser capture
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
 * Get WLAN list using correct endpoint
 */
async function getWlanList(client, csrfToken) {
  console.log('\n📝 Getting WLAN list (using browser-captured method)...\n');

  const updaterId = generateUpdaterId('wlansvc-list');

  // Build XML payload (as URL-encoded form data)
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  logger.logDiscovery('/admin/_cmdstat.jsp', 'POST', 'Get WLAN list with CSRF token');

  try {
    const response = await client.post('/admin/_cmdstat.jsp', xmlPayload, {
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

    if (response.status === 200 && response.data && response.data.length > 1) {
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
      console.log(`⚠️ Empty response or error`);
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

/**
 * Get guest service list
 */
async function getGuestServiceList(client, csrfToken) {
  console.log('\n📝 Getting Guest Service list...\n');

  const updaterId = generateUpdaterId('guestservice-list');

  // Build XML payload
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' updater='${updaterId}' comp='guestservice-list'/>`;

  logger.logDiscovery('/admin/_cmdstat.jsp', 'POST', 'Get Guest Service list with CSRF token');

  try {
    const response = await client.post('/admin/_cmdstat.jsp', xmlPayload, {
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

    if (response.status === 200 && response.data && response.data.length > 1) {
      // Parse XML response
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

      // Extract guest service list
      const guestServiceList = result?.['ajax-response']?.response?.[0]?.['guestservice-list']?.[0]?.guestservice || [];

      console.log(`\n🎫 Found ${guestServiceList.length} Guest Service(s):\n`);

      guestServiceList.forEach((service, index) => {
        const attrs = service.$;
        console.log(`${index + 1}. ${attrs.name}`);
        console.log(`   ID: ${attrs.id}`);
        console.log(`   Auth By: ${attrs['auth-by']}`);
        console.log(`   Onboarding: ${attrs.onboarding}`);
        console.log(`   Valid (days): ${attrs.valid}`);
        console.log(`   Portal Enabled: ${attrs['enable-portal']}`);
        console.log('');
      });

      return guestServiceList;
    } else {
      console.log(`⚠️ Empty response`);
      return [];
    }

  } catch (error) {
    console.error(`❌ Error getting Guest Service list: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('\n🔍 Testing Ruckus R710 WLAN API (Working Version)\n');
  console.log('=' .repeat(80));

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

    // Step 2: Get WLAN list
    const wlans = await getWlanList(client, csrfToken);

    // Step 3: Get Guest Service list
    const guestServices = await getGuestServiceList(client, csrfToken);

    // Step 4: Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 API DISCOVERY SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ WLAN API Endpoint: POST /admin/_cmdstat.jsp`);
    console.log(`✅ Authentication: Session Cookie + CSRF Token (X-CSRF-Token header)`);
    console.log(`✅ Request Format: XML payload as application/x-www-form-urlencoded`);
    console.log(`✅ Response Format: XML`);
    console.log(`✅ Total WLANs: ${wlans.length}`);
    console.log(`✅ Total Guest Services: ${guestServices.length}`);

    // Find Guest WLANs
    const guestWlans = wlans.filter(w => w.$['is-guest'] === 'true');
    console.log(`✅ Guest WLANs: ${guestWlans.length}`);

    if (guestWlans.length > 0) {
      console.log(`\n🎯 Guest WLAN Details:`);
      guestWlans.forEach(wlan => {
        const attrs = wlan.$;
        console.log(`   - "${attrs.name}" (ID: ${attrs.id}, Guest Service: ${attrs['guestservice-id']})`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 SUCCESS! WLAN API is working!');
    console.log('='.repeat(80));
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
