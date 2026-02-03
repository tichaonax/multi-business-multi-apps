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
 * Step 1: Create Guest Service (Portal Configuration)
 * This creates the captive portal configuration with firewall rules
 */
async function createGuestService(client, csrfToken, serviceName) {
  logger.log(`\n🔧 Step 1: Creating Guest Service "${serviceName}"...`);

  const updaterId = generateUpdaterId('guestservice-list');

  // Build the Guest Service XML payload with all required configurations
  const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='guestservice-list'><guestservice name='${serviceName}' onboarding='true' onboarding-aspect='both' auth-by='guestpass' countdown-by-issued='false' show-tou='true' tou='Terms of Use

By accepting this agreement and accessing the wireless network, you acknowledge that you are of legal age, you have read and understood, and agree to be bound by this agreement.
(*) The wireless network service is provided by the property owners and is completely at their discretion. Your access to the network may be blocked, suspended, or terminated at any time for any reason.
(*) You agree not to use the wireless network for any purpose that is unlawful or otherwise prohibited and you are fully responsible for your use.
(*) The wireless network is provided &quot;as is&quot; without warranties of any kind, either expressed or implied.' redirect='orig' redirect-url='' company-logo='ruckus' poweredby='Ruckus Wireless' poweredby-url='http://www.ruckuswireless.com/' desc='Type or paste in the text of your guest pass.' self-service='false' rule6='' title='Welcome to Guest WiFi !' opacity='1.0' background-opacity='1' background-color='#516a8c' logo-type='default' banner-type='default' bgimage-type='default' bgimage-display-type='fill' enable-portal='true' wifi4eu='false' wifi4eu-network-id='' wifi4eu-language='en' wifi4eu-debug='false' wg='' show-lang='true' portal-lang='en_US' random-key='999' valid='1' old-self-service='false' old-auth-by='guestpass'><rule action='accept' type='layer 2' ether-type='0x0806'></rule><rule action='accept' type='layer 2' ether-type='0x8863'></rule><rule action='accept' type='layer 2' ether-type='0x8864'></rule><rule action='accept' type='layer 3' protocol='17' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='6' dst-port='53'></rule><rule action='accept' type='layer 3' protocol='' dst-port='67' app='DHCP'></rule><rule action='deny' type='layer 3' protocol='' dst-port='68'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='80' app='HTTP'></rule><rule action='accept' type='layer 3' protocol='6' dst-addr='host' dst-port='443' app='HTTPS'></rule><rule action='deny' type='layer 3' dst-addr='local' protocol='' EDITABLE='false'></rule><rule action='accept' type='layer 3' dst-addr='10.0.0.0/8' protocol=''></rule><rule action='deny' type='layer 3' dst-addr='172.16.0.0/12' protocol=''></rule><rule action='accept' type='layer 3' dst-addr='192.168.0.0/16' protocol=''></rule><rule action='accept' type='layer 3' protocol='1'></rule><rule action='accept' type='layer 3' protocol='' dst-port='0'></rule></guestservice></ajax-request>`;

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

    // Parse response to extract the guest service ID
    const responseText = response.data;
    const idMatch = responseText.match(/id="(\d+)"/);

    if (idMatch) {
      const guestServiceId = idMatch[1];
      logger.log(`✅ Guest Service created successfully with ID: ${guestServiceId}`);
      return guestServiceId;
    } else {
      logger.log('⚠️  Guest Service created but ID not found in response');
      logger.log('Response:', responseText.substring(0, 500));
      return null;
    }
  } catch (error) {
    logger.logError('Failed to create Guest Service', error);
    return null;
  }
}

/**
 * Step 2: Create WLAN (Network Configuration)
 * This creates the actual WiFi network linked to the guest service
 */
