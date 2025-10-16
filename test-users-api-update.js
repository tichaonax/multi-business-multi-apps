const axios = require('axios')

async function testUserUpdate() {
  try {
    console.log('🧪 Testing user update API...')
    
    // First, let's get a user to update
    const getUserResponse = await axios.get('http://localhost:8081/api/admin/users', {
      timeout: 10000,
      validateStatus: false
    })
    
    console.log('Get users response status:', getUserResponse.status)
    console.log('Get users response headers:', getUserResponse.headers)
    
    if (getUserResponse.status !== 200) {
      console.log('❌ Failed to get users:', getUserResponse.data)
      return
    }
    
    const users = getUserResponse.data.users || getUserResponse.data
    if (!users || users.length === 0) {
      console.log('❌ No users found to test with')
      return
    }
    
    const testUser = users[0]
    console.log('📝 Testing with user:', testUser.id, testUser.name)
    
    // Try to update the user
    const updateData = {
      basicInfo: {
        name: testUser.name,
        email: testUser.email,
        systemRole: testUser.systemRole || testUser.role || 'user',
        isActive: testUser.isActive !== false
      },
      userLevelPermissions: testUser.permissions || {},
      businessMemberships: testUser.businessMemberships || []
    }
    
    console.log('🔄 Sending update request with data:', JSON.stringify(updateData, null, 2))
    
    const updateResponse = await axios.patch(
      `http://localhost:8081/api/admin/users/${testUser.id}`,
      updateData,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000,
        validateStatus: false
      }
    )
    
    console.log('Update response status:', updateResponse.status)
    console.log('Update response headers:', updateResponse.headers)
    console.log('Update response data:', JSON.stringify(updateResponse.data, null, 2))
    
    if (updateResponse.status === 200) {
      console.log('✅ User update successful!')
    } else {
      console.log('❌ User update failed with status:', updateResponse.status)
    }
    
  } catch (error) {
    console.error('❌ Error testing user update:', error.message)
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
    }
  }
}

testUserUpdate()