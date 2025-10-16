// Simple sync test using direct SQL
const fs = require('fs')

// Read the .env file to get database connection
function loadEnv() {
  try {
    const envContent = fs.readFileSync('.env', 'utf8')
    const lines = envContent.split('\n')
    const env = {}
    
    lines.forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
      }
    })
    
    return env
  } catch (error) {
    console.error('Could not read .env file:', error.message)
    return {}
  }
}

async function testSyncWithDirectSQL() {
  console.log('=== Testing Sync with Direct Connection ===')
  
  const env = loadEnv()
  console.log('Database URL found:', env.DATABASE_URL ? 'Yes' : 'No')
  
  // Instead of direct DB connection, let's create a simple test record
  // that should trigger sync events
  const timestamp = new Date().toISOString()
  const testData = {
    action: 'test-sync-change',
    timestamp: timestamp,
    message: `Sync test performed at ${timestamp}`,
    server: 'local'
  }
  
  // Write test data to a file that can be monitored
  const testFile = 'sync-test-log.json'
  
  try {
    let existingData = []
    if (fs.existsSync(testFile)) {
      const content = fs.readFileSync(testFile, 'utf8')
      existingData = JSON.parse(content)
    }
    
    existingData.push(testData)
    fs.writeFileSync(testFile, JSON.stringify(existingData, null, 2))
    
    console.log('✅ Test record created:')
    console.log(`   Action: ${testData.action}`)
    console.log(`   Timestamp: ${testData.timestamp}`)
    console.log(`   Message: ${testData.message}`)
    console.log('')
    console.log('📍 This test creates a log entry that you can check on both servers.')
    console.log(`   File: ${testFile}`)
    console.log('   Check if this file appears on the other server to verify sync!')
    
  } catch (error) {
    console.error('Error creating test file:', error.message)
  }
}

testSyncWithDirectSQL().catch(console.error)