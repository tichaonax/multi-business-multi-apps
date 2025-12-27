const { createHttpClient } = require('./utils/http-client');
const { login } = require('./utils/auth');
const logger = require('./utils/request-logger');
const config = require('./config');

/**
 * Test: Query/List All Guest Pass Tokens
 * Based on: ai-contexts/wip/Requesting tokens-1a.txt
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

/**
 * Query All Guest Pass Tokens
 */
async function queryGuestTokens(client, csrfToken) {
  logger.log('\n🔍 Querying all guest pass tokens...');

  const updaterId = generateUpdaterId('guest-list');

  // Query all tokens (excluding self-service tokens)
  const xmlPayload = `<ajax-request action='getconf' DECRYPT_X='true' updater='${updaterId}' comp='guest-list'><guest self-service='!true'/></ajax-request>`;

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

    // Parse XML response to extract token information
    const guestRegex = /<guest([^>]+)(?:>(?:<client[^>]*\/>)?<\/guest>|\/?>)/g;
    const tokens = [];
    let match;

    while ((match = guestRegex.exec(responseText)) !== null) {
      const attributes = match[1];

      // Extract attributes
      const parseAttr = (attr) => {
        const attrMatch = attributes.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        return attrMatch ? attrMatch[1] : null;
      };

      const id = parseAttr('id');
      const fullName = parseAttr('full-name');
      const key = parseAttr('key') || parseAttr('x-key');
      const wlan = parseAttr('wlan');
      const createdBy = parseAttr('created-by');
      const createTime = parseAttr('create-time');
      const expireTime = parseAttr('expire-time');
      const startTime = parseAttr('start-time');
      const validTime = parseAttr('valid-time');
      const shareNumber = parseAttr('share-number');
      const remarks = parseAttr('remarks');
      const used = attributes.includes('used=');

      // Check if token has connected clients
      const clientMatch = match[0].match(/<client mac="([^"]+)"/);
      const connectedMac = clientMatch ? clientMatch[1] : null;

      // Calculate status
      const now = Math.floor(Date.now() / 1000);
      const expired = expireTime && parseInt(expireTime) < now;
      const active = startTime && !expired;

      tokens.push({
        id,
        username: fullName,
        password: key,
        wlan,
        createdBy,
        createTime: createTime ? new Date(parseInt(createTime) * 1000).toISOString() : null,
        expireTime: expireTime ? new Date(parseInt(expireTime) * 1000).toISOString() : null,
        startTime: startTime ? new Date(parseInt(startTime) * 1000).toISOString() : null,
        validTimeSeconds: validTime ? parseInt(validTime) : null,
        validTimeHours: validTime ? Math.round(parseInt(validTime) / 3600 * 10) / 10 : null,
        maxDevices: shareNumber,
        remarks,
        used,
        expired,
        active,
        connectedMac,
        status: expired ? 'Expired' : (active ? 'Active/Used' : (used ? 'Used' : 'Available'))
      });
    }

    logger.log(`✅ Found ${tokens.length} guest pass tokens`);

    return tokens;
  } catch (error) {
    logger.logError('Failed to query guest tokens', error);
    return [];
  }
}

/**
 * Display tokens in a formatted table
 */
function displayTokens(tokens) {
  logger.log('\n' + '='.repeat(120));
  logger.log('📋 GUEST PASS TOKENS');
  logger.log('='.repeat(120));

  if (tokens.length === 0) {
    logger.log('No tokens found.');
    return;
  }

  // Group by WLAN
  const byWLAN = {};
  tokens.forEach(token => {
    if (!byWLAN[token.wlan]) {
      byWLAN[token.wlan] = [];
    }
    byWLAN[token.wlan].push(token);
  });

  // Display by WLAN
  Object.keys(byWLAN).forEach(wlanName => {
    logger.log(`\n🌐 WLAN: ${wlanName}`);
    logger.log('─'.repeat(120));

    const wlanTokens = byWLAN[wlanName];

    // Count statistics
    const available = wlanTokens.filter(t => t.status === 'Available').length;
    const used = wlanTokens.filter(t => t.used).length;
    const expired = wlanTokens.filter(t => t.expired).length;
    const active = wlanTokens.filter(t => t.active).length;

    logger.log(`📊 Statistics: ${wlanTokens.length} total | ${available} available | ${used} used | ${active} active | ${expired} expired`);
    logger.log('');

    // Display each token
    wlanTokens.forEach((token, index) => {
      const statusIcon =
        token.expired ? '❌' :
        token.active ? '🟢' :
        token.used ? '⚪' :
        '✅';

      logger.log(`${statusIcon} Token ${index + 1} (ID: ${token.id})`);
      logger.log(`   Username:    ${token.username}`);
      logger.log(`   Password:    ${token.password}`);
      logger.log(`   Status:      ${token.status}`);
      logger.log(`   Created:     ${token.createTime}`);
      logger.log(`   Expires:     ${token.expireTime}`);
      logger.log(`   Valid For:   ${token.validTimeHours} hours`);
      logger.log(`   Max Devices: ${token.maxDevices}`);

      if (token.startTime) {
        logger.log(`   First Used:  ${token.startTime}`);
      }

      if (token.connectedMac) {
        logger.log(`   Connected:   ${token.connectedMac}`);
      }

      if (token.remarks) {
        logger.log(`   Remarks:     ${token.remarks}`);
      }

      logger.log('');
    });
  });

  logger.log('='.repeat(120));
}

async function testQueryTokens() {
  logger.log('='.repeat(80));
  logger.log('🧪 TEST: Query All Guest Pass Tokens');
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

    // Query all tokens
    const tokens = await queryGuestTokens(client, csrfToken);

    // Display results
    displayTokens(tokens);

    // Summary
    logger.log('\n📊 SUMMARY');
    logger.log('─'.repeat(80));
    logger.log(`Total Tokens:     ${tokens.length}`);
    logger.log(`Available:        ${tokens.filter(t => t.status === 'Available').length}`);
    logger.log(`Used:             ${tokens.filter(t => t.used).length}`);
    logger.log(`Active:           ${tokens.filter(t => t.active).length}`);
    logger.log(`Expired:          ${tokens.filter(t => t.expired).length}`);
    logger.log('─'.repeat(80));

    // Group by WLAN
    const wlanCounts = {};
    tokens.forEach(t => {
      if (!wlanCounts[t.wlan]) {
        wlanCounts[t.wlan] = 0;
      }
      wlanCounts[t.wlan]++;
    });

    logger.log('\n📡 Tokens by WLAN:');
    Object.keys(wlanCounts).forEach(wlan => {
      logger.log(`   ${wlan}: ${wlanCounts[wlan]} tokens`);
    });

    logger.log('\n' + '='.repeat(80));
    logger.log('✅ TEST COMPLETED SUCCESSFULLY');
    logger.log('='.repeat(80));

  } catch (error) {
    logger.logError('Test failed', error);
  }
}

testQueryTokens();
