/**
 * Environment Configuration Helper
 * Provides centralized access to all environment variables with fallbacks
 */

require('dotenv').config()

/**
 * Get sync service configuration from environment variables
 */
function getSyncConfig() {
  return {
    nodeId: process.env.SYNC_NODE_ID || generateNodeId(),
    nodeName: process.env.SYNC_NODE_NAME || `sync-node-${require('os').hostname()}`,
    registrationKey: process.env.SYNC_REGISTRATION_KEY || 'default-key-change-in-production',
    port: parseInt(process.env.SYNC_SERVICE_PORT || '8765'),
    httpPort: parseInt(process.env.SYNC_HTTP_PORT || process.env.PORT || '8080'),
    syncInterval: parseInt(process.env.SYNC_INTERVAL || '30000'),
    enableAutoStart: process.env.SYNC_AUTO_START === 'true',
    logLevel: process.env.SYNC_LOG_LEVEL || 'info',
    maxLogSize: parseInt(process.env.SYNC_MAX_LOG_SIZE || '10485760'),
    maxLogFiles: parseInt(process.env.SYNC_MAX_LOG_FILES || '5'),
    security: {
      enableEncryption: process.env.SYNC_ENABLE_ENCRYPTION === 'true',
      enableSignatures: process.env.SYNC_ENABLE_SIGNATURES === 'true',
      keyRotationEnabled: process.env.SYNC_KEY_ROTATION_ENABLED === 'true',
      sessionTimeout: parseInt(process.env.SYNC_SESSION_TIMEOUT || '3600000'),
      maxFailedAttempts: parseInt(process.env.SYNC_MAX_FAILED_ATTEMPTS || '5'),
      rateLimitWindow: parseInt(process.env.SYNC_RATE_LIMIT_WINDOW || '60000'),
      rateLimitMaxRequests: parseInt(process.env.SYNC_RATE_LIMIT_MAX_REQUESTS || '100')
    },
    database: {
      url: process.env.DATABASE_URL,
      maxConnections: parseInt(process.env.SYNC_DB_MAX_CONNECTIONS || '20'),
      connectionTimeout: parseInt(process.env.SYNC_DB_CONNECTION_TIMEOUT || '30000')
    }
  }
}

/**
 * Get Windows service configuration from environment variables
 */
function getServiceConfig() {
  return {
    name: process.env.SERVICE_NAME || 'multi-business-sync',
    displayName: process.env.SERVICE_DISPLAY_NAME || 'Multi-Business Sync Service',
    description: process.env.SERVICE_DESCRIPTION || 'Peer-to-peer database synchronization service',
    autoStart: process.env.SERVICE_AUTO_START !== 'false',
    restartDelay: parseInt(process.env.SERVICE_RESTART_DELAY || '5000'),
    maxRestarts: parseInt(process.env.SERVICE_MAX_RESTARTS || '3')
  }
}

/**
 * Get logging configuration from environment variables
 */
function getLoggingConfig() {
  const path = require('path')
  const rootDir = process.cwd()
  
  return {
    level: process.env.LOG_LEVEL || 'info',
    directory: path.resolve(rootDir, process.env.LOG_DIRECTORY || 'logs'),
    maxFileSize: process.env.LOG_MAX_FILE_SIZE || '10MB',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
    console: process.env.LOG_CONSOLE === 'true'
  }
}

/**
 * Get application configuration
 */
function getAppConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'production',
    port: parseInt(process.env.PORT || '8080'),
    appName: process.env.APP_NAME || 'Multi-Business Management Platform',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@localhost',
    databaseUrl: process.env.DATABASE_URL,
    nextAuthUrl: process.env.NEXTAUTH_URL || 'http://localhost:8080',
    nextAuthSecret: process.env.NEXTAUTH_SECRET
  }
}

/**
 * Generate a unique node ID if not provided
 */
function generateNodeId() {
  const crypto = require('crypto')
  const os = require('os')
  
  // Use MAC address + hostname for deterministic ID
  const networkInterfaces = os.networkInterfaces()
  let macAddress = ''
  
  for (const [name, nets] of Object.entries(networkInterfaces)) {
    if (nets && Array.isArray(nets)) {
      for (const net of nets) {
        if (net.mac && net.mac !== '00:00:00:00:00:00') {
          macAddress = net.mac
          break
        }
      }
    }
    if (macAddress) break
  }
  
  const baseString = macAddress || os.hostname() || 'default'
  return crypto.createHash('sha256').update(baseString).digest('hex').substring(0, 16)
}

