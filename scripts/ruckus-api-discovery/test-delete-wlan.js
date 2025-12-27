const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * Test: Delete WLAN API
 * Based on: ai-contexts/wip/Request URL-10a.txt and 10b.txt
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
 * Step 1: Get client status for WLAN (optional verification step before delete)
 */
async function getWLANClientStatus(client, csrfToken, wlanName) {
  logger.log(`\n🔍 Checking client status for WLAN "${wlanName}"...`);

  const updaterId = generateUpdaterId('stamgr');
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='stamgr'><client wlan='${wlanName}' LEVEL='1' USE_REGEX='false'/></ajax-request>`;

  try {
    const response = await client.post('/admin/_cmdstat.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    logger.log('✅ Client status retrieved');
    return true;
  } catch (error) {
    logger.logError('Failed to get client status', error);
    return false;
  }
}

/**
 * Step 2: Delete WLAN by ID
 */
async function deleteWLAN(client, csrfToken, wlanId, wlanName) {
  logger.log(`\n🗑️  Deleting WLAN "${wlanName}" (ID: ${wlanId})...`);

  const updaterId = generateUpdaterId('wlansvc-list');

  // Delete WLAN using action='delobj'
  const xmlPayload = `<ajax-request action='delobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc id='${wlanId}'></wlansvc></ajax-request>`;

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
      logger.log(`✅ WLAN deleted successfully`);
      return true;
    } else {
      logger.log('⚠️  Delete may have failed');
      logger.log('Response:', responseText.substring(0, 500));
      return false;
    }
  } catch (error) {
    logger.logError('Failed to delete WLAN', error);
    return false;
  }
}

/**
 * Step 3: Verify WLAN was deleted
 */
async function verifyWLANDeleted(client, csrfToken, wlanId) {
  logger.log(`\n✅ Verifying WLAN ID ${wlanId} was deleted...`);

  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

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

    // Check if WLAN ID is no longer in the response
    if (!responseText.includes(`id="${wlanId}"`)) {
      logger.log(`✅ Confirmed: WLAN ID ${wlanId} no longer exists`);
      return true;
    } else {
      logger.log(`❌ WLAN ID ${wlanId} still exists`);
      return false;
    }
  } catch (error) {
    logger.logError('Failed to verify WLAN deletion', error);
    return false;
  }
}

/**
 * Main test function
 */
async function testDeleteWLAN() {
  logger.log('='.repeat(80));
  logger.log('🧪 RUCKUS R710 - DELETE WLAN TEST');
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

    // Test with a specific WLAN (you can change these values)
    const wlanId = '5';  // Test-WLAN-2025-12-25T06-48-54-UPDATED
    const wlanName = 'Test-WLAN-2025-12-25T06-48-54-UPDATED';

    logger.log(`\n🎯 Target WLAN for deletion:`);
    logger.log(`   Name: ${wlanName}`);
    logger.log(`   ID:   ${wlanId}`);
    logger.log('─'.repeat(80));

    // Step 1: Get client status (optional)
    await getWLANClientStatus(client, csrfToken, wlanName);

    // Step 2: Delete WLAN
    const deleted = await deleteWLAN(client, csrfToken, wlanId, wlanName);

    // Step 3: Verify deletion
    let verified = false;
    if (deleted) {
      verified = await verifyWLANDeleted(client, csrfToken, wlanId);
    }

    // Summary
    logger.log('\n' + '='.repeat(80));
    logger.log('📊 TEST SUMMARY');
    logger.log('='.repeat(80));
    logger.log(`WLAN Name:     ${wlanName}`);
    logger.log(`WLAN ID:       ${wlanId}`);
    logger.log(`Deleted:       ${deleted ? '✅ Yes' : '❌ No'}`);
    logger.log(`Verified:      ${verified ? '✅ Yes' : '❌ No'}`);
    logger.log('─'.repeat(80));

    if (verified) {
      logger.log('🎉 SUCCESS! WLAN deleted and verified.');
    } else {
      logger.log('⚠️  Delete operation may have failed.');
    }
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Test execution failed', error);
  }
}

// Uncomment to run the test
// testDeleteWLAN();

module.exports = { deleteWLAN, verifyWLANDeleted };
