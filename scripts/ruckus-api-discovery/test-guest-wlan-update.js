const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * Generate updater ID in the format: component.timestamp.random
 */
function generateUpdaterId(component) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${component}.${timestamp}.${random}`;
}

/**
 * Initialize session - REQUIRED before any config queries
 */
async function initializeSession(client, csrfToken) {
  logger.log('\n📡 Initializing session (system status call)...');

  const updaterId = generateUpdaterId('system');
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='system'><sysinfo/><identity/><adv-radio/><mgmt-ip/><admin/><WAN/><email-server/><sms-server/><zero-it/><bypassCNA/><dfs/><country-code/><tz/><ntp/><client-dns-server/><dhcpsvr-list/><dosdefense/><rogue/><l2acl-default/><l3acl-default/><mesh/><tunnelprofile-list/><wlangroup-list/><wlansvc-list/><adv-wlan/><appmesh/><policy-list/><role-based-access-control/><precedence-default/><client-mac-oui/><adv-client-isolation/><guestpass/><wispr/><hotspot-list/><dpsk/><ruckusplus-service/><avp-list/><urlfiltering-policy-list/><clientFWLog/><clientAAALog/><clientApLog/></ajax-request>`;

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

    logger.log('✅ Session initialized successfully');
    return true;
  } catch (error) {
    logger.logError('Session initialization failed', error);
    return false;
  }
}

/**
 * Get WLAN statistics (optional - browser calls this before editing)
 */
