const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * End-to-End Test: Create WLAN, Edit it, Generate Tokens
 * WLAN Name: "TXH-Guest"
 * Tokens: 2
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

async function createGuestService(client, csrfToken, serviceName) {
  logger.log(`\n🔧 Step 1: Creating Guest Service "${serviceName}"...`);

  const updaterId = generateUpdaterId('guestservice-list');
  const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='guestservice-list'><guestservice name='${serviceName}' onboarding='true' onboarding-aspect='both' auth-by='guestpass' countdown-by-issued='false' show-tou='true' tou='Terms of Use

By accepting this agreement and accessing the wireless network, you acknowledge that you are of legal age, you have read and understood, and agree to be bound by this agreement.
(*) The wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.
(*) You agree not to use the wireless network for any purpose that is unlawful or otherwise prohibited and you are fully responsible for your use.
(*) The wireless network is provided &quot;as is&quot; without warranties of any kind, either expressed or implied.' redirect='orig' redirect-url='' company-logo='ruckus' poweredby='Ruckus Wireless' poweredby-url='http://www.ruckuswireless.com/' desc='Type or paste in the text of your guest pass.' self-service='false' rule6='' title='Welcome to Guest WiFi !' opacity='1.0' background-opacity='1' background-color='#516a8c' logo-type='default' banner-type='default' bgimage-type='default' bgimage-display-type='fill' enable-portal='true' wifi4eu='false' wifi4eu-network-id='' wifi4eu-language='en' wifi4eu-debug='false' wg='' show-lang='true' portal-lang='en_US' random-key='999' valid='1' old-self-service='false' old-auth-by='guestpass'><rule action='accept' type='layer 2' ether-type='0x0806'></rule><rule action='accept' type='layer 2' ether-type='0x8863'></rule><rule action='accept' type='layer 2' ether-type='0x8864'></rule><rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule><rule action='deny' type='layer 3' protocol='' dst-port='68'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule><rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule><rule action='deny' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule><rule action='accept' type='layer 3' protocol='1'></rule><rule action='accept' type='layer 3' protocol='' dst-port='0'></rule></guestservice></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  const idMatch = response.data.match(/id="(\d+)"/);
  if (idMatch) {
    logger.log(`✅ Guest Service created with ID: ${idMatch[1]}`);
    return idMatch[1];
  }
  throw new Error('Failed to create Guest Service');
}

async function createWLAN(client, csrfToken, wlanName, guestServiceId) {
  logger.log(`\n🔧 Step 2: Creating WLAN "${wlanName}"...`);

  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${wlanName}' ssid='${wlanName}' description='${wlanName}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='true' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  const idMatch = response.data.match(/id="(\d+)"/);
  if (idMatch) {
    logger.log(`✅ WLAN created with ID: ${idMatch[1]}`);
    return idMatch[1];
  }
  throw new Error('Failed to create WLAN');
}

async function editWLAN(client, csrfToken, wlanId, wlanName, guestServiceId) {
  logger.log(`\n🔧 Step 3: Editing WLAN "${wlanName}" (updating description)...`);

  const updaterId = generateUpdaterId('wlansvc-list');
  const updatedDescription = `${wlanName} - Verified and Ready`;

  const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${wlanName}' ssid='${wlanName}' description='${updatedDescription}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='true' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' id='${wlanId}' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  if (response.data.includes('/>')) {
    logger.log(`✅ WLAN edited successfully`);
    logger.log(`   Description updated to: "${updatedDescription}"`);
    return true;
  }
  throw new Error('Failed to edit WLAN');
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
  logger.log(`\n🎫 Step 4: Creating ${count} guest passes for "${wlanName}"...`);

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

  logger.log(`✅ Created ${tokens.length} guest passes`);

  return {
    tokens,
    created: createdMatch ? createdMatch[1] : 'Unknown',
    expires: expiresMatch ? expiresMatch[1] : 'Unknown'
  };
}

async function runEndToEndTest() {
  logger.log('='.repeat(80));
  logger.log('🧪 END-TO-END TEST: TXH-Guest WLAN');
  logger.log('='.repeat(80));
  logger.log('Test Flow:');
  logger.log('  1. Create Guest Service');
  logger.log('  2. Create WLAN "TXH-Guest"');
  logger.log('  3. Edit WLAN (verify update works)');
  logger.log('  4. Generate 2 guest pass tokens');
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

    // Step 1: Create Guest Service
    const guestServiceId = await createGuestService(client, csrfToken, wlanName);

    // Step 2: Create WLAN
    const wlanId = await createWLAN(client, csrfToken, wlanName, guestServiceId);

    // Step 3: Edit WLAN (verify update works)
    await editWLAN(client, csrfToken, wlanId, wlanName, guestServiceId);

    // Step 4: Generate guest passes
    const sessionData = await getGuestPassSessionKey(client, csrfToken);
    const tokenData = await createGuestPasses(client, csrfToken, wlanName, sessionData.key, 2);

    // Final Summary
    logger.log('\n' + '='.repeat(80));
    logger.log('🎉 END-TO-END TEST COMPLETED SUCCESSFULLY!');
    logger.log('='.repeat(80));
    logger.log(`WLAN Name:          ${wlanName}`);
    logger.log(`WLAN ID:            ${wlanId}`);
    logger.log(`Guest Service ID:   ${guestServiceId}`);
    logger.log(`Description:        ${wlanName} - Verified and Ready`);
    logger.log(`Tokens Created:     ${tokenData.tokens.length}`);
    logger.log(`Created:            ${tokenData.created}`);
    logger.log(`Expires:            ${tokenData.expires}`);
    logger.log('─'.repeat(80));
    logger.log('');
    logger.log('📋 GUEST PASS TOKENS (Ready for Testing):');
    logger.log('');

    tokenData.tokens.forEach((token, index) => {
      logger.log(`Token ${index + 1}:`);
      logger.log(`  Username: ${token.username}`);
      logger.log(`  Password: ${token.password}`);
      logger.log('');
    });

    logger.log('─'.repeat(80));
    logger.log('✅ Next Steps:');
    logger.log('   1. Connect to WiFi SSID: "TXH-Guest"');
    logger.log('   2. Open browser (should redirect to captive portal)');
    logger.log('   3. Enter one of the tokens above');
    logger.log('   4. Verify internet access works');
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('End-to-end test failed', error);
  }
}

// Run the test
runEndToEndTest();