/**
 * Validate required environment variables
 */
function validateEnvironment() {
  const required = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'SYNC_REGISTRATION_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`   - ${key}`))
    console.error('')
    console.error('Please update your .env file with the required values.')
    console.error('See .env.example for reference.')
    return false
  }
  
  return true
}

/**
 * Generate config files from environment (for backward compatibility)
 */
function generateLegacyConfigFiles() {
  const fs = require('fs')
  const path = require('path')
  
  const syncConfig = getSyncConfig()
  const serviceConfig = getServiceConfig()
  const loggingConfig = getLoggingConfig()
  
  // Generate service-config.json for backward compatibility
  const serviceConfigData = {
    service: {
      name: serviceConfig.name,
      displayName: serviceConfig.displayName,
      description: serviceConfig.description,
      port: syncConfig.port,
      autoStart: serviceConfig.autoStart,
      restartDelay: serviceConfig.restartDelay,
      maxRestarts: serviceConfig.maxRestarts
    },
    sync: {
      nodeId: syncConfig.nodeId,
      nodeName: syncConfig.nodeName,
      registrationKey: syncConfig.registrationKey,
      port: syncConfig.port,
      httpPort: syncConfig.httpPort,
      syncInterval: syncConfig.syncInterval,
      enableAutoStart: syncConfig.enableAutoStart,
      logLevel: syncConfig.logLevel,
      dataDirectory: path.resolve(process.cwd(), 'data', 'sync'),
      maxLogSize: syncConfig.maxLogSize,
      maxLogFiles: syncConfig.maxLogFiles,
      security: syncConfig.security
    },
    database: syncConfig.database,
    logging: {
      level: loggingConfig.level,
      directory: loggingConfig.directory,
      maxFileSize: loggingConfig.maxFileSize,
      maxFiles: loggingConfig.maxFiles,
      console: loggingConfig.console
    }
  }
  
  // Generate data/sync/config.json for backward compatibility
  const dataConfigData = {
    port: syncConfig.port,
    httpPort: syncConfig.httpPort,
    syncInterval: syncConfig.syncInterval,
    enableAutoStart: syncConfig.enableAutoStart,
    logLevel: syncConfig.logLevel,
    dataDirectory: path.resolve(process.cwd(), 'data', 'sync'),
    maxLogSize: syncConfig.maxLogSize,
    maxLogFiles: syncConfig.maxLogFiles,
    nodeId: syncConfig.nodeId,
    nodeName: syncConfig.nodeName,
    registrationKey: syncConfig.registrationKey,
    autoRestart: serviceConfig.autoStart,
    restartDelay: serviceConfig.restartDelay,
    maxRestartAttempts: serviceConfig.maxRestarts
  }
  
  try {
    // Ensure directories exist
    const configDir = path.join(process.cwd(), 'config')
    const dataDir = path.join(process.cwd(), 'data', 'sync')
    
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true })
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
    
    // Write config files
    fs.writeFileSync(
      path.join(configDir, 'service-config.json'),
      JSON.stringify(serviceConfigData, null, 2)
    )
    
    fs.writeFileSync(
      path.join(dataDir, 'config.json'),
      JSON.stringify(dataConfigData, null, 2)
    )
    
    console.log('✅ Legacy config files generated from environment variables')
    
  } catch (error) {
    console.warn('⚠️  Failed to generate legacy config files:', error.message)
  }
}

module.exports = {
  getSyncConfig,
  getServiceConfig,
  getLoggingConfig,
  getAppConfig,
  generateNodeId,
  validateEnvironment,
  generateLegacyConfigFiles
}

// CLI usage
if (require.main === module) {
  const action = process.argv[2]
  
  switch (action) {
    case 'validate':
      const isValid = validateEnvironment()
      process.exit(isValid ? 0 : 1)
      break
    case 'generate':
      generateLegacyConfigFiles()
      break
    case 'show':
      console.log('Sync Config:', JSON.stringify(getSyncConfig(), null, 2))
      console.log('Service Config:', JSON.stringify(getServiceConfig(), null, 2))
      break
    default:
      console.log('Usage: node env-config.js [validate|generate|show]')
  }
}