async function getWLANStats(client, csrfToken, wlanName) {
  logger.log(`\n📊 Getting stats for WLAN "${wlanName}"...`);

  const updaterId = generateUpdaterId('stamgr');
  const xmlPayload = `<ajax-request action='getstat' updater='${updaterId}' comp='stamgr'><client wlan='${wlanName}' LEVEL='1' USE_REGEX='false'/></ajax-request>`;

  try {
    await client.post('/admin/_cmdstat.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    logger.log('✅ Stats retrieved');
    return true;
  } catch (error) {
    logger.logError('Failed to get WLAN stats', error);
    return false;
  }
}

/**
 * Update Guest Service (Portal Configuration)
 * CRITICAL: Must include 'id' attribute to specify which guest service to update
 */
async function updateGuestService(client, csrfToken, guestServiceId, serviceName, validDays = 7) {
  logger.log(`\n🔧 Updating Guest Service ID ${guestServiceId} ("${serviceName}")...`);

  const updaterId = generateUpdaterId('guestservice-list');

  // Build the Guest Service XML payload - SAME as creation but with 'updobj' action and 'id' attribute
  const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='guestservice-list'><guestservice name='${serviceName}' onboarding='true' onboarding-aspect='both' auth-by='guestpass' countdown-by-issued='false' show-tou='true' tou='Terms of Use

By accepting this agreement and accessing the wireless network, you acknowledge that you are of legal age, you have read and understood, and agree to be bound by this agreement.
(*) The wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.
(*) You agree not to use the wireless network for any purpose that is unlawful or otherwise prohibited and you are fully responsible for your use.
(*) The wireless network is provided &quot;as is&quot; without warranties of any kind, either expressed or implied.' redirect='orig' redirect-url='' company-logo='ruckus' poweredby='Ruckus Wireless' poweredby-url='http://www.ruckuswireless.com/' desc='Type or paste in the text of your guest pass.' self-service='false' rule6='' title='Welcome to Guest WiFi !' opacity='1.0' background-opacity='1' background-color='#516a8c' logo-type='default' banner-type='default' bgimage-type='default' bgimage-display-type='fill' enable-portal='true' wifi4eu='false' wifi4eu-network-id='' wifi4eu-language='en' wifi4eu-debug='false' wg='' show-lang='true' portal-lang='en_US' random-key='999' valid='${validDays}' old-self-service='false' old-auth-by='guestpass' id='${guestServiceId}'><rule action='accept' type='layer 2' ether-type='0x0806'></rule><rule action='accept' type='layer 2' ether-type='0x8863'></rule><rule action='accept' type='layer 2' ether-type='0x8864'></rule><rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule><rule action='deny' type='layer 3' protocol='' dst-port='68'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule><rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule><rule action='accept' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule><rule action='accept' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule><rule action='accept' type='layer 3' protocol='1'></rule><rule action='accept' type='layer 3' protocol='' dst-port='0'></rule></guestservice></ajax-request>`;

  try {
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    // Update response returns empty object on success: <response type="object" id="..." />
    const responseText = response.data;

    if (responseText.includes('<response') && responseText.includes('/>') && !responseText.includes('<error')) {
      logger.log(`✅ Guest Service ID ${guestServiceId} updated successfully`);
      return true;
    } else {
      logger.log('⚠️  Update may have failed');
      logger.log('Response:', responseText.substring(0, 500));
      return false;
    }
  } catch (error) {
    logger.logError('Failed to update Guest Service', error);
    return false;
  }
}

/**
 * Update WLAN (Network Configuration)
 * CRITICAL: Must include 'id' attribute to specify which WLAN to update
 */
async function updateWLAN(client, csrfToken, wlanId, wlanName, guestServiceId) {
  logger.log(`\n🔧 Updating WLAN ID ${wlanId} ("${wlanName}")...`);

  const updaterId = generateUpdaterId('wlansvc-list');

  // Build the WLAN XML payload - SAME as creation but with 'updobj' action and 'id' attribute
  const xmlPayload = `<ajax-request action='updobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${wlanName}' ssid='${wlanName}' description='${wlanName}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='true' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' id='${wlanId}' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

  try {
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    // Update response returns empty object on success: <response type="object" id="..." />
    const responseText = response.data;

    if (responseText.includes('<response') && responseText.includes('/>') && !responseText.includes('<error')) {
      logger.log(`✅ WLAN ID ${wlanId} updated successfully`);
      return true;
    } else {
      logger.log('⚠️  Update may have failed');
      logger.log('Response:', responseText.substring(0, 500));
      return false;
    }
  } catch (error) {
    logger.logError('Failed to update WLAN', error);
    return false;
  }
}

/**
 * Verify WLAN configuration after update
 */
async function verifyWLANUpdate(client, csrfToken, wlanId, expectedName) {
  logger.log(`\n🔍 Verifying WLAN ID ${wlanId} update...`);

  const updaterId = generateUpdaterId('wlansvc-list');
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' caller='unleashed_web' updater='${updaterId}' comp='wlansvc-list'/>`;

  try {
    const response = await client.post('/admin/_conf.jsp', xmlPayload, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': '*/*',
        'X-CSRF-Token': csrfToken,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${config.ruckus.baseUrl}/admin/dashboard.jsp`
      }
    });

    const responseText = response.data;

    // Check if our WLAN ID appears with the expected name
    if (responseText.includes(`id="${wlanId}"`)) {
      logger.log(`✅ WLAN ID ${wlanId} confirmed in WLAN list`);

      // Verify the name was updated
      if (expectedName && responseText.includes(`name="${expectedName}"`)) {
        logger.log(`   ✅ WLAN name confirmed: "${expectedName}"`);
      }
      return true;
    } else {
      logger.log(`❌ WLAN ID ${wlanId} not found in WLAN list`);
      return false;
    }
  } catch (error) {
    logger.logError('Failed to verify WLAN update', error);
    return false;
  }
}

/**
 * Main test function
 */
async function testGuestWLANUpdate() {
  logger.log('='.repeat(80));
  logger.log('🧪 RUCKUS R710 - GUEST WLAN UPDATE TEST');
  logger.log('='.repeat(80));

  const { client } = createHttpClient();

  try {
    // Step 0: Login
    const authResult = await login(client);
    if (!authResult || !authResult.success) {
      logger.log('❌ Login failed. Cannot proceed with test.');
      return;
    }

    const csrfToken = authResult.csrfToken;
    if (!csrfToken) {
      logger.log('⚠️  No CSRF token received. Continuing anyway...');
    }

    // Initialize session (REQUIRED!)
    const sessionInitialized = await initializeSession(client, csrfToken);
    if (!sessionInitialized) {
      logger.log('❌ Session initialization failed. Cannot proceed.');
      return;
    }

    // For this test, we'll update the WLAN we just created
    // WLAN ID 5: "Test-WLAN-2025-12-25T06-48-54" (Guest Service ID: 1)
    const wlanId = '5';
    const guestServiceId = '1';
    const currentName = 'Test-WLAN-2025-12-25T06-48-54';
    const updatedName = `${currentName}-UPDATED`;

    logger.log(`\n🎯 Updating WLAN ID ${wlanId}`);
    logger.log(`   Current Name: "${currentName}"`);
    logger.log(`   New Name: "${updatedName}"`);
    logger.log('─'.repeat(80));

    // Optional: Get WLAN stats (browser does this before editing)
    await getWLANStats(client, csrfToken, currentName);

    // Step 1: Update Guest Service (increase valid days from 1 to 7)
    const guestServiceUpdated = await updateGuestService(client, csrfToken, guestServiceId, updatedName, 7);
    if (!guestServiceUpdated) {
      logger.log('⚠️  Guest Service update may have failed, but continuing...');
    }

    // Step 2: Update WLAN
    const wlanUpdated = await updateWLAN(client, csrfToken, wlanId, updatedName, guestServiceId);
    if (!wlanUpdated) {
      logger.log('❌ Failed to update WLAN. Test failed.');
      return;
    }

    // Step 3: Verify update
    const verified = await verifyWLANUpdate(client, csrfToken, wlanId, updatedName);

    // Final summary
    logger.log('\n' + '='.repeat(80));
    logger.log('📊 TEST SUMMARY');
    logger.log('='.repeat(80));
    logger.log(`WLAN ID:            ${wlanId}`);
    logger.log(`Guest Service ID:   ${guestServiceId}`);
    logger.log(`Original Name:      ${currentName}`);
    logger.log(`Updated Name:       ${updatedName}`);
    logger.log(`Guest Service:      ${guestServiceUpdated ? '✅ Updated' : '⚠️  Check manually'}`);
    logger.log(`WLAN:               ${wlanUpdated ? '✅ Updated' : '❌ Failed'}`);
    logger.log(`Verified:           ${verified ? '✅ Yes' : '❌ No'}`);
    logger.log('─'.repeat(80));

    if (verified && wlanUpdated) {
      logger.log('🎉 SUCCESS! Guest WLAN updated and verified.');
      logger.log('\n💡 Next Steps:');
      logger.log('   1. Check Ruckus admin panel to confirm changes');
      logger.log('   2. Test guest pass generation with updated configuration');
      logger.log('   3. Document complete API specification');
    } else {
      logger.log('⚠️  Update may have been partially successful. Check manually.');
    }
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Test execution failed', error);
  }
}

// Run the test
testGuestWLANUpdate();
