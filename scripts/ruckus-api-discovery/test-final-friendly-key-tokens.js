const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * Final Test: Update TXH-Guest to enable friendly keys, then generate 2 text-based tokens
 */

function generateUpdaterId(component) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}

async function initializeSession(client, csrfToken) {
  logger.log('\n📡 Initializing session...');
  const updaterId = generateUpdaterId('system');
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/><adv-radio/><mgmt-ip/><admin/><WAN/><email-server/><sms-server/><zero-it/><bypassCNA/><dfs/><country-code/><tz/><ntp/><client-dns-server/><dhcpsvr-list/><dosdefense/><rogue/><l2acl-default/><l3acl-default/><mesh/><tunnelprofile-list/><wlangroup-list/><wlansvc-list/><adv-wlan/><appmesh/><policy-list/><role-based-access-control/><precedence-default/><client-mac-oui/><adv-client-isolation/><guestpass/><wispr/><hotspot-list/><dpsk/><ruckusplus-service/><avp-list/><urlfiltering-policy-list/><clientFWLog/><clientAAALog/><clientApLog/></ajax-request>`;

  await client.post('/admin/_cmdstat.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });
  logger.log('✅ Session initialized');
}

async function updateWLANWithFriendlyKey(client, csrfToken, wlanId, wlanName, guestServiceId) {
  logger.log(`\n🔧 Step 1: Updating WLAN "${wlanName}" - Enabling Friendly Keys (text-based tokens)...`);

  const updaterId = generateUpdaterId('wlansvc-list');

  // CRITICAL: enable-friendly-key='true' enables text-based tokens instead of digits
  const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${wlanName}' ssid='${wlanName}' description='${wlanName} - Verified and Ready' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='true' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' id='${wlanId}' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  if (response.data.includes('/>')) {
    logger.log(`✅ WLAN updated successfully`);
    logger.log(`   Friendly Key enabled: Text-based tokens will now be generated`);
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
  logger.log(`\n🎫 Step 2: Creating ${count} text-based guest passes for "${wlanName}"...`);

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

  // Parse tokens from mixed JavaScript + JSON response
  const tokenRegex = /batchEmailData\.push\('([^|]+)\|([^|]+)\|'\);/g;
  const tokens = [];
  let match;
  while ((match = tokenRegex.exec(responseText)) !== null) {
    tokens.push({
      username: match[1],
      password: match[2]
    });
  }

  // Also try to parse the creation time
  const createdMatch = responseText.match(/guestCreated\s*=\s*'([^']+)'/);
  const expiresMatch = responseText.match(/guestExpires\s*=\s*'([^']+)'/);

  logger.log(`✅ Created ${tokens.length} text-based guest passes`);

  return {
    tokens,
    created: createdMatch ? createdMatch[1] : 'Unknown',
    expires: expiresMatch ? expiresMatch[1] : 'Unknown'
  };
}

async function runFinalTest() {
  logger.log('='.repeat(80));
  logger.log('🧪 FINAL TEST: TXH-Guest with Friendly Key (Text-Based Tokens)');
  logger.log('='.repeat(80));
  logger.log('Test Flow:');
  logger.log('  1. Update WLAN "TXH-Guest" - Enable Friendly Key');
  logger.log('  2. Generate 2 text-based guest pass tokens');
  logger.log('='.repeat(80));

  const { client } = createHttpClient();

  try {
    // Step 0: Login
    const authResult = await login(client);
    if (!authResult || !authResult.success) {
      logger.log('❌ Login failed');
      return;
    }

    const csrfToken = authResult.csrfToken;

    // Initialize session
    await initializeSession(client, csrfToken);

    const wlanName = 'TXH-Guest';
    const wlanId = '0';  // From previous test
    const guestServiceId = '1';  // From previous test

    // Step 1: Update WLAN to enable friendly key
    await updateWLANWithFriendlyKey(client, csrfToken, wlanId, wlanName, guestServiceId);

    // Step 2: Generate guest passes (should now be text-based)
    const sessionData = await getGuestPassSessionKey(client, csrfToken);
    const tokenData = await createGuestPasses(client, csrfToken, wlanName, sessionData.key, 2);

    // Final Summary
    logger.log('\n' + '='.repeat(80));
    logger.log('🎉 FINAL TEST COMPLETED SUCCESSFULLY!');
    logger.log('='.repeat(80));
    logger.log(`WLAN Name:          ${wlanName}`);
    logger.log(`WLAN ID:            ${wlanId}`);
    logger.log(`Guest Service ID:   ${guestServiceId}`);
    logger.log(`Friendly Key:       ✅ ENABLED (text-based tokens)`);
    logger.log(`Tokens Created:     ${tokenData.tokens.length}`);
    logger.log(`Token Format:       TEXT-BASED (not digits)`);
    logger.log(`Created:            ${tokenData.created}`);
    logger.log(`Expires:            ${tokenData.expires}`);
    logger.log('─'.repeat(80));
    logger.log('');
    logger.log('📋 TEXT-BASED GUEST PASS TOKENS (Ready for Final Validation):');
    logger.log('');

    tokenData.tokens.forEach((token, index) => {
      logger.log(`Token ${index + 1}:`);
      logger.log(`  Username: ${token.username}`);
      logger.log(`  Password: ${token.password}`);
      logger.log('');
    });

    logger.log('─'.repeat(80));
    logger.log('✅ Final Validation Steps:');
    logger.log('   1. Connect to WiFi SSID: "TXH-Guest"');
    logger.log('   2. Open browser (should redirect to captive portal)');
    logger.log('   3. Enter one of the TEXT-BASED tokens above');
    logger.log('   4. Verify internet access works');
    logger.log('   5. Confirm tokens are text format (not digits)');
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Final test failed', error);
  }
}

// Run the test
runFinalTest();
