/**
 * Test Ruckus R710 WLAN XML API
 *
 * Tests the actual XML-based API discovered from browser capture
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
 * Get WLAN list
 */
async function getWlanList(client) {
  console.log('\n📝 Getting WLAN list...\n');

  const updaterId = generateUpdaterId('wlansvc-list');

  // Build XML payload
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  logger.logDiscovery('/admin/_conf.jsp', 'POST', 'Get WLAN list (XML API)');

  try {
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/xml',
        'Accept': '*/*'
      }
    });

    console.log(`✅ Response Status: ${response.status}`);
    console.log(`📦 Content-Type: ${response.headers['content-type']}`);

    if (response.status === 200 && response.data) {
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
          console.log(`   Guest Auth: ${attrs['guest-auth']}`);
          console.log(`   Guest Service ID: ${attrs['guestservice-id']}`);
        }

        console.log('');
      });

      return wlanList;
    }

  } catch (error) {
    console.error(`❌ Error getting WLAN list: ${error.message}`);
    return [];
  }
}

/**
 * Get guest service list
 */
async function getGuestServiceList(client) {
  console.log('\n📝 Getting Guest Service list...\n');

  const updaterId = generateUpdaterId('guestservice-list');

  // Build XML payload
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' updater='${updaterId}' comp='guestservice-list'/>`;

  logger.logDiscovery('/admin/_conf.jsp', 'POST', 'Get Guest Service list (XML API)');

  try {
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/xml',
        'Accept': '*/*'
      }
    });

    console.log(`✅ Response Status: ${response.status}`);

    if (response.status === 200 && response.data) {
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
        console.log(`   Portal Language: ${attrs['portal-lang']}`);
        console.log('');
      });

      return guestServiceList;
    }

  } catch (error) {
    console.error(`❌ Error getting Guest Service list: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('\n🔍 Testing Ruckus R710 WLAN XML API\n');
  console.log('=' .repeat(80));

  const { client } = createHttpClient();

  try {
    // Step 1: Login
    console.log('\n📝 Step 1: Authenticating...\n');

    const loginSuccess = await login(client);

    if (!loginSuccess) {
      console.error('❌ Login failed. Cannot proceed.');
      return;
    }

    console.log('\n✅ Authentication successful!\n');

    // Step 2: Get WLAN list
    const wlans = await getWlanList(client);

    // Step 3: Get Guest Service list
    const guestServices = await getGuestServiceList(client);

    // Step 4: Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 API DISCOVERY SUMMARY');
    console.log('='.repeat(80));
    console.log(`\n✅ WLAN API Endpoint: POST /admin/_conf.jsp`);
    console.log(`✅ Request Format: XML with action='getconf' and comp parameter`);
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
