/**
 * Test Complete Create and Update Flow
 */

const { createHttpClient } = require('./ruckus-api-discovery/utils/http-client');
const { login } = require('./ruckus-api-discovery/utils/auth');
const logger = require('./ruckus-api-discovery/utils/request-logger');
const config = require('./ruckus-api-discovery/config');

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

async function createWLAN(client, csrfToken, wlanName) {
  logger.log(`\n📝 Creating WLAN "${wlanName}"...`);
  const updaterId = generateUpdaterId('wlansvc-list');

  const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${wlanName}' ssid='${wlanName}' description='${wlanName}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='1'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  logger.log('\n📋 CREATE RESPONSE:');
  logger.log(response.data);

  const idMatch = response.data.match(/id="([^"]+)"/);
  if (idMatch) {
    logger.log(`\n✅ WLAN created - Response ID: "${idMatch[1]}"`);
    return idMatch[1];
  }
  return null;
}

async function updateWLAN(client, csrfToken, wlanId, newName) {
  logger.log(`\n🔧 Updating WLAN ID "${wlanId}" to "${newName}"...`);
  const updaterId = generateUpdaterId('wlansvc-list');

  const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${newName}' ssid='${newName}' description='${newName}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' id='${wlanId}' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='1'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  logger.log('\n📋 UPDATE RESPONSE:');
  logger.log(response.data);

  if (response.data.includes('<response') && response.data.includes('/>')) {
    logger.log('\n✅ WLAN updated successfully');
    return true;
  }
  return false;
}

async function queryWLANs(client, csrfToken) {
  logger.log('\n🔍 Querying all WLANs...');
  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  const response = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
    }
  });

  logger.log('\n📋 QUERY RESPONSE (first 2000 chars):');
  logger.log(response.data.substring(0, 2000));

  const wlanPattern = /<wlansvc [^>]+>/g;
  const matches = response.data.match(wlanPattern);

  logger.log('\n📊 WLANs found:');
  if (matches) {
    matches.forEach((match, i) => {
      const idMatch = match.match(/id="([^"]+)"/);
      const nameMatch = match.match(/name="([^"]+)"/);
      const ssidMatch = match.match(/ssid="([^"]+)"/);
      logger.log(`  ${i + 1}. ID="${idMatch ? idMatch[1] : 'N/A'}" Name="${nameMatch ? nameMatch[1] : 'N/A'}" SSID="${ssidMatch ? ssidMatch[1] : 'N/A'}"`);
    });
  }
}

async function test() {
  logger.log('='.repeat(80));
  logger.log('🧪 CREATE AND UPDATE FLOW TEST');
  logger.log('='.repeat(80));

  const { client } = createHttpClient();

  try {
    // Login
    const authResult = await login(client);
    if (!authResult || !authResult.success) {
      logger.log('❌ Login failed');
      return;
    }

    const csrfToken = authResult.csrfToken;
    await initializeSession(client, csrfToken);

    const timestamp = Date.now();
    const originalName = `TestWLAN-${timestamp}`;
    const updatedName = `TestWLAN-${timestamp}-UPDATED`;

    // Create
    const wlanId = await createWLAN(client, csrfToken, originalName);
    if (!wlanId) {
      logger.log('❌ Failed to create WLAN');
      return;
    }

    logger.log('\n' + '─'.repeat(80));
    logger.log(`📌 Created WLAN ID: "${wlanId}"`);
    logger.log(`📌 Original Name: "${originalName}"`);
    logger.log('─'.repeat(80));

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query to see what's on device
    await queryWLANs(client, csrfToken);

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update
    const updated = await updateWLAN(client, csrfToken, wlanId, updatedName);

    logger.log('\n' + '─'.repeat(80));
    logger.log(`📌 Update attempted with ID: "${wlanId}"`);
    logger.log(`📌 New Name: "${updatedName}"`);
    logger.log(`📌 Result: ${updated ? '✅ Success' : '❌ Failed'}`);
    logger.log('─'.repeat(80));

    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query again to verify
    await queryWLANs(client, csrfToken);

  } catch (error) {
    logger.logError('Test failed', error);
  }
}

test();
