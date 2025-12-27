/**
 * Test Ruckus R710 WLAN API with Proper Session Initialization
 *
 * Key Discovery: Browser makes a system status call (action='getstat')
 * right after login before any configuration calls (action='getconf')
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
 * Initialize session with system status call (from Request-04c.txt)
 * This is CRITICAL - browser does this before any WLAN calls
 */
async function initializeSessionWithSystemCall(client, csrfToken) {
  console.log('\n📝 Initializing session with system status call...\n');

  const updaterId = generateUpdaterId('system');

  // Exact payload from browser capture
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/><adv-radio/><mgmt-ip/><admin/><WAN/><email-server/><sms-server/><zero-it/><bypassCNA/><internal-gateway/><dual-wan-gateway/><registration-token/><mesh-policy/><aws-sns/><pubnub/><self-heal/><guest-access/><mobile-app-promotion/><ap-policy/><credential-reset/><dhcps/><addif/><remote-mgmt/><log/><time/><unleashed-network/><dhcpp/><background-scan/><wips/><ips/><mdnsproxyrule-enable-ap/><icx/><wlansvc-standard-template/><speedflex/><iotg/><cluster/><onearm-gateway/><tunnel/><dedicated/><tun-cfg/><zd-pif/><client-load-balancing/><band-balancing/><scand/><debug-components/><debug-log/><upload-debug/><snmp/><snmpv3/><snmp-trap/><tr069/><SR-info/><mgmt-vlan/></ajax-request>`;

  logger.logDiscovery('/admin/_cmdstat.jsp', 'POST', 'System status initialization call');

  try {
    const response = await client.post('/admin/_cmdstat.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    console.log(`✅ System status call: ${response.status}`);
    console.log(`📏 Content-Length: ${response.headers['content-length']}`);

    if (response.status === 200 && response.data && response.data.length > 100) {
      console.log(`✅ Session initialized successfully!`);
      return true;
    }

    console.log(`⚠️ Unexpected response from system call`);
    return false;

  } catch (error) {
    console.error(`❌ Error initializing session: ${error.message}`);
    return false;
  }
}

/**
 * Get WLAN list using _conf.jsp (from Request-01.txt)
 */
async function getWlanListFromConfEndpoint(client, csrfToken) {
  console.log('\n📝 Getting WLAN list from _conf.jsp...\n');

  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  logger.logDiscovery('/admin/_conf.jsp', 'POST', 'Get WLAN list after session init');

  try {
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    console.log(`✅ Response Status: ${response.status}`);
    console.log(`📦 Content-Type: ${response.headers['content-type']}`);
    console.log(`📏 Content-Length: ${response.headers['content-length']}`);

    if (response.status === 200 && response.data && response.data.length > 50) {
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

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

      return wlanList;
    } else {
      console.log(`⚠️ Empty or short response: ${response.data.length} bytes`);
      console.log(`Response preview: ${JSON.stringify(response.data).substring(0, 200)}`);
      return [];
    }

  } catch (error) {
    console.error(`❌ Error getting WLAN list: ${error.message}`);
    return [];
  }
}

/**
 * Get Guest Service list
 */
async function getGuestServiceList(client, csrfToken) {
  console.log('\n📝 Getting Guest Service list...\n');

  const updaterId = generateUpdaterId('guestservice-list');
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' updater='${updaterId}' comp='guestservice-list'/>`;

  logger.logDiscovery('/admin/_conf.jsp', 'POST', 'Get Guest Service list');

  try {
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    console.log(`✅ Response Status: ${response.status}`);

    if (response.status === 200 && response.data && response.data.length > 50) {
      const parser = new xml2js.Parser();
      const result = await parser.parseStringPromise(response.data);

      const guestServiceList = result?.['ajax-response']?.response?.[0]?.['guestservice-list']?.[0]?.guestservice || [];

      console.log(`\n🎫 Found ${guestServiceList.length} Guest Service(s):\n`);

      guestServiceList.forEach((service, index) => {
        const attrs = service.$;
        console.log(`${index + 1}. ${attrs.name}`);
        console.log(`   ID: ${attrs.id}`);
        console.log(`   Auth By: ${attrs['auth-by']}`);
        console.log(`   Valid (days): ${attrs.valid}`);
        console.log('');
      });

      return guestServiceList;
    }

    return [];

  } catch (error) {
    console.error(`❌ Error getting Guest Service list: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('\n🔍 Testing Ruckus R710 WLAN API (With Proper Session Init)\n');
  console.log('='.repeat(80));

  const { client } = createHttpClient();
  let csrfToken = null;

  try {
    // Step 1: Login and get CSRF token
    console.log('\n📝 Step 1: Authenticating...\n');

    const loginResult = await login(client);

    if (!loginResult || !loginResult.success) {
      console.error('❌ Login failed');
      return;
    }

    csrfToken = loginResult.csrfToken;
    console.log(`✅ CSRF Token: ${csrfToken}\n`);

    // Step 2: CRITICAL - Initialize session with system status call
    const sessionInitialized = await initializeSessionWithSystemCall(client, csrfToken);

    if (!sessionInitialized) {
      console.log('⚠️ Session init call had issues, but continuing...');
    }

    // Step 3: Get WLAN list
    const wlans = await getWlanListFromConfEndpoint(client, csrfToken);

    // Step 4: Get Guest Service list
    const guestServices = await getGuestServiceList(client, csrfToken);

    // Step 5: Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 API DISCOVERY RESULTS');
    console.log('='.repeat(80));
    console.log(`\n✅ Total WLANs Retrieved: ${wlans.length}`);
    console.log(`✅ Total Guest Services: ${guestServices.length}`);

    if (wlans.length > 0) {
      const guestWlans = wlans.filter(w => w.$['is-guest'] === 'true');
      console.log(`✅ Guest WLANs: ${guestWlans.length}`);

      if (guestWlans.length > 0) {
        console.log(`\n🎯 Guest WLAN Details:`);
        guestWlans.forEach(wlan => {
          const attrs = wlan.$;
          console.log(`   - "${attrs.name}" (ID: ${attrs.id}, Guest Service: ${attrs['guestservice-id']})`);
        });
      }

      console.log('\n🎉 SUCCESS! WLAN API is now working!');
    } else {
      console.log(`\n⚠️ Still no WLANs returned. Additional investigation needed.`);
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
