/**
 * Sync Service Log Management Utility
 * View, clean, and manage sync service log files
 */

const fs = require('fs')
const path = require('path')

const LOG_DIR = path.join(process.cwd(), 'data', 'sync')
const BASE_LOG_NAME = 'sync-service'

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

function listLogFiles() {
  console.log('📂 Sync Service Log Files')
  console.log('=' .repeat(50))
  
  if (!fs.existsSync(LOG_DIR)) {
    console.log('❌ Log directory does not exist:', LOG_DIR)
    return
  }

  const files = fs.readdirSync(LOG_DIR)
  const logFiles = files
    .filter(file => file.startsWith(`${BASE_LOG_NAME}-`) && file.endsWith('.log'))
    .map(file => {
      const fullPath = path.join(LOG_DIR, file)
      const stats = fs.statSync(fullPath)
      
      // Extract date from filename
      const dateMatch = file.match(/-(\d{4}-\d{2}-\d{2})\.log$/)
      const fileDate = dateMatch ? dateMatch[1] : 'unknown'
      
      return {
        name: file,
        path: fullPath,
        size: stats.size,
        modified: stats.mtime,
        date: fileDate,
        age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24))
      }
    })
    .sort((a, b) => b.modified - a.modified) // Newest first

  if (logFiles.length === 0) {
    console.log('📝 No log files found')
    return
  }

  console.log(`Found ${logFiles.length} log file(s):\n`)

  logFiles.forEach((file, index) => {
    const isToday = file.date === new Date().toISOString().split('T')[0]
    const indicator = isToday ? '🔴 CURRENT' : file.age < 7 ? '🟡 RECENT' : '⚫ OLD'
    
    console.log(`${index + 1}. ${indicator} ${file.name}`)
    console.log(`   📅 Date: ${file.date}`)
    console.log(`   📊 Size: ${formatBytes(file.size)}`)
    console.log(`   🕒 Modified: ${formatDate(file.modified)}`)
    console.log(`   📈 Age: ${file.age} days`)
    console.log('')
  })

  // Summary
  const totalSize = logFiles.reduce((sum, file) => sum + file.size, 0)
  const oldFiles = logFiles.filter(file => file.age > 14)
  
  console.log('📊 Summary:')
  console.log(`   Total files: ${logFiles.length}`)
  console.log(`   Total size: ${formatBytes(totalSize)}`)
  console.log(`   Files > 14 days: ${oldFiles.length}`)
  
  if (oldFiles.length > 0) {
    const oldSize = oldFiles.reduce((sum, file) => sum + file.size, 0)
    console.log(`   Old files size: ${formatBytes(oldSize)}`)
    console.log(`   💡 Consider running: node manage-logs.js --cleanup`)
  }
}

function viewLogFile(filename, lines = 50) {
  const filePath = path.join(LOG_DIR, filename)
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Log file not found: ${filename}`)
    return
  }

  console.log(`📖 Last ${lines} lines from ${filename}`)
  console.log('=' .repeat(60))

  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const allLines = content.trim().split('\n')
    const recentLines = allLines.slice(-lines)

    recentLines.forEach(line => {
      try {
        const logEntry = JSON.parse(line)
        const timestamp = new Date(logEntry.timestamp).toLocaleString()
        const level = logEntry.level.padEnd(5)
        const levelColor = {
          'ERROR': '🔴',
          'WARN': '🟡', 
          'INFO': '🔵',
          'DEBUG': '⚪'
        }[logEntry.level] || '⚫'
        
        console.log(`${levelColor} [${timestamp}] ${level} ${logEntry.message}`)
        
        if (logEntry.data && Object.keys(logEntry.data).length > 0) {
          console.log(`    ${JSON.stringify(logEntry.data)}`)
        }
      } catch (e) {
        // Fallback for non-JSON log lines
        console.log(line)
      }
    })
  } catch (error) {
    console.error('❌ Failed to read log file:', error.message)
  }
}

function cleanupOldLogs(dryRun = false) {
  console.log(`🧹 ${dryRun ? 'DRY RUN - ' : ''}Cleaning up old log files...`)
  
  if (!fs.existsSync(LOG_DIR)) {
    console.log('❌ Log directory does not exist:', LOG_DIR)
    return
  }

  const files = fs.readdirSync(LOG_DIR)
  const logFiles = files
    .filter(file => file.startsWith(`${BASE_LOG_NAME}-`) && file.endsWith('.log'))
    .map(file => {
      const fullPath = path.join(LOG_DIR, file)
      const stats = fs.statSync(fullPath)
      return {
        name: file,
        path: fullPath,
        age: Math.floor((Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)),
        size: stats.size
      }
    })

  const oldFiles = logFiles.filter(file => file.age > 14)
  
  if (oldFiles.length === 0) {
    console.log('✅ No old files to clean up')
    return
  }

  console.log(`Found ${oldFiles.length} files older than 14 days:`)
  
  let totalSize = 0
  oldFiles.forEach(file => {
    totalSize += file.size
    console.log(`   ${file.name} (${file.age} days old, ${formatBytes(file.size)})`)
    
    if (!dryRun) {
      try {
        fs.unlinkSync(file.path)
        console.log(`   ✅ Deleted`)
      } catch (error) {
        console.log(`   ❌ Failed to delete: ${error.message}`)
      }
    }
  })

  console.log(`\n📊 ${dryRun ? 'Would free' : 'Freed'} ${formatBytes(totalSize)} of disk space`)
}

function showUsage() {
  console.log(`
📋 Sync Service Log Management Utility

Usage:
  node manage-logs.js [command] [options]

Commands:
  list                     List all log files with details
  view <filename> [lines]  View last N lines of a log file (default: 50)
  cleanup                  Delete log files older than 14 days
  cleanup --dry-run        Show what would be deleted without actually deleting
  
Examples:
  node manage-logs.js list
  node manage-logs.js view sync-service-2025-10-15.log 100
  node manage-logs.js cleanup --dry-run
  node manage-logs.js cleanup

Log Directory: ${LOG_DIR}
`)
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.length === 0) {
  listLogFiles()
} else {
  const command = args[0]
  
  switch (command) {
    case 'list':
      listLogFiles()
      break
      
    case 'view':
      if (args.length < 2) {
        console.log('❌ Please specify a log file name')
        console.log('Example: node manage-logs.js view sync-service-2025-10-15.log')
        break
      }
      const filename = args[1]
      const lines = args[2] ? parseInt(args[2]) : 50
      viewLogFile(filename, lines)
      break
      
    case 'cleanup':
      const dryRun = args.includes('--dry-run')
      cleanupOldLogs(dryRun)
      break
      
    case 'help':
    case '--help':
    case '-h':
      showUsage()
      break
      
    default:
      console.log(`❌ Unknown command: ${command}`)
      showUsage()
  }
}