/**
 * Ruckus R710 API Discovery Configuration
 *
 * IMPORTANT: This is for testing/discovery only.
 * Do NOT commit credentials to version control in production.
 */

module.exports = {
  // Ruckus Router Connection
  ruckus: {
    // Base URL for Ruckus Unleashed controller
    baseUrl: 'https://192.168.0.108',

    // Login credentials (TEST ENVIRONMENT ONLY)
    credentials: {
      username: 'admin',
      password: 'HelloMotto'
    },

    // Firmware version being tested
    firmwareVersion: '200.15.6.12.304',

    // HTTPS options (self-signed certificate)
    httpsOptions: {
      rejectUnauthorized: false  // Accept self-signed certs for testing
    }
  },

  // Logging configuration
  logging: {
    enabled: true,
    logDir: './logs',
    logRequests: true,
    logResponses: true,
    logHeaders: true,
    logBody: true
  },

  // Test configuration
  testing: {
    // Test Guest WLAN settings
    testWlan: {
      name: 'Test Guest WLAN',
      ssid: 'HXI-Test-Guest',
      usageType: 'Guest Access',
      guestAuthentication: 'Guest Pass',
      guestPassword: 'Unique password for each guest'
    },

    // Test Guest Pass settings
    testGuestPass: {
      count: 1,  // Single token for testing
      validForMinutes: 120,  // 2 hours
      bandwidthDownMb: 500,
      bandwidthUpMb: 100
    }
  }
};
