// Simple API test script (no Prisma dependency)
const fetch = require('node-fetch')

const BASE_URL = 'http://localhost:8080'
const BUSINESS_ID = '1a22f34a-cec8-4bf0-825b-3cbc1cd81946' // Update this with your business ID
const SPECIFIC_TOKEN = '2CJ8AC9K'

async function testAPIs() {
  console.log('\n=== WiFi Token API Diagnostic ===\n')
  console.log(`Testing with Business ID: ${BUSINESS_ID}`)
  console.log(`Looking for token: ${SPECIFIC_TOKEN}\n`)

  try {
    // Test 1: Database Ledger API
    console.log('─'.repeat(80))
    console.log('TEST 1: Database Ledger API')
    console.log('─'.repeat(80))

    const dbUrl = `${BASE_URL}/api/wifi-portal/tokens?businessId=${BUSINESS_ID}&status=UNUSED&limit=100`
    console.log(`\nURL: ${dbUrl}`)

    const dbResponse = await fetch(dbUrl)
    const dbData = await dbResponse.json()

    if (!dbResponse.ok) {
      console.log(`ERROR: ${dbResponse.status} - ${dbData.error || 'Unknown error'}`)
      return
    }

    console.log(`\nResponse: ${dbResponse.status} ${dbResponse.statusText}`)
    console.log(`Total tokens: ${dbData.tokens?.length || 0}`)

    if (dbData.tokens && dbData.tokens.length > 0) {
      console.log('\nFirst 10 tokens:')
      console.log('Token'.padEnd(15), 'Status'.padEnd(12), 'Config ID'.padEnd(40), 'Has Sale?')
      console.log('─'.repeat(100))

      let foundToken = null
      let unsoldCount = 0
      let soldCount = 0

      dbData.tokens.slice(0, 10).forEach(token => {
        const hasSale = token.sale !== null && token.sale !== undefined
        const marker = token.token === SPECIFIC_TOKEN ? '>>> ' : '    '

        if (token.token === SPECIFIC_TOKEN) {
          foundToken = token
        }

        console.log(
          marker + token.token.padEnd(15),
          token.status.padEnd(12),
          (token.tokenConfigId || 'null').substring(0, 36).padEnd(40),
          hasSale ? 'YES (SOLD)' : 'NO (available)'
        )

        if (hasSale) soldCount++
        else unsoldCount++
      })

      console.log('─'.repeat(100))
      console.log(`\nTotal UNUSED tokens: ${dbData.tokens.length}`)
      console.log(`Sold (not available): ${soldCount} of first 10`)
      console.log(`Unsold (available): ${unsoldCount} of first 10`)

      if (foundToken) {
        console.log(`\n>>> Token "${SPECIFIC_TOKEN}" FOUND in Database:`)
        console.log(`    Status: ${foundToken.status}`)
        console.log(`    Config ID: ${foundToken.tokenConfigId}`)
        console.log(`    Has Sale: ${foundToken.sale ? 'YES (NOT AVAILABLE FOR SALE)' : 'NO (AVAILABLE FOR SALE)'}`)
      } else {
        console.log(`\n>>> Token "${SPECIFIC_TOKEN}" NOT in first 10, checking all...`)
        const allMatch = dbData.tokens.find(t => t.token === SPECIFIC_TOKEN)
        if (allMatch) {
          console.log(`    FOUND at position ${dbData.tokens.indexOf(allMatch) + 1}`)
          console.log(`    Has Sale: ${allMatch.sale ? 'YES (NOT AVAILABLE)' : 'NO (AVAILABLE)'}`)
        } else {
          console.log(`    NOT FOUND in any of ${dbData.tokens.length} tokens`)
        }
      }
    }

    // Test 2: Database Ledger API with excludeSold filter
    console.log('\n\n' + '─'.repeat(80))
    console.log('TEST 2: Database Ledger API (excludeSold=true)')
    console.log('─'.repeat(80))

    const dbUnsoldUrl = `${BASE_URL}/api/wifi-portal/tokens?businessId=${BUSINESS_ID}&status=UNUSED&excludeSold=true&limit=100`
    console.log(`\nURL: ${dbUnsoldUrl}`)

    const dbUnsoldResponse = await fetch(dbUnsoldUrl)
    const dbUnsoldData = await dbUnsoldResponse.json()

    console.log(`\nResponse: ${dbUnsoldResponse.status} ${dbUnsoldResponse.statusText}`)
    console.log(`Unsold tokens: ${dbUnsoldData.tokens?.length || 0}`)

    if (dbUnsoldData.tokens && dbUnsoldData.tokens.length > 0) {
      console.log('\nUnsold tokens (available for sale):')
      dbUnsoldData.tokens.slice(0, 10).forEach((token, i) => {
        const marker = token.token === SPECIFIC_TOKEN ? '>>> ' : '    '
        console.log(`${marker}${i + 1}. ${token.token} (${token.tokenConfigId?.substring(0, 8)}...)`)
      })

      const foundUnsold = dbUnsoldData.tokens.find(t => t.token === SPECIFIC_TOKEN)
      if (foundUnsold) {
        console.log(`\n>>> Token "${SPECIFIC_TOKEN}" is UNSOLD and AVAILABLE`)
      } else {
        console.log(`\n>>> Token "${SPECIFIC_TOKEN}" is either SOLD or NOT FOUND`)
      }
    } else {
      console.log('\n⚠️  NO UNSOLD TOKENS FOUND!')
      console.log('   All tokens have been sold or none exist.')
    }

    // Test 3: ESP32 API
    console.log('\n\n' + '─'.repeat(80))
    console.log('TEST 3: ESP32 Portal API')
    console.log('─'.repeat(80))

    const esp32Url = `${BASE_URL}/api/wifi-portal/integration/tokens/list?businessId=${BUSINESS_ID}&status=unused&limit=20`
    console.log(`\nURL: ${esp32Url}`)

    const esp32Response = await fetch(esp32Url)
    const esp32Data = await esp32Response.json()

    if (!esp32Response.ok) {
      console.log(`ERROR: ${esp32Response.status} - ${esp32Data.error || 'Unknown error'}`)
      console.log('\n⚠️  Cannot test ESP32 cross-reference without ESP32 API access')
    } else {
      console.log(`\nResponse: ${esp32Response.status} ${esp32Response.statusText}`)
      console.log(`Total tokens from ESP32: ${esp32Data.tokens?.length || 0}`)

      if (esp32Data.tokens && esp32Data.tokens.length > 0) {
        console.log('\nFirst 10 ESP32 tokens:')
        esp32Data.tokens.slice(0, 10).forEach((token, i) => {
          const marker = token.token === SPECIFIC_TOKEN ? '>>> ' : '    '
          console.log(
            `${marker}${i + 1}. ${token.token}`,
            `status: ${token.status}`,
            `duration: ${token.duration_minutes}min`,
            `↓${token.bandwidth_down_mb}MB ↑${token.bandwidth_up_mb}MB`
          )
        })

        const foundInEsp32 = esp32Data.tokens.find(t => t.token === SPECIFIC_TOKEN)
        if (foundInEsp32) {
          console.log(`\n>>> Token "${SPECIFIC_TOKEN}" FOUND in ESP32:`)
          console.log(`    Status: ${foundInEsp32.status}`)
          console.log(`    Duration: ${foundInEsp32.duration_minutes} minutes`)
          console.log(`    Bandwidth: ↓${foundInEsp32.bandwidth_down_mb}MB ↑${foundInEsp32.bandwidth_up_mb}MB`)
        } else {
          console.log(`\n>>> Token "${SPECIFIC_TOKEN}" NOT in first 10, checking all...`)
          const allEsp32Match = esp32Data.tokens.find(t => t.token === SPECIFIC_TOKEN)
          if (allEsp32Match) {
            console.log(`    FOUND at position ${esp32Data.tokens.indexOf(allEsp32Match) + 1}`)
          } else {
            console.log(`    NOT FOUND in any of ${esp32Data.tokens.length} ESP32 tokens`)
          }
        }
      }

      // Test 4: Cross-reference simulation
      console.log('\n\n' + '─'.repeat(80))
      console.log('TEST 4: Cross-Reference Simulation')
      console.log('─'.repeat(80))

      if (dbUnsoldData.tokens && esp32Data.tokens) {
        const esp32TokenSet = new Set(esp32Data.tokens.map(t => t.token))
        const dbTokens = dbUnsoldData.tokens

        console.log(`\nESP32 tokens: ${esp32TokenSet.size}`)
        console.log(`Database unsold tokens: ${dbTokens.length}`)

        // Cross-reference
        const availableTokens = dbTokens.filter(dbToken => esp32TokenSet.has(dbToken.token))

        console.log(`\nTokens in BOTH (available for sale): ${availableTokens.length}`)

        if (availableTokens.length > 0) {
          console.log('\nAvailable tokens:')
          availableTokens.slice(0, 10).forEach((token, i) => {
            const marker = token.token === SPECIFIC_TOKEN ? '>>> ' : '    '
            console.log(`${marker}${i + 1}. ${token.token}`)
          })
        }

        // Check if specific token is available
        const specificAvailable = availableTokens.find(t => t.token === SPECIFIC_TOKEN)
        if (specificAvailable) {
          console.log(`\n✅ Token "${SPECIFIC_TOKEN}" IS AVAILABLE FOR SALE`)
        } else {
          console.log(`\n❌ Token "${SPECIFIC_TOKEN}" IS NOT AVAILABLE FOR SALE`)

          // Diagnose why
          const inDb = dbTokens.find(t => t.token === SPECIFIC_TOKEN)
          const inEsp32 = esp32TokenSet.has(SPECIFIC_TOKEN)

          console.log(`\nDiagnosis:`)
          console.log(`  - In Database (unsold): ${inDb ? 'YES' : 'NO'}`)
          console.log(`  - In ESP32: ${inEsp32 ? 'YES' : 'NO'}`)

          if (!inDb && !inEsp32) {
            console.log(`  - Issue: Token not in either source`)
          } else if (!inDb) {
            console.log(`  - Issue: Token is sold or not in database`)
          } else if (!inEsp32) {
            console.log(`  - Issue: Token not in ESP32 (deleted or never created there)`)
          }
        }
      }
    }

  } catch (error) {
    console.error('\nERROR:', error.message)
    console.error(error)
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`, { timeout: 2000 })
    return response.ok
  } catch {
    return false
  }
}

async function main() {
  const serverRunning = await checkServer()

  if (!serverRunning) {
    console.log('ERROR: Server not running at', BASE_URL)
    console.log('Please start the dev server first: npm run dev')
    process.exit(1)
  }

  await testAPIs()
}

main()
