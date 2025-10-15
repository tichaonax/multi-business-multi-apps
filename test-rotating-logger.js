/**
 * Test the daily rotating logger functionality
 */

const { DailyRotatingLogger } = require('./dist/lib/sync/rotating-logger')
const path = require('path')

async function testRotatingLogger() {
  console.log('🧪 Testing Daily Rotating Logger...\n')
  
  try {
    // Create a test logger
    const logger = new DailyRotatingLogger({
      logDir: path.join(process.cwd(), 'data', 'sync'),
      baseFileName: 'sync-service.log',
      maxAge: 14, // 2 weeks
      maxFiles: 20
    })

    console.log('✅ Logger created successfully')

    // Test different log levels
    logger.info('Test info message', { test: true, timestamp: new Date() })
    logger.warn('Test warning message', { level: 'warning' })
    logger.error('Test error message', { error: 'simulated error' })
    logger.debug('Test debug message', { debug: true })

    console.log('✅ Log messages written')

    // Get log stats
    const stats = logger.getLogStats()
    console.log('📊 Log Statistics:')
    console.log(`   Current file: ${stats.currentFile}`)
    console.log(`   Total files: ${stats.totalFiles}`)
    if (stats.oldestFile) console.log(`   Oldest file: ${stats.oldestFile}`)
    if (stats.newestFile) console.log(`   Newest file: ${stats.newestFile}`)

    // Wait a moment for file operations to complete
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Close logger
    logger.close()
    console.log('✅ Logger closed')

    console.log('\n🎉 Rotating logger test completed successfully!')
    console.log('\n💡 You can now check the log file:')
    console.log(`   node manage-logs.js view sync-service-${new Date().toISOString().split('T')[0]}.log`)

  } catch (error) {
    console.error('❌ Logger test failed:', error)
    process.exit(1)
  }
}

testRotatingLogger()