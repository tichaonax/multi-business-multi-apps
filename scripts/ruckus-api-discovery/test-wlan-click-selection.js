const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * Test: Click on WLAN (get client status) to select it, then get session key
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

/**
 * Step 1: "Click" on WLAN by getting its client status
 * This should select the WLAN for the session
 */
async function selectWLANByGettingClientStatus(client, csrfToken, wlanName) {
  logger.log(`\n👆 "Clicking" on WLAN "${wlanName}" (getting client status)...`);

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

    logger.log('✅ Client status retrieved (WLAN should now be "selected")');
    return true;
  } catch (error) {
    logger.logError('Failed to get client status', error);
    return false;
  }
}

/**
 * Step 2: Get session key (should now return text-based key for selected WLAN)
 */
async function getGuestPassSessionKey(client, csrfToken) {
  logger.log('\n🔑 Getting guest pass session key...');

  const response = await client.post('/admin/mon_guestdata.jsp', '', {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
      'X-CSRF-Token': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  const data = response.data;
  logger.log(`📋 Response:`);
  logger.log(`   WLAN Name: ${data.wlanName}`);
  logger.log(`   Session Key: ${data.key}`);
  logger.log(`   Key Format: ${/^[A-Z]{5}-[A-Z]{5}$/.test(data.key) ? '✅ TEXT-BASED (XXXXX-XXXXX)' : '❌ DIGIT-BASED'}`);

  return data;
}

/**
 * Step 3: Create tokens using the session key
 */
async function createGuestPasses(client, csrfToken, wlanName, sessionKey, count = 2) {
  logger.log(`\n🎫 Creating ${count} guest passes for "${wlanName}"...`);

  const formParams = new URLSearchParams();
  formParams.append('gentype', 'multiple');
  formParams.append('duration', '2');
  formParams.append('duration-unit', 'hour_Hours');
  formParams.append('key', sessionKey);
  formParams.append('createToNum', count.toString());
  formParams.append('guest-wlan', wlanName);
  formParams.append('shared', 'true');
  formParams.append('reauth', 'false');
  formParams.append('limitnumber', '2');
  formParams.append('device', '2');
  formParams.append('enableLimit', 'on');
  formParams.append('createBy', 'guestpass');
  formParams.append('self-service', 'off');

  const response = await client.post('/admin/mon_createguest.jsp', formParams, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
      'X-CSRF-Token': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  const responseText = response.data;

  // Parse tokens from response
  const tokenRegex = /batchEmailData\.push\('([^|]+)\|([^|]+)\|'\);/g;
  const tokens = [];
  let match;
  while ((match = tokenRegex.exec(responseText)) !== null) {
    tokens.push({
      username: match[1],
      password: match[2]
    });
  }

  logger.log(`✅ Created ${tokens.length} guest passes`);

  return { tokens };
}

async function testWLANClickSelection() {
  logger.log('='.repeat(80));
  logger.log('🧪 TEST: WLAN Selection via "Click" (Client Status API)');
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

    const targetWLAN = 'TXH-Guest';

    logger.log(`\n🎯 Target WLAN: "${targetWLAN}"`);
    logger.log('─'.repeat(80));
    logger.log('Test Flow:');
    logger.log('  1. "Click" on WLAN by getting client status');
    logger.log('  2. Get session key (should be text-based for selected WLAN)');
    logger.log('  3. Create 2 tokens');
    logger.log('─'.repeat(80));

    // Step 1: Select WLAN by getting client status (simulates clicking on WLAN)
    const selected = await selectWLANByGettingClientStatus(client, csrfToken, targetWLAN);
    if (!selected) {
      logger.log('❌ Failed to select WLAN');
      return;
    }

    // Step 2: Get session key
    const sessionData = await getGuestPassSessionKey(client, csrfToken);

    // Check if we got text-based key
    const isTextBased = /^[A-Z]{5}-[A-Z]{5}$/.test(sessionData.key);

    if (!isTextBased) {
      logger.log('\n⚠️  Session key is still digit-based. The "click" API may not be the selection mechanism.');
      logger.log('   Or there may be an additional step needed.');
    } else {
      // Step 3: Create tokens
      const tokenData = await createGuestPasses(client, csrfToken, targetWLAN, sessionData.key, 2);

      // Final Summary
      logger.log('\n' + '='.repeat(80));
      logger.log('🎉 TEST COMPLETED!');
      logger.log('='.repeat(80));
      logger.log(`WLAN Name:       ${targetWLAN}`);
      logger.log(`Session Key:     ${sessionData.key}`);
      logger.log(`Key Format:      ${isTextBased ? '✅ TEXT-BASED' : '❌ DIGIT-BASED'}`);
      logger.log(`Tokens Created:  ${tokenData.tokens.length}`);
      logger.log('─'.repeat(80));
      logger.log('');
      logger.log('📋 GENERATED TOKENS:');
      logger.log('');

      tokenData.tokens.forEach((token, index) => {
        logger.log(`Token ${index + 1}:`);
        logger.log(`  Username: ${token.username}`);
        logger.log(`  Password: ${token.password}`);
        logger.log(`  Format:   ${/^[A-Z]{5}-[A-Z]{5}$/.test(token.password) ? '✅ TEXT (XXXXX-XXXXX)' : '❌ DIGITS'}`);
        logger.log('');
      });

      logger.log('='.repeat(80));
    }

  } catch (error) {
    logger.logError('Test failed', error);
  }
}

testWLANClickSelection();
