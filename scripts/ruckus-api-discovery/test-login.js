/**
 * Test Login to Ruckus R710
 *
 * This script attempts to discover and test the login endpoint
 * by trying various authentication methods.
 */

const { createHttpClient, getCookies } = require('./utils/http-client');
const logger = require('./utils/request-logger');
const config = require('./config');

async function testLogin() {
  console.log('\n🔍 Starting Ruckus R710 Login Discovery Test\n');
  console.log('=' .repeat(80));

  const { client, cookieJar } = createHttpClient();
  const { username, password } = config.ruckus.credentials;

  try {
    // ====================================================================
    // METHOD 1: Try traditional form-based login to /admin/login.jsp
    // ====================================================================
    console.log('\n📝 Method 1: Testing form-based POST to /admin/login.jsp');
    logger.logDiscovery('/admin/login.jsp', 'POST', 'Traditional form-based login');

    try {
      const formLoginResponse = await client.post('/admin/login.jsp', null, {
        params: {
          username: username,
          password: password
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        maxRedirects: 0, // Don't follow redirects, we want to see them
        validateStatus: () => true // Accept any status code
      });

      console.log(`✅ Response Status: ${formLoginResponse.status} ${formLoginResponse.statusText}`);
      console.log(`📦 Response Type: ${typeof formLoginResponse.data}`);
      const cookies1 = await getCookies(cookieJar, config.ruckus.baseUrl);
      console.log(`🍪 Cookies Received: ${cookies1.length > 0 ? 'YES' : 'NO'}`);

      if (formLoginResponse.headers.location) {
        console.log(`🔀 Redirect Location: ${formLoginResponse.headers.location}`);
      }

      if (formLoginResponse.headers['set-cookie']) {
        console.log(`🍪 Set-Cookie Headers: ${formLoginResponse.headers['set-cookie'].length} cookie(s)`);
      }

    } catch (error) {
      console.log(`❌ Method 1 Failed: ${error.message}`);
    }

    // ====================================================================
    // METHOD 2: Try JSON login with URLSearchParams
    // ====================================================================
    console.log('\n📝 Method 2: Testing URLSearchParams POST to /admin/login.jsp');

    try {
      const params = new URLSearchParams();
      params.append('username', username);
      params.append('password', password);

      const urlParamsResponse = await client.post('/admin/login.jsp', params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        maxRedirects: 0,
        validateStatus: () => true
      });

      console.log(`✅ Response Status: ${urlParamsResponse.status} ${urlParamsResponse.statusText}`);
      const cookies2 = await getCookies(cookieJar, config.ruckus.baseUrl);
      console.log(`🍪 Cookies Received: ${cookies2.length > 0 ? 'YES' : 'NO'}`);

      if (urlParamsResponse.headers['set-cookie']) {
        console.log(`🍪 Set-Cookie Headers: ${urlParamsResponse.headers['set-cookie'].length} cookie(s)`);
      }

    } catch (error) {
      console.log(`❌ Method 2 Failed: ${error.message}`);
    }

    // ====================================================================
    // METHOD 3: Try command-based login via _wla_cmdstat.jsp
    // ====================================================================
    console.log('\n📝 Method 3: Testing command-based POST to /admin/_wla_cmdstat.jsp');
    logger.logDiscovery('/admin/_wla_cmdstat.jsp', 'POST', 'Command-based authentication');

    try {
      const cmdLoginPayload = {
        com: 'system',
        action: 'login',
        username: username,
        password: password
      };

      const cmdLoginResponse = await client.post('/admin/_wla_cmdstat.jsp', cmdLoginPayload, {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });

      console.log(`✅ Response Status: ${cmdLoginResponse.status} ${cmdLoginResponse.statusText}`);
      console.log(`📦 Response Data: ${JSON.stringify(cmdLoginResponse.data).substring(0, 200)}`);
      const cookies3 = await getCookies(cookieJar, config.ruckus.baseUrl);
      console.log(`🍪 Cookies Received: ${cookies3.length > 0 ? 'YES' : 'NO'}`);

    } catch (error) {
      console.log(`❌ Method 3 Failed: ${error.message}`);
    }

    // ====================================================================
    // METHOD 4: GET the login page first to see if we need CSRF token
    // ====================================================================
    console.log('\n📝 Method 4: Testing GET /admin/login.jsp first (CSRF token check)');

    try {
      const getLoginPage = await client.get('/admin/login.jsp');

      console.log(`✅ Login Page Retrieved: ${getLoginPage.status}`);
      console.log(`📦 Content-Type: ${getLoginPage.headers['content-type']}`);
      const cookies4 = await getCookies(cookieJar, config.ruckus.baseUrl);
      console.log(`🍪 Cookies from GET: ${cookies4.length > 0 ? 'YES' : 'NO'}`);

      // Check for CSRF token in HTML
      if (typeof getLoginPage.data === 'string') {
        const csrfMatch = getLoginPage.data.match(/csrf[_-]?token["']?\s*[:=]\s*["']?([^"'\s]+)/i);
        if (csrfMatch) {
          console.log(`🔐 Found potential CSRF token: ${csrfMatch[1].substring(0, 20)}...`);
        }

        // Check for form action
        const formMatch = getLoginPage.data.match(/<form[^>]*action=["']([^"']+)["']/i);
        if (formMatch) {
          console.log(`📋 Form Action: ${formMatch[1]}`);
        }
      }

      // Now try login after getting the page (with any cookies set)
      console.log('\n📝 Method 4b: Retry login after getting login page');

      const params2 = new URLSearchParams();
      params2.append('username', username);
      params2.append('password', password);

      const retryLoginResponse = await client.post('/admin/login.jsp', params2, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        maxRedirects: 0,
        validateStatus: () => true
      });

      console.log(`✅ Response Status: ${retryLoginResponse.status} ${retryLoginResponse.statusText}`);
      const cookies5 = await getCookies(cookieJar, config.ruckus.baseUrl);
      console.log(`🍪 Cookies After Login: ${cookies5.length > 0 ? 'YES' : 'NO'}`);

      if (retryLoginResponse.headers.location) {
        console.log(`🔀 Redirect to: ${retryLoginResponse.headers.location}`);
      }

    } catch (error) {
      console.log(`❌ Method 4 Failed: ${error.message}`);
    }

    // ====================================================================
    // METHOD 5: Try to access authenticated endpoint to test session
    // ====================================================================
    console.log('\n📝 Method 5: Testing session validity by accessing /admin/_cmdstat.jsp');

    try {
      const testSessionResponse = await client.get('/admin/_cmdstat.jsp', {
        validateStatus: () => true
      });

      console.log(`✅ Response Status: ${testSessionResponse.status} ${testSessionResponse.statusText}`);

      if (testSessionResponse.status === 200) {
        console.log(`✅ SUCCESS! We appear to be authenticated!`);
      } else if (testSessionResponse.status === 302 || testSessionResponse.status === 301) {
        console.log(`🔀 Redirect (likely not authenticated): ${testSessionResponse.headers.location}`);
      } else if (testSessionResponse.status === 401 || testSessionResponse.status === 403) {
        console.log(`❌ Not authenticated (${testSessionResponse.status})`);
      }

    } catch (error) {
      console.log(`❌ Method 5 Failed: ${error.message}`);
    }

    // ====================================================================
    // SUMMARY: Display all cookies we received
    // ====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('🍪 COOKIE JAR SUMMARY');
    console.log('='.repeat(80));

    const allCookies = await getCookies(cookieJar, config.ruckus.baseUrl);
    if (allCookies.length > 0) {
      console.log(`Total Cookies: ${allCookies.length}`);
      allCookies.forEach((cookie, index) => {
        console.log(`  ${index + 1}. ${cookie.key} = ${cookie.value.substring(0, 20)}${cookie.value.length > 20 ? '...' : ''}`);
        console.log(`     Domain: ${cookie.domain}, Path: ${cookie.path}, Secure: ${cookie.secure}, HttpOnly: ${cookie.httpOnly}`);
      });
    } else {
      console.log('❌ No cookies received during any method');
    }

    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80));
    console.log('Check the log file for detailed request/response data:');
    console.log(`📁 ${config.logging.logDir}/ruckus-api-requests-${new Date().toISOString().split('T')[0]}.log`);
    console.log('='.repeat(80));
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testLogin().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
