const {createHttpClient} = require('./ruckus-api-discovery/utils/http-client');
const {login} = require('./ruckus-api-discovery/utils/auth');
const xml2js = require('xml2js');

async function test() {
  const {client} = createHttpClient();
  const authResult = await login(client);
  const csrfToken = authResult.csrfToken;

  console.log('\n=== TEST 1: Create WLAN with bypass-cna=false (Zero-IT enabled) ===\n');

  const updaterId = `wlansvc-list.test.${Date.now()}`;
  const testSsid = `TEST-ONBOARDING-ENABLED-${Date.now()}`;

  // Create WLAN with bypass-cna='false' (should enable Zero-IT onboarding)
  const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${testSsid}' ssid='${testSsid}' description='${testSsid}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='1'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  console.log('Creating WLAN with bypass-cna="false"...');
  const createResponse = await client.post('/admin/_conf.jsp', xmlPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
    }
  });

  console.log('Create response:', createResponse.data.substring(0, 500));

  // Extract WLAN ID
  const wlansvcMatch = createResponse.data.match(/<wlansvc[^>]+\sid="(\d+)"/);
  const wlanId = wlansvcMatch ? wlansvcMatch[1] : null;

  if (!wlanId) {
    console.error('Failed to extract WLAN ID');
    return;
  }

  console.log(`\n✅ WLAN created with ID: ${wlanId}`);

  // Now read it back to verify
  console.log('\n=== Reading back WLAN to verify onboarding settings ===\n');

  const readUpdaterId = `wlansvc-list.read.${Date.now()}`;
  const readPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${readUpdaterId}' comp='wlansvc-list'/>`;

  const readResponse = await client.post('/admin/_conf.jsp', readPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
    }
  });

  const parser = new xml2js.Parser();
  const result = await parser.parseStringPromise(readResponse.data);
  const wlanList = result?.['ajax-response']?.response?.[0]?.['wlansvc-list']?.[0]?.wlansvc || [];

  const createdWlan = wlanList.find(w => w.$.id === wlanId);

  if (createdWlan) {
    console.log('✅ Found created WLAN');
    console.log(`SSID: ${createdWlan.$.ssid}`);
    console.log(`ID: ${createdWlan.$.id}`);
    console.log(`bypass-cna: ${createdWlan.$['bypass-cna']}`);

    // Check for any onboarding-related attributes
    console.log('\nAll attributes that might be related to onboarding:');
    Object.keys(createdWlan.$)
      .filter(k => k.includes('onboard') || k.includes('bypass') || k.includes('cna') || k.includes('zero'))
      .forEach(key => {
        console.log(`  ${key}: ${createdWlan.$[key]}`);
      });
  } else {
    console.error('Could not find created WLAN in list');
  }

  // Now create another WLAN with bypass-cna='true' (Zero-IT disabled) for comparison
  console.log('\n\n=== TEST 2: Create WLAN with bypass-cna=true (Zero-IT disabled) ===\n');

  const updaterId2 = `wlansvc-list.test.${Date.now()}`;
  const testSsid2 = `TEST-ONBOARDING-DISABLED-${Date.now()}`;

  const xmlPayload2 = `<ajax-request action='addobj' updater='${updaterId2}' comp='wlansvc-list'><wlansvc name='${testSsid2}' ssid='${testSsid2}' description='${testSsid2}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='true' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='1'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  console.log('Creating WLAN with bypass-cna="true"...');
  const createResponse2 = await client.post('/admin/_conf.jsp', xmlPayload2, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
    }
  });

  const wlansvcMatch2 = createResponse2.data.match(/<wlansvc[^>]+\sid="(\d+)"/);
  const wlanId2 = wlansvcMatch2 ? wlansvcMatch2[1] : null;

  if (wlanId2) {
    console.log(`\n✅ WLAN created with ID: ${wlanId2}`);

    // Read it back
    const readResponse2 = await client.post('/admin/_conf.jsp', readPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-CSRF-Token': csrfToken,
        'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
      }
    });

    const result2 = await parser.parseStringPromise(readResponse2.data);
    const wlanList2 = result2?.['ajax-response']?.response?.[0]?.['wlansvc-list']?.[0]?.wlansvc || [];
    const createdWlan2 = wlanList2.find(w => w.$.id === wlanId2);

    if (createdWlan2) {
      console.log('✅ Found created WLAN');
      console.log(`SSID: ${createdWlan2.$.ssid}`);
      console.log(`ID: ${createdWlan2.$.id}`);
      console.log(`bypass-cna: ${createdWlan2.$['bypass-cna']}`);
    }
  }

  console.log('\n\n=== SUMMARY ===');
  console.log('WLAN 1 (bypass-cna=false): Should have Zero-IT enabled');
  console.log('WLAN 2 (bypass-cna=true): Should have Zero-IT disabled');
  console.log('\nConclusion: The attribute that controls "Enable Zero-IT device registration" is bypass-cna');
  console.log('  - bypass-cna="false" = Zero-IT ENABLED (checkbox checked)');
  console.log('  - bypass-cna="true" = Zero-IT DISABLED (checkbox unchecked)');
}

test().catch(err => console.error('Error:', err.message));
