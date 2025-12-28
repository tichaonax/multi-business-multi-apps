/**
 * Test WLAN XML Parsing
 *
 * Test if the parsing pattern correctly extracts WLANs
 */

const fs = require('fs')

const xmlContent = fs.readFileSync('r710-wlan-response.xml', 'utf8')

console.log('\n🧪 Testing WLAN XML Parsing...\n')

// Pattern from discover-wlans API
const wlanMatches = xmlContent.match(/<wlansvc [^>]+>/g) || []

console.log(`Found ${wlanMatches.length} WLAN matches\n`)

wlanMatches.forEach((wlanXml, i) => {
  const getAttribute = (attr) => {
    const match = wlanXml.match(new RegExp(`${attr}="([^"]+)"`))
    return match ? match[1] : ''
  }

  const name = getAttribute('name')
  const ssid = getAttribute('ssid')
  const id = getAttribute('id')
  const guestServiceId = getAttribute('guestservice-id')
  const isGuest = getAttribute('is-guest')

  console.log(`${i + 1}. ${name}`)
  console.log(`   SSID: ${ssid}`)
  console.log(`   ID: ${id}`)
  console.log(`   Guest Service ID: ${guestServiceId}`)
  console.log(`   Is Guest: ${isGuest}`)
  console.log()
})

console.log('✅ Parsing test complete')
