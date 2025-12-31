/**
 * Ruckus R710 API Discovery Configuration
 *
 * IMPORTANT: This is for testing/discovery only.
 * Credentials are now loaded from .env.local to prevent exposure in version control.
 */

require('dotenv').config({ path: '../../.env.local' });

// Validate required environment variables
if (!process.env.R710_DEVICE_HOST || !process.env.R710_ADMIN_USERNAME || !process.env.R710_ADMIN_PASSWORD) {
  console.error('ERROR: Missing required R710 environment variables in .env.local');
  console.error('Required variables: R710_DEVICE_HOST, R710_ADMIN_USERNAME, R710_ADMIN_PASSWORD');
  process.exit(1);
}

module.exports = {
  // Ruckus Router Connection
  ruckus: {
    // Base URL for Ruckus Unleashed controller (from environment)
    baseUrl: `https://${process.env.R710_DEVICE_HOST}`,

    // Login credentials (loaded from .env.local)
    credentials: {
      username: process.env.R710_ADMIN_USERNAME,
      password: process.env.R710_ADMIN_PASSWORD
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
