async function testDriverAPI() {
  try {
    console.log('Testing driver API endpoint...\n')

    const response = await fetch('http://localhost:8080/api/vehicles/drivers?page=1&limit=20')

    if (!response.ok) {
      console.error(`❌ API returned status ${response.status}`)
      return
    }

    const result = await response.json()

    console.log(`✓ API Response Success: ${result.success}`)
    console.log(`✓ Total Drivers: ${result.data?.length || 0}\n`)

    const tichaonaDriver = result.data?.find(d => d.fullName === 'Tichaona Hwandaza')

    if (!tichaonaDriver) {
      console.log('❌ Driver "Tichaona Hwandaza" not found in API response')
      return
    }

    console.log('Driver "Tichaona Hwandaza" API Response:')
    console.log(`  ID: ${tichaonaDriver.id}`)
    console.log(`  Full Name: ${tichaonaDriver.fullName}`)
    console.log(`  License: ${tichaonaDriver.licenseNumber}`)
    console.log(`  Email: ${tichaonaDriver.emailAddress}`)
    console.log(`  User ID (FK): ${tichaonaDriver.userId}`)
    console.log()

    if (tichaonaDriver.user) {
      console.log('✓ User Object Included in API Response:')
      console.log(`  User ID: ${tichaonaDriver.user.id}`)
      console.log(`  Username: ${tichaonaDriver.user.name}`)
      console.log(`  Email: ${tichaonaDriver.user.email}`)
      console.log(`  Is Active: ${tichaonaDriver.user.isActive}`)
    } else {
      console.log('❌ No user object in API response')
      console.log('  This means the API is not including the user relation')
    }

  } catch (error) {
    console.error('Error:', error.message)
  }
}

testDriverAPI()
