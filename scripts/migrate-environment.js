#!/usr/bin/env node

/**
 * Environment Migration Script
 * 
 * Migrates configuration from legacy config files to environment variables:
 * - config/service-config.json
 * - data/sync/config.json
 * 
 * Creates or updates .env and .env.local files with extracted values.
 */

const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.join(__dirname, '..')

class EnvironmentMigrator {
  constructor() {
    this.configPaths = {
      serviceConfig: path.join(ROOT_DIR, 'config', 'service-config.json'),
      syncConfig: path.join(ROOT_DIR, 'data', 'sync', 'config.json')
    }
    
    this.envPath = path.join(ROOT_DIR, '.env')
    this.envLocalPath = path.join(ROOT_DIR, '.env.local')
    this.envExamplePath = path.join(ROOT_DIR, '.env.example')
    
    this.extractedConfig = {}
    this.backupPaths = []
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString()
    const prefix = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[type] || 'ℹ️'
    
    console.log(`${prefix} [${timestamp}] ${message}`)
  }

  async detectConfigFiles() {
    this.log('🔍 Detecting existing configuration files...')
    
    const found = {}
    
    for (const [key, filepath] of Object.entries(this.configPaths)) {
      if (fs.existsSync(filepath)) {
        found[key] = filepath
        this.log(`Found: ${filepath}`, 'success')
      } else {
        this.log(`Not found: ${filepath}`, 'warning')
      }
    }
    
    if (Object.keys(found).length === 0) {
      this.log('No legacy config files found. Migration not needed.', 'warning')
      return false
    }
    
    return found
  }

  async backupExistingEnv() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    
    if (fs.existsSync(this.envPath)) {
      const backupPath = `${this.envPath}.backup-${timestamp}`
      fs.copyFileSync(this.envPath, backupPath)
      this.backupPaths.push(backupPath)
      this.log(`Backed up existing .env to: ${backupPath}`, 'success')
    }
    