async function createWLAN(client, csrfToken, wlanName, guestServiceId) {
  logger.log(`\n🔧 Step 2: Creating WLAN "${wlanName}" (linked to Guest Service ID: ${guestServiceId})...`);

  const updaterId = generateUpdaterId('wlansvc-list');

  // Build the WLAN XML payload with all required configurations
  const xmlPayload = `<ajax-request action='addobj' updater='${updaterId}' comp='wlansvc-list'><wlansvc name='${wlanName}' ssid='${wlanName}' description='${wlanName}' usage='guest' is-guest='true' authentication='open' encryption='none' acctsvr-id='0' acct-upd-interval='10' guest-pass='' en-grace-period-sets='enabled' grace-period-sets='480' close-system='false' vlan-id='1' dvlan='disabled' max-clients-per-radio='100' enable-type='0' do-wmm-ac='disabled' acl-id='1' devicepolicy-id='' bgscan='1' balance='0' band-balance='0' do-802-11d='enabled' wlan_bind='0' force-dhcp='0' force-dhcp-timeout='10' max-idle-timeout='300' idle-timeout='true' client-isolation='enabled' ci-whitelist-id='0' bypass-cna='false' dtim-period='1' directed-mbc='1' client-flow-log='disabled' export-client-log='false' wifi6='true' local-bridge='1' enable-friendly-key='true' ofdm-rate-only='false' bss-minrate='0' tx-rate-config='1' web-auth='enabled' https-redirection='enabled' called-station-id-type='0' option82='0' option82-opt1='0' option82-opt2='0' option82-opt150='0' option82-opt151='0' dis-dgaf='0' parp='0' authstats='0' sta-info-extraction='1' pool-id='' dhcpsvr-id='0' precedence-id='1' role-based-access-ctrl='false' option82-areaName='' guest-auth='guestpass' self-service='false' self-service-sponsor-approval='undefined' self-service-notification='undefined' guestservice-id='${guestServiceId}'><queue-priority voice='0' video='2' data='4' background='6'/><qos uplink-preset='DISABLE' downlink-preset='DISABLE' perssid-uplink-preset='0' perssid-downlink-preset='0'/><rrm neighbor-report='enabled'/><smartcast mcast-filter='disabled'/><wlan-schedule value='0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0:0x0'/><avp-policy avp-enabled='disabled' avpdeny-id='0'/><urlfiltering-policy urlfiltering-enabled='disabled' urlfiltering-id='0'/><wificalling-policy wificalling-enabled='disabled' profile-id='0'/></wlansvc></ajax-request>`;

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

    // Parse response to extract the WLAN ID
    const responseText = response.data;
    const idMatch = responseText.match(/id="(\d+)"/);

    if (idMatch) {
      const wlanId = idMatch[1];
      logger.log(`✅ WLAN created successfully with ID: ${wlanId}`);
      return wlanId;
    } else {
      logger.log('⚠️  WLAN created but ID not found in response');
      logger.log('Response:', responseText.substring(0, 500));
      return null;
    }
  } catch (error) {
    logger.logError('Failed to create WLAN', error);
    return null;
  }
}

/**
 * Verify WLAN was created by fetching the WLAN list
 */
async function verifyWLANCreated(client, csrfToken, wlanId) {
  logger.log(`\n🔍 Verifying WLAN ID ${wlanId} appears in WLAN list...`);

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

    // Check if our WLAN ID appears in the response
    if (responseText.includes(`id="${wlanId}"`)) {
      logger.log(`✅ WLAN ID ${wlanId} confirmed in WLAN list`);

      // Extract WLAN name for confirmation
      const nameMatch = responseText.match(new RegExp(`<wlansvc[^>]*name="([^"]*)"[^>]*id="${wlanId}"`));
      if (nameMatch) {
        logger.log(`   WLAN Name: "${nameMatch[1]}"`);
      }
      return true;
    } else {
      logger.log(`❌ WLAN ID ${wlanId} not found in WLAN list`);
      return false;
    }
  } catch (error) {
    logger.logError('Failed to verify WLAN creation', error);
    return false;
  }
}

/**
 * Main test function
 */
async function testGuestWLANCreation() {
  logger.log('='.repeat(80));
  logger.log('🧪 RUCKUS R710 - GUEST WLAN CREATION TEST');
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

    // Generate unique name for this test
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const testWLANName = `Test-WLAN-${timestamp}`;

    logger.log(`\n🎯 Creating Guest WLAN: "${testWLANName}"`);
    logger.log('─'.repeat(80));

    // Step 1: Create Guest Service
    const guestServiceId = await createGuestService(client, csrfToken, testWLANName);
    if (!guestServiceId) {
      logger.log('❌ Failed to create Guest Service. Cannot proceed.');
      return;
    }

    // Step 2: Create WLAN
    const wlanId = await createWLAN(client, csrfToken, testWLANName, guestServiceId);
    if (!wlanId) {
      logger.log('❌ Failed to create WLAN. Test failed.');
      return;
    }

    // Step 3: Verify creation
    const verified = await verifyWLANCreated(client, csrfToken, wlanId);

    // Final summary
    logger.log('\n' + '='.repeat(80));
    logger.log('📊 TEST SUMMARY');
    logger.log('='.repeat(80));
    logger.log(`WLAN Name:          ${testWLANName}`);
    logger.log(`Guest Service ID:   ${guestServiceId}`);
    logger.log(`WLAN ID:            ${wlanId}`);
    logger.log(`Verified:           ${verified ? '✅ Yes' : '❌ No'}`);
    logger.log('─'.repeat(80));

    if (verified) {
      logger.log('🎉 SUCCESS! Guest WLAN created and verified.');
      logger.log('\n💡 Next Steps:');
      logger.log('   1. Check Ruckus admin panel to confirm WLAN appears');
      logger.log('   2. Test guest pass generation for this WLAN');
      logger.log('   3. Implement edit/update WLAN workflow');
    } else {
      logger.log('⚠️  WLAN may have been created but verification failed.');
    }
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Test execution failed', error);
  }
}

// Run the test
testGuestWLANCreation();
