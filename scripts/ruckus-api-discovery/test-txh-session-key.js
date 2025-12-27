const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * Test: Check what session key format TXH-Guest returns
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

async function getGuestPassSessionKey(client, csrfToken) {
  logger.log('\n🔑 Getting guest pass session key for TXH-Guest...');

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
  logger.log(`📋 Response data:`);
  logger.log(`   WLAN Name: ${data.wlanName}`);
  logger.log(`   Session Key: ${data.key}`);
  logger.log(`   Key Format: ${/^[A-Z]{5}-[A-Z]{5}$/.test(data.key) ? '✅ TEXT-BASED (XXXXX-XXXXX)' : '❌ DIGIT-BASED'}`);

  return data;
}

async function testSessionKey() {
  logger.log('='.repeat(80));
  logger.log('🧪 TEST: TXH-Guest Session Key Format');
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

    const sessionData = await getGuestPassSessionKey(client, csrfToken);

    logger.log('\n' + '='.repeat(80));
    logger.log('📊 RESULT');
    logger.log('='.repeat(80));
    logger.log(`Expected: Text-based session key (XXXXX-XXXXX format)`);
    logger.log(`Actual:   ${sessionData.key}`);
    logger.log(`Match:    ${/^[A-Z]{5}-[A-Z]{5}$/.test(sessionData.key) ? '✅ CORRECT' : '❌ WRONG FORMAT'}`);
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Test failed', error);
  }
}

testSessionKey();
