#!/usr/bin/env node

/**
 * Schema Protection Utility
 * 
 * Ensures prisma/schema.prisma is not modified during deployment operations.
 * This script can be used to validate or restore the schema file.
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT_DIR = path.join(__dirname, '..')
const SCHEMA_PATH = path.join(ROOT_DIR, 'prisma', 'schema.prisma')
const SCHEMA_BACKUP_PATH = path.join(ROOT_DIR, '.schema.backup')

class SchemaProtector {
  constructor() {
    this.schemaPath = SCHEMA_PATH
    this.backupPath = SCHEMA_BACKUP_PATH
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      warn: '\x1b[33m',
      error: '\x1b[31m'
    }
    const reset = '\x1b[0m'
    console.log(`${colors[type]}${message}${reset}`)
  }

  getSchemaHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex')
  }

  createBackup() {
    try {
      if (fs.existsSync(this.schemaPath)) {
        const content = fs.readFileSync(this.schemaPath, 'utf8')
        const hash = this.getSchemaHash(content)
        
        const backup = {
          content,
          hash,
          timestamp: new Date().toISOString()
        }
        
        fs.writeFileSync(this.backupPath, JSON.stringify(backup, null, 2))
        this.log(`✅ Schema backup created with hash: ${hash.substring(0, 12)}...`, 'success')
        return hash
      }
    } catch (error) {
      this.log(`❌ Failed to create schema backup: ${error.message}`, 'error')
      throw error
    }
  }

  validateSchema() {
    try {
      if (!fs.existsSync(this.schemaPath)) {
        this.log('❌ Schema file not found!', 'error')
        return { valid: false, reason: 'File not found' }
      }

      if (!fs.existsSync(this.backupPath)) {
        this.log('⚠️  No backup found to compare against', 'warn')
        return { valid: true, reason: 'No backup for comparison' }
      }

      const currentContent = fs.readFileSync(this.schemaPath, 'utf8')
      const currentHash = this.getSchemaHash(currentContent)

      const backup = JSON.parse(fs.readFileSync(this.backupPath, 'utf8'))
      const backupHash = backup.hash

      if (currentHash === backupHash) {
        this.log('✅ Schema file is unchanged', 'success')
        return { valid: true, reason: 'Hash matches backup' }
      } else {
        this.log(`⚠️  Schema file has been modified!`, 'warn')
        this.log(`   Original hash: ${backupHash.substring(0, 12)}...`, 'warn')
        this.log(`   Current hash:  ${currentHash.substring(0, 12)}...`, 'warn')
        return { 
          valid: false, 
          reason: 'Schema modified',
          originalHash: backupHash,
          currentHash
        }
      }

    } catch (error) {
      this.log(`❌ Failed to validate schema: ${error.message}`, 'error')
      return { valid: false, reason: error.message }
    }
  }

  restoreSchema() {
    try {
      if (!fs.existsSync(this.backupPath)) {
        this.log('❌ No backup found to restore from', 'error')
        return false
      }

      const backup = JSON.parse(fs.readFileSync(this.backupPath, 'utf8'))
      fs.writeFileSync(this.schemaPath, backup.content)
      
      this.log('✅ Schema restored from backup', 'success')
      this.log(`   Restored hash: ${backup.hash.substring(0, 12)}...`, 'info')
      this.log(`   Backup date: ${backup.timestamp}`, 'info')
      
      return true

    } catch (error) {
      this.log(`❌ Failed to restore schema: ${error.message}`, 'error')
      return false
    }
  }

  showDifferences() {
    try {
      if (!fs.existsSync(this.backupPath)) {
        this.log('❌ No backup found for comparison', 'error')
        return
      }

      const currentContent = fs.readFileSync(this.schemaPath, 'utf8')
      const backup = JSON.parse(fs.readFileSync(this.backupPath, 'utf8'))
      
      // Simple line-by-line comparison
      const currentLines = currentContent.split('\n')
      const backupLines = backup.content.split('\n')
      
      const maxLines = Math.max(currentLines.length, backupLines.length)
      let differences = 0
      
      this.log('\n📋 Schema Differences:', 'info')
      this.log('='.repeat(50), 'info')
      
      for (let i = 0; i < maxLines; i++) {
        const currentLine = currentLines[i] || ''
        const backupLine = backupLines[i] || ''
        
        if (currentLine !== backupLine) {
          differences++
          this.log(`Line ${i + 1}:`, 'warn')
          this.log(`  - ${backupLine}`, 'error')
          this.log(`  + ${currentLine}`, 'success')
          this.log('', 'info')
        }
      }
      
      if (differences === 0) {
        this.log('No differences found', 'success')
      } else {
        this.log(`Found ${differences} differences`, 'warn')
      }

    } catch (error) {
      this.log(`❌ Failed to show differences: ${error.message}`, 'error')
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2)
  const command = args[0] || 'validate'
  
  const protector = new SchemaProtector()
  
  switch (command) {
    case 'backup':
      protector.createBackup()
      break
      
    case 'validate':
      const validation = protector.validateSchema()
      if (!validation.valid) {
        process.exit(1)
      }
      break
      
    case 'restore':
      const restored = protector.restoreSchema()
      if (!restored) {
        process.exit(1)
      }
      break
      
    case 'diff':
      protector.showDifferences()
      break
      
    case 'status':
      const status = protector.validateSchema()
      console.log(JSON.stringify(status, null, 2))
      break
      
    default:
      console.log('\n📖 Schema Protection Tool')
      console.log('\nUsage:')
      console.log('  node scripts/schema-protector.js backup     # Create schema backup')
      console.log('  node scripts/schema-protector.js validate   # Check if schema changed')
      console.log('  node scripts/schema-protector.js restore    # Restore from backup')
      console.log('  node scripts/schema-protector.js diff       # Show differences')
      console.log('  node scripts/schema-protector.js status     # JSON status output')
      console.log('\nTip: Run "backup" before deployment operations')
      console.log('     Run "validate" after to check for unwanted changes')
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Schema protector failed:', error.message)
    process.exit(1)
  })
}

module.exports = { SchemaProtector }