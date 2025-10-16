// Direct Node.js test for sync functionality
const fs = require('fs')
const path = require('path')

async function createSimpleTestFile() {
  const timestamp = new Date().toISOString()
  const testData = {
    testId: `sync-test-${Date.now()}`,
    message: 'This is a sync test from the local server',
    timestamp: timestamp,
    server: 'local',
    randomValue: Math.floor(Math.random() * 10000)
  }
  
  // Create test file in public directory so it can be accessed via web
  const testFilePath = path.join('public', 'sync-test-data.json')
  
  try {
    // Ensure public directory exists
    if (!fs.existsSync('public')) {
      fs.mkdirSync('public', { recursive: true })
    }
    
    let allTests = []
    if (fs.existsSync(testFilePath)) {
      const existingContent = fs.readFileSync(testFilePath, 'utf8')
      try {
        allTests = JSON.parse(existingContent)
      } catch (e) {
        allTests = []
      }
    }
    
    allTests.push(testData)
    
    // Keep only last 10 tests
    if (allTests.length > 10) {
      allTests = allTests.slice(-10)
    }
    
    fs.writeFileSync(testFilePath, JSON.stringify(allTests, null, 2))
    
    console.log('✅ Test file created successfully!')
    console.log(`   File: ${testFilePath}`)
    console.log(`   Test ID: ${testData.testId}`)
    console.log(`   Timestamp: ${testData.timestamp}`)
    console.log(`   Random Value: ${testData.randomValue}`)
    console.log('')
    console.log('🌐 You can now check:')
    console.log('   Local: http://localhost:8080/sync-test-data.json')
    console.log('   Remote: http://[remote-server]:8080/sync-test-data.json')
    console.log('')
    console.log('🔍 Compare the files - they should have the same content if sync is working!')
    
    return testData
    
  } catch (error) {
    console.error('❌ Failed to create test file:', error.message)
    return null
  }
}

// Also create a simple HTML page to view the test
async function createTestViewerPage() {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sync Test Viewer</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .test-item { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .timestamp { color: #666; font-size: 0.9em; }
    .test-id { font-weight: bold; color: #333; }
    .random-value { color: #007acc; font-weight: bold; }
    button { background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; }
    button:hover { background: #005fa3; }
  </style>
</head>
<body>
  <h1>🔄 Sync Test Viewer</h1>
  <p>This page shows sync test data. Compare this page between servers to verify sync is working.</p>
  
  <button onclick="refreshData()">🔄 Refresh Data</button>
  <button onclick="location.reload()">↻ Reload Page</button>
  
  <div id="test-data">Loading test data...</div>
  
  <script>
    async function loadTestData() {
      try {
        const response = await fetch('/sync-test-data.json');
        const data = await response.json();
        
        const container = document.getElementById('test-data');
        if (data.length === 0) {
          container.innerHTML = '<p>No test data found.</p>';
          return;
        }
        
        container.innerHTML = '<h2>Test Results:</h2>' + 
          data.map(test => \`
            <div class="test-item">
              <div class="test-id">Test ID: \${test.testId}</div>
              <div>Message: \${test.message}</div>
              <div>Server: \${test.server}</div>
              <div class="random-value">Random Value: \${test.randomValue}</div>
              <div class="timestamp">Timestamp: \${test.timestamp}</div>
            </div>
          \`).join('');
          
      } catch (error) {
        document.getElementById('test-data').innerHTML = 
          '<p style="color: red;">Error loading test data: ' + error.message + '</p>';
      }
    }
    
    function refreshData() {
      loadTestData();
    }
    
    // Load data on page load
    loadTestData();
    
    // Auto-refresh every 30 seconds
    setInterval(loadTestData, 30000);
  </script>
</body>
</html>`
  
  try {
    fs.writeFileSync(path.join('public', 'sync-test.html'), htmlContent)
    console.log('📄 Test viewer page created: http://localhost:8080/sync-test.html')
  } catch (error) {
    console.error('Failed to create test viewer page:', error.message)
  }
}

async function runFullTest() {
  console.log('=== Creating Simple Sync Test ===\n')
  
  const testData = await createSimpleTestFile()
  if (testData) {
    await createTestViewerPage()
    
    console.log('\n🎯 Sync Test Instructions:')
    console.log('1. Open both test pages in your browser:')
    console.log('   - Local: http://localhost:8080/sync-test.html')
    console.log('   - Remote: http://[remote-ip]:8080/sync-test.html')
    console.log('')
    console.log('2. Both pages should show the same test data')
    console.log('3. The random value should match between servers')
    console.log('4. Create another test by running this script again')
    console.log('')
    console.log('⚡ This is a simple file-based test to verify basic sync functionality!')
  }
}

runFullTest().catch(console.error)