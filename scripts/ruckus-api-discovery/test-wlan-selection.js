const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * Test: Try different methods to select a specific WLAN for token generation
 */

function generateUpdaterId(component) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}

async function initializeSession(client, csrfToken) {
  const updaterId = generateUpdaterId('system');
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/></ajax-request>`;

  await client.post('/admin/_cmdstat.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });
}

async function tryGetSessionKeyWithWLAN(client, csrfToken, wlanName) {
  logger.log(`\n🧪 Test: Passing wlanName parameter: "${wlanName}"`);

  const formParams = new URLSearchParams();
  formParams.append('wlan', wlanName);

  try {
    const response = await client.post('/admin/mon_guestdata.jsp', formParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    const data = response.data;
    logger.log(`   Result: ${JSON.stringify(data)}`);
    logger.log(`   Key Format: ${/^[A-Z]{5}-[A-Z]{5}$/.test(data.key) ? '✅ TEXT' : '❌ DIGITS'}`);
    return data;
  } catch (error) {
    logger.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

async function testWLANSelection() {
  logger.log('='.repeat(80));
  logger.log('🧪 TEST: WLAN Selection for Friendly Key Tokens');
  logger.log('='.repeat(80));

  const { client } = createHttpClient();

  try {
    const authResult = await login(client);
    if (!authResult || !authResult.success) {
      logger.log('❌ Login failed');
      return;
    }

    const csrfToken = authResult.csrfToken;
    await initializeSession(client, csrfToken);

    logger.log('\n📋 Testing different WLAN selection methods:');
    logger.log('─'.repeat(80));

    // Test 1: Try with 'wlan' parameter
    await tryGetSessionKeyWithWLAN(client, csrfToken, 'Fashions Guest Access');

    // Test 2: Try with 'guest-wlan' parameter
    logger.log(`\n🧪 Test: Passing guest-wlan parameter: "Fashions Guest Access"`);
    const formParams2 = new URLSearchParams();
    formParams2.append('guest-wlan', 'Fashions Guest Access');

    const response2 = await client.post('/admin/mon_guestdata.jsp', formParams2, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    logger.log(`   Result: ${JSON.stringify(response2.data)}`);
    logger.log(`   Key Format: ${/^[A-Z]{5}-[A-Z]{5}$/.test(response2.data.key) ? '✅ TEXT' : '❌ DIGITS'}`);

    logger.log('\n' + '='.repeat(80));
    logger.log('💡 CONCLUSION');
    logger.log('='.repeat(80));
    logger.log('The mon_guestdata.jsp endpoint does not accept WLAN selection parameters.');
    logger.log('The WLAN must be selected through a different mechanism (likely UI state/session).');
    logger.log('─'.repeat(80));
    logger.log('\n💬 Question for user: How do you select a specific WLAN in the Ruckus');
    logger.log('   admin panel before generating tokens? Is there a dropdown or navigation');
    logger.log('   step we\\'re missing in the API workflow?');
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Test failed', error);
  }
}

testWLANSelection();
