/**
 * Authentication Helper for Ruckus R710
 *
 * Provides login functionality that can be reused across test scripts
 */

const config = require('../config');
const logger = require('./request-logger');

/**
 * Login to Ruckus R710
 * @param {Object} client - Axios client instance
 * @returns {Promise<Object|null>} - { success: true, csrfToken: 'token' } or null
 */
async function login(client) {
  const { username, password } = config.ruckus.credentials;

  logger.log('🔐 Attempting login to Ruckus R710...');

  try {
    // Build login form data
    const loginParams = new URLSearchParams();
    loginParams.append('username', username);
    loginParams.append('password', password);
    loginParams.append('ok', 'Log in'); // CRITICAL PARAMETER

    // POST login request
    const loginResponse = await client.post('/admin/login.jsp', loginParams, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Origin': config.ruckus.baseUrl,
        'Referer': `${config.ruckus.baseUrl}/admin/login.jsp`,
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin'
      },
      maxRedirects: 0, // Handle redirects manually
      validateStatus: () => true // Accept any status
    });

    // Check for successful login (302 redirect)
    if (loginResponse.status === 302) {
      const redirectLocation = loginResponse.headers.location;
      logger.log(`✅ Login successful! Redirected to: ${redirectLocation}`);

      // Extract CSRF token (CRITICAL!)
      const csrfToken = loginResponse.headers['http_x_csrf_token'];
      if (csrfToken) {
        logger.log(`🔐 CSRF Token received: ${csrfToken}`);
        return { success: true, csrfToken };
      } else {
        logger.log(`⚠️ No CSRF token received`);
        return { success: true, csrfToken: null };
      }
    } else {
      logger.log(`❌ Login failed. Status: ${loginResponse.status}`);
      return null;
    }

  } catch (error) {
    logger.logError('Login failed', error);
    return null;
  }
}

/**
 * Verify authentication by accessing authenticated endpoint
 * @param {Object} client - Axios client instance
 * @returns {Promise<boolean>} - True if authenticated
 */
async function verifyAuthentication(client) {
  try {
    const response = await client.get('/admin/_cmdstat.jsp', {
      validateStatus: () => true
    });

    const isAuthenticated = response.status === 200 &&
                           !response.data.includes('X-Auth" content="Unauthorized');

    if (isAuthenticated) {
      logger.log('✅ Authentication verified');
      return true;
    } else {
      logger.log('❌ Not authenticated');
      return false;
    }

  } catch (error) {
    logger.logError('Authentication verification failed', error);
    return false;
  }
}

module.exports = {
  login,
  verifyAuthentication
};
