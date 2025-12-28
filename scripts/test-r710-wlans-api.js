const https = require('https')
const http = require('http')

async function testWLANsAPI() {
  try {
    console.log('🧪 Testing R710 WLANs API...\n')

    // Test without businessId (should return all WLANs for admin)
    const url = 'http://localhost:8080/api/r710/wlans'

    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
        })

        res.on('end', () => {
          try {
            const result = JSON.parse(data)

            console.log('📊 API Response:')
            console.log(`   Status Code: ${res.statusCode}`)
            console.log(`   Response Keys: ${Object.keys(result).join(', ')}`)

            if (result.wlans) {
              console.log(`\n✅ Found ${result.wlans.length} WLAN(s)\n`)

              result.wlans.forEach((wlan, index) => {
                console.log(`WLAN #${index + 1}:`)
                console.log(`  ID: ${wlan.id}`)
                console.log(`  SSID: ${wlan.ssid}`)
                console.log(`  Title: ${wlan.title}`)
                console.log(`  Business: ${wlan.businesses?.name || 'N/A'}`)
                console.log(`  Device IP: ${wlan.device_registry?.ipAddress || 'N/A'}`)
                console.log(`  Token Packages: ${wlan.tokenPackages}`)
                console.log(`  Valid Days: ${wlan.validDays}`)
                console.log(`  Active: ${wlan.isActive ? '✅' : '❌'}`)
                console.log(`  Friendly Key: ${wlan.enableFriendlyKey ? '✅' : '❌'}`)
                console.log()
              })
            } else if (result.error) {
              console.log(`❌ API Error: ${result.error}`)
            } else {
              console.log('⚠️  Unexpected response format')
              console.log(JSON.stringify(result, null, 2))
            }

            resolve()
          } catch (error) {
            console.error('❌ Failed to parse JSON:', error.message)
            console.log('Raw response:', data)
            reject(error)
          }
        })
      }).on('error', (error) => {
        console.error('❌ HTTP Request Error:', error.message)
        console.log('\n⚠️  Make sure the dev server is running on http://localhost:8080')
        reject(error)
      })
    })
  } catch (error) {
    console.error('❌ Test Error:', error.message)
  }
}

testWLANsAPI()
