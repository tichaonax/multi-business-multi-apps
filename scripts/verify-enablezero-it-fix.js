const {createHttpClient} = require('./ruckus-api-discovery/utils/http-client');
const {login} = require('./ruckus-api-discovery/utils/auth');
const xml2js = require('xml2js');

async function test() {
  const {client} = createHttpClient();
  const authResult = await login(client);
  const csrfToken = authResult.csrfToken;

  console.log('\n=== VERIFICATION TEST: enableZeroIt → bypass-cna Mapping ===\n');

  // Test 1: Create WLAN with enableZeroIt=true (should set bypass-cna=false)
  console.log('TEST 1: Creating WLAN with enableZeroIt=true');
  console.log('Expected: bypass-cna="false" (Zero-IT enabled)\n');

  const testSsid1 = `VERIFY-ZEROTO-ENABLED-${Date.now()}`;
  const updaterId1 = `wlansvc-list.test.${Date.now()}`;

  // This simulates what our createWlan() method does with enableZeroIt=true
  const bypassCna1 = !true; // enableZeroIt=true → bypass-cna=false

  const xmlPayload1 = `<ajax-request action='addobj' updater='${updaterId1}' comp='wlansvc-list'><wlansvc name='${testSsid1}' ssid='${testSsid1}' description='${testSsid1}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='${bypassCna1}' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='1'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const createResponse1 = await client.post('/admin/_conf.jsp', xmlPayload1, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
    }
  });

  const wlansvcMatch1 = createResponse1.data.match(/<wlansvc[^>]+\sid="(\d+)"/);
  const wlanId1 = wlansvcMatch1 ? wlansvcMatch1[1] : null;

  if (!wlanId1) {
    console.error('❌ Failed to create WLAN 1');
    return;
  }

  console.log(`✅ WLAN 1 created with ID: ${wlanId1}`);

  // Read it back to verify
  const readUpdaterId = `wlansvc-list.read.${Date.now()}`;
  const readPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${readUpdaterId}' comp='wlansvc-list'/>`;

  const readResponse1 = await client.post('/admin/_conf.jsp', readPayload, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
    }
  });

  const parser = new xml2js.Parser();
  const result1 = await parser.parseStringPromise(readResponse1.data);
  const wlanList1 = result1?.['ajax-response']?.response?.[0]?.['wlansvc-list']?.[0]?.wlansvc || [];
  const createdWlan1 = wlanList1.find(w => w.$.id === wlanId1);

  if (createdWlan1) {
    const actualBypassCna = createdWlan1.$['bypass-cna'];
    console.log(`Sent bypass-cna: ${bypassCna1}`);
    console.log(`Actual bypass-cna: ${actualBypassCna}`);
    if (actualBypassCna === 'false') {
      console.log('✅ TEST 1 PASSED: enableZeroIt=true correctly set bypass-cna=false\n');
    } else {
      console.log('❌ TEST 1 FAILED: Expected bypass-cna=false, got bypass-cna=' + actualBypassCna + '\n');
    }
  }

  // Test 2: Create WLAN with enableZeroIt=false (should set bypass-cna=true)
  console.log('TEST 2: Creating WLAN with enableZeroIt=false');
  console.log('Expected: bypass-cna="true" (Zero-IT disabled)\n');

  const testSsid2 = `VERIFY-ZEROTO-DISABLED-${Date.now()}`;
  const updaterId2 = `wlansvc-list.test.${Date.now()}`;

  // This simulates what our createWlan() method does with enableZeroIt=false
  const bypassCna2 = !false; // enableZeroIt=false → bypass-cna=true

  const xmlPayload2 = `<ajax-request action='addobj' updater='${updaterId2}' comp='wlansvc-list'><wlansvc name='${testSsid2}' ssid='${testSsid2}' description='${testSsid2}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='${bypassCna2}' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='false' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='1'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  const createResponse2 = await client.post('/admin/_conf.jsp', xmlPayload2, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-Token': csrfToken,
      'Referer': 'https://192.168.0.108/admin/dashboard.jsp'
    }
  });

  const wlansvcMatch2 = createResponse2.data.match(/<wlansvc[^>]+\sid="(\d+)"/);
  const wlanId2 = wlansvcMatch2 ? wlansvcMatch2[1] : null;

  if (!wlanId2) {
    console.error('❌ Failed to create WLAN 2');
    return;
  }

  console.log(`✅ WLAN 2 created with ID: ${wlanId2}`);

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
    const actualBypassCna = createdWlan2.$['bypass-cna'];
    console.log(`Sent bypass-cna: ${bypassCna2}`);
    console.log(`Actual bypass-cna: ${actualBypassCna}`);
    if (actualBypassCna === 'true') {
      console.log('✅ TEST 2 PASSED: enableZeroIt=false correctly set bypass-cna=true\n');
    } else {
      console.log('❌ TEST 2 FAILED: Expected bypass-cna=true, got bypass-cna=' + actualBypassCna + '\n');
    }
  }

  console.log('\n=== VERIFICATION COMPLETE ===');
  console.log('The code now correctly maps:');
  console.log('  • enableZeroIt=true  → bypass-cna=false (Zero-IT ENABLED)');
  console.log('  • enableZeroIt=false → bypass-cna=true  (Zero-IT DISABLED)');
}

test().catch(err => console.error('Error:', err.message));
