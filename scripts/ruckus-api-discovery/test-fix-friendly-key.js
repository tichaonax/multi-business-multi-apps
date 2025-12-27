const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');
const { deleteWLAN } = require('./test-delete-wlan');

/**
 * Test: Fix friendly key by deleting WLAN without friendly key enabled
 * Then test if session key becomes text-based
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
  logger.log(`📋 Session Key: ${data.key}`);
  logger.log(`   Format: ${/^[A-Z]{5}-[A-Z]{5}$/.test(data.key) ? '✅ TEXT-BASED' : '❌ DIGIT-BASED'}`);

  return data;
}

async function testFixFriendlyKey() {
  logger.log('='.repeat(80));
  logger.log('🧪 TEST: Fix Friendly Key by Removing Non-Friendly WLANs');
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

    logger.log('\n📊 Current State:');
    logger.log('   Guest WLANs exist:');
    logger.log('   1. HXI Eats Guest (id=2) - NO friendly key ❌');
    logger.log('   2. Fashions Guest Access (id=3) - HAS friendly key ✅');
    logger.log('   3. Test-WLAN-... (id=5) - HAS friendly key ✅');
    logger.log('   4. TXH-Guest (id=6) - HAS friendly key ✅');
    logger.log('');
    logger.log('💡 Strategy: Delete "HXI Eats Guest" so all WLANs have friendly key');
    logger.log('─'.repeat(80));

    // Step 1: Test current session key
    logger.log('\n🔍 BEFORE: Testing session key...');
    const beforeKey = await getGuestPassSessionKey(client, csrfToken);

    // Step 2: Delete HXI Eats Guest
    logger.log('\n🗑️  Deleting "HXI Eats Guest" (WLAN ID: 2)...');
    const deleted = await deleteWLAN(client, csrfToken, '2', 'HXI Eats Guest');

    if (!deleted) {
      logger.log('⚠️  Failed to delete WLAN. Test cannot continue.');
      return;
    }

    // Step 3: Test session key after deletion
    logger.log('\n🔍 AFTER: Testing session key...');
    const afterKey = await getGuestPassSessionKey(client, csrfToken);

    // Summary
    logger.log('\n' + '='.repeat(80));
    logger.log('📊 TEST RESULTS');
    logger.log('='.repeat(80));
    logger.log(`BEFORE deletion:`);
    logger.log(`  Session Key:  ${beforeKey.key}`);
    logger.log(`  Format:       ${/^[A-Z]{5}-[A-Z]{5}$/.test(beforeKey.key) ? 'TEXT' : 'DIGITS'}`);
    logger.log('');
    logger.log(`AFTER deletion:`);
    logger.log(`  Session Key:  ${afterKey.key}`);
    logger.log(`  Format:       ${/^[A-Z]{5}-[A-Z]{5}$/.test(afterKey.key) ? 'TEXT ✅' : 'DIGITS ❌'}`);
    logger.log('─'.repeat(80));

    if (/^[A-Z]{5}-[A-Z]{5}$/.test(afterKey.key)) {
      logger.log('🎉 SUCCESS! Session key is now text-based!');
      logger.log('');
      logger.log('💡 Conclusion: When all guest WLANs have friendly key enabled,');
      logger.log('   mon_guestdata.jsp returns a text-based session key.');
    } else {
      logger.log('⚠️  Session key is still digit-based. Further investigation needed.');
    }
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Test failed', error);
  }
}

testFixFriendlyKey();
