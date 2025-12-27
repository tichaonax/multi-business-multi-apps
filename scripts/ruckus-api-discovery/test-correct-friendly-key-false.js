const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * CORRECTED TEST: enable-friendly-key='false' generates text-based tokens
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

async function updateWLANWithCorrectSetting(client, csrfToken, wlanId, wlanName, guestServiceId) {
  logger.log(`\n🔧 Step 1: Updating WLAN "${wlanName}" - Setting enable-friendly-key='false' for TEXT tokens...`);

  const updaterId = generateUpdaterId('wlansvc-list');

  // CORRECTED: enable-friendly-key='false' generates TEXT-BASED tokens (XXXXX-XXXXX)
  const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${wlanName}' ssid='${wlanName}' description='${wlanName} - Text Tokens Enabled' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' id='${wlanId}' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  if (response.data.includes('/>')) {
    logger.log(`✅ WLAN updated successfully`);
    logger.log(`   enable-friendly-key='false' → Text-based tokens enabled`);
    return true;
  }
  throw new Error('Failed to update WLAN');
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
  logger.log(`✅ Session key received: ${data.key}`);
  return {
    wlanName: data.wlanName,
    key: data.key
  };
}

async function createGuestPasses(client, csrfToken, wlanName, sessionKey, count = 2) {
  logger.log(`\n🎫 Step 2: Creating ${count} guest passes...`);

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

  // Parse tokens
  const tokenRegex = /batchEmailData\.push\('([^|]+)\|([^|]+)\|'\);/g;
  const tokens = [];
  let match;
  while ((match = tokenRegex.exec(responseText)) !== null) {
    tokens.push({
      username: match[1],
      password: match[2]
    });
  }

  const createdMatch = responseText.match(/guestCreated\s*=\s*'([^']+)'/);
  const expiresMatch = responseText.match(/guestExpires\s*=\s*'([^']+)'/);

  logger.log(`✅ Created ${tokens.length} guest passes`);

  return {
    tokens,
    created: createdMatch ? createdMatch[1] : 'Unknown',
    expires: expiresMatch ? expiresMatch[1] : 'Unknown'
  };
}

async function runCorrectedTest() {
  logger.log('='.repeat(80));
  logger.log('🧪 CORRECTED TEST: enable-friendly-key=\'false\' for Text Tokens');
  logger.log('='.repeat(80));
  logger.log('IMPORTANT DISCOVERY:');
  logger.log('  - enable-friendly-key=\'false\' → TEXT-based tokens (XXXXX-XXXXX) ✅');
  logger.log('  - enable-friendly-key=\'true\'  → DIGIT-based tokens (123456) ❌');
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

    const wlanName = 'TXH-Guest';
    const wlanId = '6';
    const guestServiceId = '1';

    // Step 1: Update WLAN with CORRECT setting
    await updateWLANWithCorrectSetting(client, csrfToken, wlanId, wlanName, guestServiceId);

    // Step 2: Generate tokens
    const sessionData = await getGuestPassSessionKey(client, csrfToken);
    const tokenData = await createGuestPasses(client, csrfToken, wlanName, sessionData.key, 2);

    // Final Summary
    logger.log('\n' + '='.repeat(80));
    logger.log('🎉 CORRECTED TEST COMPLETED!');
    logger.log('='.repeat(80));
    logger.log(`WLAN Name:          ${wlanName}`);
    logger.log(`WLAN ID:            ${wlanId}`);
    logger.log(`Setting:            enable-friendly-key='false'`);
    logger.log(`Tokens Created:     ${tokenData.tokens.length}`);
    logger.log(`Created:            ${tokenData.created}`);
    logger.log(`Expires:            ${tokenData.expires}`);
    logger.log('─'.repeat(80));
    logger.log('');
    logger.log('📋 GENERATED TOKENS:');
    logger.log('');

    tokenData.tokens.forEach((token, index) => {
      const isTextBased = /^[A-Z]{5}-[A-Z]{5}$/.test(token.password);
      logger.log(`Token ${index + 1}:`);
      logger.log(`  Username: ${token.username}`);
      logger.log(`  Password: ${token.password}`);
      logger.log(`  Format:   ${isTextBased ? '✅ TEXT-BASED (XXXXX-XXXXX)' : '❌ DIGIT-BASED'}`);
      logger.log('');
    });

    logger.log('─'.repeat(80));
    logger.log('✅ Final Validation:');
    logger.log('   1. Connect to WiFi SSID: "TXH-Guest"');
    logger.log('   2. Open browser (should redirect to captive portal)');
    logger.log('   3. Enter one of the tokens above');
    logger.log('   4. Verify internet access works');
    logger.log('   5. Confirm tokens are TEXT format (XXXXX-XXXXX)');
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Test failed', error);
  }
}

runCorrectedTest();