    if (fs.existsSync(this.envLocalPath)) {
      const backupPath = `${this.envLocalPath}.backup-${timestamp}`
      fs.copyFileSync(this.envLocalPath, backupPath)
      this.backupPaths.push(backupPath)
      this.log(`Backed up existing .env.local to: ${backupPath}`, 'success')
    }
  }

  async extractFromServiceConfig(filepath) {
    this.log(`📤 Extracting from service config: ${filepath}`)
    
    try {
      const config = JSON.parse(fs.readFileSync(filepath, 'utf8'))
      
      const extracted = {}
      
      // Database configuration
      if (config.database?.url) {
        extracted.DATABASE_URL = config.database.url
      }
      
      // Sync service configuration
      if (config.sync) {
        if (config.sync.nodeId) extracted.SYNC_NODE_ID = config.sync.nodeId
        if (config.sync.nodeName) extracted.SYNC_NODE_NAME = config.sync.nodeName
        if (config.sync.registrationKey) extracted.SYNC_REGISTRATION_KEY = config.sync.registrationKey
        if (config.sync.port) extracted.SYNC_SERVICE_PORT = config.sync.port
        if (config.sync.httpPort) extracted.SYNC_HTTP_PORT = config.sync.httpPort
        if (config.sync.syncInterval) extracted.SYNC_INTERVAL = config.sync.syncInterval
        if (config.sync.enableAutoStart !== undefined) extracted.SYNC_AUTO_START = config.sync.enableAutoStart
        if (config.sync.logLevel) extracted.SYNC_LOG_LEVEL = config.sync.logLevel
        if (config.sync.maxLogSize) extracted.SYNC_MAX_LOG_SIZE = config.sync.maxLogSize
        if (config.sync.maxLogFiles) extracted.SYNC_MAX_LOG_FILES = config.sync.maxLogFiles
        
        // Security settings
        if (config.sync.security) {
          const sec = config.sync.security
          if (sec.enableEncryption !== undefined) extracted.SYNC_ENABLE_ENCRYPTION = sec.enableEncryption
          if (sec.enableSignatures !== undefined) extracted.SYNC_ENABLE_SIGNATURES = sec.enableSignatures
          if (sec.keyRotationEnabled !== undefined) extracted.SYNC_KEY_ROTATION_ENABLED = sec.keyRotationEnabled
          if (sec.sessionTimeout) extracted.SYNC_SESSION_TIMEOUT = sec.sessionTimeout
          if (sec.maxFailedAttempts) extracted.SYNC_MAX_FAILED_ATTEMPTS = sec.maxFailedAttempts
          if (sec.rateLimitWindow) extracted.SYNC_RATE_LIMIT_WINDOW = sec.rateLimitWindow
          if (sec.rateLimitMaxRequests) extracted.SYNC_RATE_LIMIT_MAX_REQUESTS = sec.rateLimitMaxRequests
        }
      }
      
      // Database sync settings
      if (config.database) {
        if (config.database.maxConnections) extracted.SYNC_DB_MAX_CONNECTIONS = config.database.maxConnections
        if (config.database.connectionTimeout) extracted.SYNC_DB_CONNECTION_TIMEOUT = config.database.connectionTimeout
      }
      
      // Windows service settings
      if (config.service) {
        if (config.service.name) extracted.SERVICE_NAME = config.service.name
        if (config.service.displayName) extracted.SERVICE_DISPLAY_NAME = config.service.displayName
        if (config.service.description) extracted.SERVICE_DESCRIPTION = config.service.description
        if (config.service.autoStart !== undefined) extracted.SERVICE_AUTO_START = config.service.autoStart
        if (config.service.restartDelay) extracted.SERVICE_RESTART_DELAY = config.service.restartDelay
        if (config.service.maxRestarts) extracted.SERVICE_MAX_RESTARTS = config.service.maxRestarts
      }
      
      Object.assign(this.extractedConfig, extracted)
      this.log(`Extracted ${Object.keys(extracted).length} variables from service config`, 'success')
      
    } catch (error) {
      this.log(`Failed to extract from service config: ${error.message}`, 'error')
      throw error
    }
  }

  async extractFromSyncConfig(filepath) {
    this.log(`📤 Extracting from sync config: ${filepath}`)
    
    try {
      const config = JSON.parse(fs.readFileSync(filepath, 'utf8'))
      
      const extracted = {}
      
      // Sync configuration (may override service config values)
      if (config.nodeId) extracted.SYNC_NODE_ID = config.nodeId
      if (config.nodeName) extracted.SYNC_NODE_NAME = config.nodeName
      if (config.registrationKey) extracted.SYNC_REGISTRATION_KEY = config.registrationKey
      if (config.port) extracted.SYNC_SERVICE_PORT = config.port
      if (config.httpPort) extracted.SYNC_HTTP_PORT = config.httpPort
      if (config.syncInterval) extracted.SYNC_INTERVAL = config.syncInterval
      if (config.enableAutoStart !== undefined) extracted.SYNC_AUTO_START = config.enableAutoStart
      if (config.logLevel) extracted.SYNC_LOG_LEVEL = config.logLevel
      if (config.maxLogSize) extracted.SYNC_MAX_LOG_SIZE = config.maxLogSize
      if (config.maxLogFiles) extracted.SYNC_MAX_LOG_FILES = config.maxLogFiles
      if (config.autoRestart !== undefined) extracted.SYNC_AUTO_RESTART = config.autoRestart
      if (config.restartDelay) extracted.SYNC_RESTART_DELAY = config.restartDelay
      if (config.maxRestartAttempts) extracted.SYNC_MAX_RESTART_ATTEMPTS = config.maxRestartAttempts
      
      Object.assign(this.extractedConfig, extracted)
      this.log(`Extracted ${Object.keys(extracted).length} variables from sync config`, 'success')
      
    } catch (error) {
      this.log(`Failed to extract from sync config: ${error.message}`, 'error')
      throw error
    }
  }

  async readExistingEnv() {
    const existing = {}
    
    if (fs.existsSync(this.envPath)) {
      const content = fs.readFileSync(this.envPath, 'utf8')
      const lines = content.split('\n')
      
      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const [key, ...valueParts] = trimmed.split('=')
          const value = valueParts.join('=').replace(/^"(.+)"$/, '$1')
          existing[key.trim()] = value.trim()
        }
      }
    }
    
    return existing
  }

  async generateNewEnv() {
    this.log('📝 Generating new .env file...')
    
    const existing = await this.readExistingEnv()
    
    // Merge extracted config with existing, prioritizing extracted for migration
    const merged = { ...existing, ...this.extractedConfig }
    
    // Generate .env content based on .env.example structure
    let envContent = `# Multi-Business Management Platform - Environment Configuration
# Generated by environment migration on ${new Date().toISOString()}
# Original config files backed up with timestamp

# ================================
# DATABASE CONFIGURATION
# ================================
DATABASE_URL="${merged.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/multi_business_db'}"

# ================================
# NEXTAUTH CONFIGURATION
# ================================
NEXTAUTH_URL="${merged.NEXTAUTH_URL || 'http://localhost:8080'}"
NEXTAUTH_SECRET="${merged.NEXTAUTH_SECRET || 'generate-unique-secret-here'}"

# ================================
# SYNC SERVICE CONFIGURATION
# ================================
SYNC_NODE_ID="${merged.SYNC_NODE_ID || ''}"
SYNC_NODE_NAME="${merged.SYNC_NODE_NAME || ''}"
SYNC_REGISTRATION_KEY="${merged.SYNC_REGISTRATION_KEY || ''}"
SYNC_SERVICE_PORT=${merged.SYNC_SERVICE_PORT || 8765}
SYNC_HTTP_PORT=${merged.SYNC_HTTP_PORT || 8080}
SYNC_INTERVAL=${merged.SYNC_INTERVAL || 30000}
SYNC_AUTO_START=${merged.SYNC_AUTO_START !== undefined ? merged.SYNC_AUTO_START : true}
SYNC_LOG_LEVEL="${merged.SYNC_LOG_LEVEL || 'info'}"
SYNC_MAX_LOG_SIZE=${merged.SYNC_MAX_LOG_SIZE || 10485760}
SYNC_MAX_LOG_FILES=${merged.SYNC_MAX_LOG_FILES || 5}

# ================================
# SYNC SECURITY CONFIGURATION
# ================================
SYNC_ENABLE_ENCRYPTION=${merged.SYNC_ENABLE_ENCRYPTION !== undefined ? merged.SYNC_ENABLE_ENCRYPTION : true}
SYNC_ENABLE_SIGNATURES=${merged.SYNC_ENABLE_SIGNATURES !== undefined ? merged.SYNC_ENABLE_SIGNATURES : true}
SYNC_KEY_ROTATION_ENABLED=${merged.SYNC_KEY_ROTATION_ENABLED !== undefined ? merged.SYNC_KEY_ROTATION_ENABLED : false}
SYNC_SESSION_TIMEOUT=${merged.SYNC_SESSION_TIMEOUT || 3600000}
SYNC_MAX_FAILED_ATTEMPTS=${merged.SYNC_MAX_FAILED_ATTEMPTS || 5}
SYNC_RATE_LIMIT_WINDOW=${merged.SYNC_RATE_LIMIT_WINDOW || 60000}
SYNC_RATE_LIMIT_MAX_REQUESTS=${merged.SYNC_RATE_LIMIT_MAX_REQUESTS || 100}

# ================================
# DATABASE SYNC CONFIGURATION
# ================================
SYNC_DB_MAX_CONNECTIONS=${merged.SYNC_DB_MAX_CONNECTIONS || 20}
SYNC_DB_CONNECTION_TIMEOUT=${merged.SYNC_DB_CONNECTION_TIMEOUT || 30000}

# ================================
# WINDOWS SERVICE CONFIGURATION
# ================================
SERVICE_NAME="${merged.SERVICE_NAME || 'multi-business-sync'}"
SERVICE_DISPLAY_NAME="${merged.SERVICE_DISPLAY_NAME || 'Multi-Business Sync Service'}"
SERVICE_DESCRIPTION="${merged.SERVICE_DESCRIPTION || 'Peer-to-peer database synchronization service'}"
SERVICE_AUTO_START=${merged.SERVICE_AUTO_START !== undefined ? merged.SERVICE_AUTO_START : true}
SERVICE_RESTART_DELAY=${merged.SERVICE_RESTART_DELAY || 5000}
SERVICE_MAX_RESTARTS=${merged.SERVICE_MAX_RESTARTS || 3}

# ================================
# APPLICATION CONFIGURATION
# ================================
NODE_ENV="${merged.NODE_ENV || 'production'}"
PORT=${merged.PORT || 8080}
LOG_LEVEL="${merged.LOG_LEVEL || 'info'}"

# ================================
# ADDITIONAL SETTINGS (from existing .env)
# ================================`

    // Add any additional settings from existing .env that weren't migrated
    const migratedKeys = new Set(Object.keys(this.extractedConfig))
    const standardKeys = new Set(['DATABASE_URL', 'NEXTAUTH_URL', 'NEXTAUTH_SECRET', 'NODE_ENV', 'PORT', 'LOG_LEVEL'])
    
    for (const [key, value] of Object.entries(existing)) {
      if (!migratedKeys.has(key) && !standardKeys.has(key)) {
        envContent += `\n${key}="${value}"`
      }
    }

    fs.writeFileSync(this.envPath, envContent)
    this.log(`✅ Generated new .env file with ${Object.keys(merged).length} variables`)
  }

  async archiveConfigFiles() {
    this.log('📦 Archiving legacy config files...')
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const archiveDir = path.join(ROOT_DIR, 'config', 'archived')
    
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true })
    }
    
    for (const [key, filepath] of Object.entries(this.configPaths)) {
      if (fs.existsSync(filepath)) {
        const filename = path.basename(filepath)
        const archivedPath = path.join(archiveDir, `${filename}.migrated-${timestamp}`)
        
        fs.copyFileSync(filepath, archivedPath)
        this.log(`Archived: ${filepath} → ${archivedPath}`, 'success')
        
        // Add migration marker to original file
        const originalContent = fs.readFileSync(filepath, 'utf8')
        const migratedContent = {
          _migrated: true,
          _migratedAt: new Date().toISOString(),
          _migratedTo: '.env',
          _originalContent: JSON.parse(originalContent)
        }
        
        fs.writeFileSync(filepath, JSON.stringify(migratedContent, null, 2))
        this.log(`Marked ${filepath} as migrated`, 'success')
      }
    }
  }

  async validateMigration() {
    this.log('🔍 Validating migration...')
    
    // Load the new .env and verify key variables exist
    require('dotenv').config({ path: this.envPath })
    
    const requiredVars = ['DATABASE_URL', 'SYNC_NODE_ID', 'SYNC_REGISTRATION_KEY']
    const missing = []
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName)
      }
    }
    
    if (missing.length > 0) {
      this.log(`Missing required variables: ${missing.join(', ')}`, 'error')
      return false
    }
    
    this.log('✅ Migration validation passed')
    return true
  }

  async migrate(options = {}) {
    try {
      this.log('🚀 Starting environment migration...')
      
      // Detect config files
      const found = await this.detectConfigFiles()
      if (!found) {
        return { success: false, reason: 'No config files to migrate' }
      }
      
      // Backup existing .env files
      await this.backupExistingEnv()
      
      // Extract configuration
      if (found.serviceConfig) {
        await this.extractFromServiceConfig(found.serviceConfig)
      }
      
      if (found.syncConfig) {
        await this.extractFromSyncConfig(found.syncConfig)
      }
      
      // Generate new .env
      await this.generateNewEnv()
      
      // Archive config files (unless dry run)
      if (!options.dryRun) {
        await this.archiveConfigFiles()
      }
      
      // Validate migration
      const isValid = await this.validateMigration()
      
      this.log('🎉 Environment migration completed successfully!', 'success')
      
      return {
        success: true,
        extractedVars: Object.keys(this.extractedConfig).length,
        backupPaths: this.backupPaths,
        configFiles: found
      }
      
    } catch (error) {
      this.log(`Migration failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }

  async rollback() {
    this.log('🔄 Rolling back migration...')
    
    try {
      // Restore from backups
      for (const backupPath of this.backupPaths) {
        const originalPath = backupPath.replace(/\.backup-.*$/, '')
        if (fs.existsSync(backupPath)) {
          fs.copyFileSync(backupPath, originalPath)
          this.log(`Restored: ${originalPath}`, 'success')
        }
      }
      
      this.log('✅ Rollback completed', 'success')
      return { success: true }
      
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error')
      return { success: false, error: error.message }
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'migrate'
  
  const migrator = new EnvironmentMigrator()
  
  if (command === 'migrate') {
    const dryRun = args.includes('--dry-run')
    const result = await migrator.migrate({ dryRun })
    
    if (result.success) {
      console.log('\n🎯 Migration Summary:')
      console.log(`📊 Variables extracted: ${result.extractedVars}`)
      console.log(`📦 Backup files: ${result.backupPaths.length}`)
      console.log(`🗃️  Config files processed: ${Object.keys(result.configFiles).length}`)
      
      if (dryRun) {
        console.log('\n⚠️  This was a DRY RUN - no files were actually modified')
        console.log('Run without --dry-run to perform the migration')
      } else {
        console.log('\n✅ Migration complete! Your configuration has been moved to .env')
        console.log('🔄 Please restart any running services to pick up the new configuration')
      }
    } else {
      console.log(`\n❌ Migration failed: ${result.reason || result.error}`)
      process.exit(1)
    }
    
  } else if (command === 'rollback') {
    const result = await migrator.rollback()
    
    if (result.success) {
      console.log('\n✅ Rollback completed successfully')
    } else {
      console.log(`\n❌ Rollback failed: ${result.error}`)
      process.exit(1)
    }
    
  } else if (command === 'status') {
    const found = await migrator.detectConfigFiles()
    if (found) {
      console.log('\n📋 Legacy configuration files detected:')
      for (const filepath of Object.values(found)) {
        console.log(`  • ${filepath}`)
      }
      console.log('\n🔄 Run "node scripts/migrate-environment.js migrate" to migrate to .env')
    } else {
      console.log('\n✅ No legacy configuration files found')
      console.log('Configuration appears to be using environment variables already')
    }
    
  } else {
    console.log('\n📖 Environment Migration Tool')
    console.log('\nUsage:')
    console.log('  node scripts/migrate-environment.js migrate [--dry-run]  # Migrate config files to .env')
    console.log('  node scripts/migrate-environment.js rollback             # Restore from backups')
    console.log('  node scripts/migrate-environment.js status               # Check migration status')
    console.log('\nOptions:')
    console.log('  --dry-run    Show what would be migrated without making changes')
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  })
}

module.exports = { EnvironmentMigrator }