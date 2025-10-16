// Simple test to see what the API returns during update
const test = async () => {
  try {
    // First get a user
    const getUsersResponse = await fetch('http://localhost:8080/api/admin/users')
    console.log('Get users status:', getUsersResponse.status)
    
    if (getUsersResponse.status !== 200) {
      console.log('Get users failed:', await getUsersResponse.text())
      return
    }
    
    const users = await getUsersResponse.json()
    console.log('Users found:', users.length)
    
    if (users.length === 0) {
      console.log('No users to test with')
      return
    }
    
    const testUser = users[0]
    console.log('Testing with user:', testUser.id, testUser.name)
    
    // Now try to update the user
    const updatePayload = {
      basicInfo: {
        name: testUser.name,
        email: testUser.email, 
        systemRole: testUser.systemRole || testUser.role || 'user',
        isActive: testUser.isActive !== false
      },
      userLevelPermissions: testUser.permissions || {},
      businessMemberships: testUser.businessMemberships || []
    }
    
    console.log('Update payload:', JSON.stringify(updatePayload, null, 2))
    
    const updateResponse = await fetch(`http://localhost:8080/api/admin/users/${testUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatePayload)
    })
    
    console.log('Update response status:', updateResponse.status)
    console.log('Update response ok:', updateResponse.ok)
    console.log('Update response headers:', Object.fromEntries([...updateResponse.headers.entries()]))
    
    const updateData = await updateResponse.json()
    console.log('Update response data:', JSON.stringify(updateData, null, 2))
    
    if (updateResponse.ok) {
      console.log('✅ Update successful!')
      console.log('Success field:', updateData.success)
      console.log('Message field:', updateData.message)
    } else {
      console.log('❌ Update failed!')
      console.log('Error field:', updateData.error)
    }
    
  } catch (error) {
    console.error('Test error:', error)
  }
}

// For use in browser console
console.log('To test, run: test()')
window.test = test