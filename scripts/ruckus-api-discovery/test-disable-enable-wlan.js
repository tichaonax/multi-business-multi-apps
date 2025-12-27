const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * Test: Disable and Enable WLAN APIs
 * Based on: ai-contexts/wip/Request URL-10d.txt and Request URL-11a.txt
 */

function generateUpdaterId(component) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}

async function initializeSession(client, csrfToken) {
  logger.log('\n📡 Initializing session...');
  const updaterId = generateUpdaterId('system');
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/></ajax-request>`;

  await client.post('/admin/_cmdstat.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });
  logger.log('✅ Session initialized');
}

/**
 * Disable WLAN
 */
async function disableWLAN(client, csrfToken, wlanId, wlanName) {
  logger.log(`\n🔴 Disabling WLAN "${wlanName}" (ID: ${wlanId})...`);

  const updaterId = generateUpdaterId('wlansvc-list');

  // Disable WLAN: enable-type='1', IS_PARTIAL='true'
  const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc id='${wlanId}' enable-type='1' IS_PARTIAL='true'/></ajax-request>`;

  try {
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    const responseText = response.data;

    if (responseText.includes('/>')) {
      logger.log(`✅ WLAN disabled successfully`);
      return true;
    } else {
      logger.log('⚠️  Disable may have failed');
      logger.log('Response:', responseText.substring(0, 500));
      return false;
    }
  } catch (error) {
    logger.logError('Failed to disable WLAN', error);
    return false;
  }
}

/**
 * Enable WLAN (requires select step first)
 */
async function enableWLAN(client, csrfToken, wlanId, wlanName) {
  logger.log(`\n🟢 Enabling WLAN "${wlanName}" (ID: ${wlanId})...`);

  // Step 1: Select WLAN (get client status)
  logger.log('   Step 1: Selecting WLAN (get client status)...');
  const selectUpdaterId = generateUpdaterId('stamgr');
  const selectPayload = `<ajax-request action='getstat' updater='${selectUpdaterId}' comp='stamgr'><client wlan='${wlanName}' LEVEL='1' USE_REGEX='false'/></ajax-request>`;

  try {
    await client.post('/admin/_cmdstat.jsp', selectPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });
    logger.log('   ✅ WLAN selected');
  } catch (error) {
    logger.logError('Failed to select WLAN', error);
    return false;
  }

  // Step 2: Enable WLAN
  logger.log('   Step 2: Enabling WLAN...');
  const enableUpdaterId = generateUpdaterId('wlansvc-list');
  const enablePayload = `<ajax-request action='updobj' updater='${enableUpdaterId}' comp='wlansvc-list'><wlansvc id='${wlanId}' enable-type='0' IS_PARTIAL='true'/></ajax-request>`;

  try {
    const response = await client.post('/admin/_conf.jsp', enablePayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    const responseText = response.data;

    if (responseText.includes('/>')) {
      logger.log(`✅ WLAN enabled successfully`);
      return true;
    } else {
      logger.log('⚠️  Enable may have failed');
      logger.log('Response:', responseText.substring(0, 500));
      return false;
    }
  } catch (error) {
    logger.logError('Failed to enable WLAN', error);
    return false;
  }
}

/**
 * Main test function
 */
async function testDisableEnableWLAN() {
  logger.log('='.repeat(80));
  logger.log('🧪 RUCKUS R710 - DISABLE/ENABLE WLAN TEST');
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

    // Test with TXH-Guest
    const wlanId = '6';
    const wlanName = 'TXH-Guest';

    logger.log(`\n🎯 Target WLAN for testing:`);
    logger.log(`   Name: ${wlanName}`);
    logger.log(`   ID:   ${wlanId}`);
    logger.log('─'.repeat(80));

    // Test 1: Disable WLAN
    const disabled = await disableWLAN(client, csrfToken, wlanId, wlanName);

    if (!disabled) {
      logger.log('❌ Disable test failed');
      return;
    }

    // Wait a moment
    logger.log('\n⏳ Waiting 2 seconds...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Test 2: Enable WLAN
    const enabled = await enableWLAN(client, csrfToken, wlanId, wlanName);

    // Summary
    logger.log('\n' + '='.repeat(80));
    logger.log('📊 TEST SUMMARY');
    logger.log('='.repeat(80));
    logger.log(`WLAN Name:     ${wlanName}`);
    logger.log(`WLAN ID:       ${wlanId}`);
    logger.log(`Disabled:      ${disabled ? '✅ Yes' : '❌ No'}`);
    logger.log(`Enabled:       ${enabled ? '✅ Yes' : '❌ No'}`);
    logger.log('─'.repeat(80));

    if (disabled && enabled) {
      logger.log('🎉 SUCCESS! Disable and Enable operations completed successfully.');
      logger.log('');
      logger.log('📋 API Specifications:');
      logger.log('');
      logger.log('Disable WLAN:');
      logger.log('  - Endpoint: /admin/_conf.jsp');
      logger.log('  - Action: updobj');
      logger.log('  - Payload: <wlansvc id="{id}" enable-type="1" IS_PARTIAL="true"/>');
      logger.log('');
      logger.log('Enable WLAN:');
      logger.log('  - Step 1: GET client status (select WLAN)');
      logger.log('    - Endpoint: /admin/_cmdstat.jsp');
      logger.log('    - Action: getstat, comp: stamgr');
      logger.log('    - Payload: <client wlan="{name}" LEVEL="1" USE_REGEX="false"/>');
      logger.log('  - Step 2: Enable WLAN');
      logger.log('    - Endpoint: /admin/_conf.jsp');
      logger.log('    - Action: updobj');
      logger.log('    - Payload: <wlansvc id="{id}" enable-type="0" IS_PARTIAL="true"/>');
    } else {
      logger.log('⚠️  One or more operations failed.');
    }
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Test execution failed', error);
  }
}

// Uncomment to run the test
// testDisableEnableWLAN();

module.exports = { disableWLAN, enableWLAN };
