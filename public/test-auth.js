// Test authentication API call
const testAuth = async () => {
  try {
    console.log('🧪 Testing authentication with admin users API...')
    
    // First test the session endpoint
    const sessionResponse = await fetch('/api/auth/session')
    console.log('Session API status:', sessionResponse.status)
    
    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json()
      console.log('Session data:', sessionData)
    } else {
      console.log('Session API failed:', await sessionResponse.text())
    }
    
    // Now test the admin users endpoint
    const usersResponse = await fetch('/api/admin/users')
    console.log('Admin users API status:', usersResponse.status)
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json()
      console.log('Users count:', usersData.length)
    } else {
      const errorData = await usersResponse.json()
      console.log('Admin users API failed:', errorData)
    }
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

// Run test
testAuth()