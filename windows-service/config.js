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
  description: 'Background database synchronization service for Multi-Business Management Platform with automatic peer discovery and conflict resolution',

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
      name: "SYNC_REGISTRATION_KEY",
      value: process.env.SYNC_REGISTRATION_KEY || "default-registration-key-change-in-production"
    },
    {
      name: "SYNC_PORT",
  value: process.env.SYNC_PORT || "8765"
    },
    {
      name: "SYNC_INTERVAL",
      value: process.env.SYNC_INTERVAL || "30000"
    },
    {
      name: "LOG_LEVEL",
      value: process.env.LOG_LEVEL || "info"
    },
    {
      name: "SYNC_DATA_DIR",
      value: process.env.SYNC_DATA_DIR || "./data/sync"
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
  dependencies: [],

  // Windows service commands
  commands: {
    SC_COMMAND: 'sc.exe'
  }
};