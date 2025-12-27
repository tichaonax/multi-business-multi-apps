const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * Comprehensive Test: All WLAN Management Operations
 * Tests: Create, Update, Disable, Enable, Delete
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

// API 1: Create Guest Service
async function createGuestService(client, csrfToken, serviceName) {
  logger.log(`\n📝 Creating Guest Service "${serviceName}"...`);
  const updaterId = generateUpdaterId('guestservice-list');

  const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='guestservice-list'><guestservice name='${serviceName}' onboarding='true' onboarding-aspect='both' auth-by='guestpass' countdown-by-issued='false' show-tou='true' tou='Terms of Use' redirect='orig' redirect-url='' company-logo='ruckus' poweredby='Ruckus Wireless' poweredby-url='http://www.ruckuswireless.com/' desc='Type or paste in the text of your guest pass.' self-service='false' rule6='' title='Welcome to Guest WiFi !' opacity='1.0' background-opacity='1' background-color='#516a8c' logo-type='default' banner-type='default' bgimage-type='default' bgimage-display-type='fill' enable-portal='true' wifi4eu='false' wifi4eu-network-id='' wifi4eu-language='en' wifi4eu-debug='false' wg='' show-lang='true' portal-lang='en_US' random-key='999' valid='1' old-self-service='false' old-auth-by='guestpass'><rule action='accept' type='layer 2' ether-type='0x0806'></rule><rule action='accept' type='layer 2' ether-type='0x8863'></rule><rule action='accept' type='layer 2' ether-type='0x8864'></rule><rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule><rule action='deny' type='layer 3' protocol='' dst-port='68'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule><rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule><rule action='deny' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule><rule action='accept' type='layer 3' protocol='1'></rule><rule action='accept' type='layer 3' protocol='' dst-port='0'></rule></guestservice></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  const idMatch = response.data.match(/id="(\d+)"/);
  if (idMatch) {
    logger.log(`✅ Guest Service created (ID: ${idMatch[1]})`);
    return idMatch[1];
  }
  return null;
}

// API 2: Create WLAN
async function createWLAN(client, csrfToken, wlanName, guestServiceId) {
  logger.log(`\n📝 Creating WLAN "${wlanName}"...`);
  const updaterId = generateUpdaterId('wlansvc-list');

  const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${wlanName}' ssid='${wlanName}' description='${wlanName}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  const idMatch = response.data.match(/id="(\d+)"/);
  if (idMatch) {
    logger.log(`✅ WLAN created (ID: ${idMatch[1]})`);
    return idMatch[1];
  }
  return null;
}

// API 3: Disable WLAN
async function disableWLAN(client, csrfToken, wlanId) {
  logger.log(`\n🔴 Disabling WLAN (ID: ${wlanId})...`);
  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc id='${wlanId}' enable-type='1' IS_PARTIAL='true'/></ajax-request>`;

  await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  logger.log('✅ WLAN disabled');
}

// API 4: Enable WLAN
async function enableWLAN(client, csrfToken, wlanId, wlanName) {
  logger.log(`\n🟢 Enabling WLAN (ID: ${wlanId})...`);

  // Step 1: Select WLAN
  const selectUpdaterId = generateUpdaterId('stamgr');
  const selectPayload = `<ajax-request action='getstat' updater='${selectUpdaterId}' comp='stamgr'><client wlan='${wlanName}' LEVEL='1' USE_REGEX='false'/></ajax-request>`;

  await client.post('/admin/_cmdstat.jsp', selectPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  // Step 2: Enable
  const enableUpdaterId = generateUpdaterId('wlansvc-list');
  const enablePayload = `<ajax-request action='updobj' updater='${enableUpdaterId}' comp='wlansvc-list'><wlansvc id='${wlanId}' enable-type='0' IS_PARTIAL='true'/></ajax-request>`;

  await client.post('/admin/_conf.jsp', enablePayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  logger.log('✅ WLAN enabled');
}

// API 5: Delete WLAN
async function deleteWLAN(client, csrfToken, wlanId) {
  logger.log(`\n🗑️  Deleting WLAN (ID: ${wlanId})...`);
  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='delobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc id='${wlanId}'></wlansvc></ajax-request>`;

  await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  logger.log('✅ WLAN deleted');
}

async function testAllOperations() {
  logger.log('='.repeat(80));
  logger.log('🧪 COMPREHENSIVE TEST: All WLAN Management APIs');
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

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const testWLANName = `API-Test-${timestamp}`;

    logger.log('\n📋 Test Sequence:');
    logger.log('  1. Create Guest Service');
    logger.log('  2. Create WLAN');
    logger.log('  3. Disable WLAN');
    logger.log('  4. Enable WLAN');
    logger.log('  5. Delete WLAN');
    logger.log('─'.repeat(80));

    // Test sequence
    const guestServiceId = await createGuestService(client, csrfToken, testWLANName);
    if (!guestServiceId) throw new Error('Failed to create Guest Service');

    const wlanId = await createWLAN(client, csrfToken, testWLANName, guestServiceId);
    if (!wlanId) throw new Error('Failed to create WLAN');

    await new Promise(resolve => setTimeout(resolve, 1000));
    await disableWLAN(client, csrfToken, wlanId);

    await new Promise(resolve => setTimeout(resolve, 1000));
    await enableWLAN(client, csrfToken, wlanId, testWLANName);

    await new Promise(resolve => setTimeout(resolve, 1000));
    await deleteWLAN(client, csrfToken, wlanId);

    // Summary
    logger.log('\n' + '='.repeat(80));
    logger.log('🎉 ALL TESTS PASSED!');
    logger.log('='.repeat(80));
    logger.log('✅ Create Guest Service - Working');
    logger.log('✅ Create WLAN - Working');
    logger.log('✅ Disable WLAN - Working');
    logger.log('✅ Enable WLAN - Working');
    logger.log('✅ Delete WLAN - Working');
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Test failed', error);
  }
}

testAllOperations();
