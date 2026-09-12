/**
 * Windows Service Configuration
 * Based on electricity-tokens hybrid service pattern
 */

const path = require('path');

module.exports = {
  // Service identification
  // 'name' is the internal service name used by Windows (sc) and node-windows.
  // Use a single-token identifier here (match daemon id) so sc queries behave predictably.
  name: 'MultiBusinessSyncService',
  // Human-friendly display name shown in Services.msc
  displayName: 'Multi-Business Sync Service',
  description: 'Runs database migrations then launches the Multi-Business Management Platform application server.',

  // Service executable
  script: path.resolve(__dirname, 'service-wrapper-hybrid.js'),

  // Node.js options
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=2048', // 2GB memory limit
    '--experimental-worker'
  ],

  // Environment variables
  env: [
    {
      name: "NODE_ENV",
      value: "production"
    },
    {
      name: "LOG_LEVEL",
      value: process.env.LOG_LEVEL || "info"
    }
  ],

  // Service options
  restart: true,
  grow: 0.25,
  wait: 30,
  logOnAs: {
    domain: '',
    account: '',
    password: ''
  },

  // Dependencies (other services this depends on)
  // PostgreSQL must be running before this service starts
  dependencies: ['postgresql-x64-18'],

  // Windows service commands
  commands: {
    SC_COMMAND: 'sc.exe'
  }
};