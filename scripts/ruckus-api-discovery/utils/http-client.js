/**
 * HTTP Client for Ruckus R710 API
 *
 * Features:
 * - Manual cookie management (session persistence)
 * - HTTPS support with self-signed certificates
 * - Request/response logging
 * - Error handling
 */

const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const config = require('../config');
const logger = require('./request-logger');

/**
 * Create HTTP client instance with manual cookie management
 */
function createHttpClient() {
  // Create cookie jar for session management
  const cookieJar = new CookieJar();

  // Create axios instance
  const client = axios.create({
    baseURL: config.ruckus.baseUrl,
    httpsAgent: new (require('https').Agent)(config.ruckus.httpsOptions),
    timeout: 30000, // 30 second timeout
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  // Request interceptor - add cookies to outgoing requests
  client.interceptors.request.use(
    async (requestConfig) => {
      // Get cookies for this URL
      const url = `${requestConfig.baseURL}${requestConfig.url}`;
      const cookieString = await cookieJar.getCookieString(url);

      if (cookieString) {
        requestConfig.headers.Cookie = cookieString;
      }

      // Log request
      if (config.logging.enabled && config.logging.logRequests) {
        logger.logRequest(requestConfig);
      }

      return requestConfig;
    },
    (error) => {
      logger.logError('Request Error', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor - save cookies from responses
  client.interceptors.response.use(
    async (response) => {
      // Extract and store cookies from Set-Cookie headers
      const setCookieHeaders = response.headers['set-cookie'];
      if (setCookieHeaders) {
        const url = `${response.config.baseURL}${response.config.url}`;

        for (const cookieString of setCookieHeaders) {
          await cookieJar.setCookie(cookieString, url);
        }
      }

      // Log response
      if (config.logging.enabled && config.logging.logResponses) {
        logger.logResponse(response);
      }

      return response;
    },
    async (error) => {
      // Try to save cookies even on error responses
      if (error.response && error.response.headers['set-cookie']) {
        const setCookieHeaders = error.response.headers['set-cookie'];
        const url = `${error.response.config.baseURL}${error.response.config.url}`;

        for (const cookieString of setCookieHeaders) {
          await cookieJar.setCookie(cookieString, url);
        }
      }

      logger.logError('Response Error', error);
      return Promise.reject(error);
    }
  );

  return { client, cookieJar };
}

/**
 * Get cookies from jar as array
 */
async function getCookies(cookieJar, url) {
  return await cookieJar.getCookies(url);
}

/**
 * Clear all cookies from jar
 */
function clearCookies(cookieJar) {
  cookieJar.removeAllCookiesSync();
}

module.exports = {
  createHttpClient,
  getCookies,
  clearCookies
};
