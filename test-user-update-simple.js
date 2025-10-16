const https = require('https')
const http = require('http')
const { URL } = require('url')

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const isHttps = urlObj.protocol === 'https:'
    const lib = isHttps ? https : http
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }
    
    const req = lib.request(requestOptions, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers })
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers })
        }
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    
    req.end()
  })
}

async function testUserUpdate() {
  try {
    console.log('🧪 Testing user update API...')
    
    // First, get users
    console.log('📥 Getting users list...')
    const getUserResponse = await makeRequest('http://localhost:8080/api/admin/users')
    
    console.log('Get users response status:', getUserResponse.status)
    
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
    console.log('📝 User business memberships:', testUser.businessMemberships?.length || 0)
    
    // Try to update the user with minimal changes
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
    
    console.log('🔄 Sending update request...')
    console.log('Update data sample:', {
      basicInfo: updateData.basicInfo,
      membershipCount: updateData.businessMemberships.length
    })
    
    const updateResponse = await makeRequest(`http://localhost:8080/api/admin/users/${testUser.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: updateData
    })
    
    console.log('Update response status:', updateResponse.status)
    console.log('Update response data:', JSON.stringify(updateResponse.data, null, 2))
    
    if (updateResponse.status === 200) {
      console.log('✅ User update successful!')
      
      if (updateResponse.data.success) {
        console.log('✅ API returned success: true')
      } else {
        console.log('⚠️  API returned success:', updateResponse.data.success)
      }
      
      if (updateResponse.data.message) {
        console.log('📝 Message:', updateResponse.data.message)
      }
      
    } else {
      console.log('❌ User update failed with status:', updateResponse.status)
      console.log('Error details:', updateResponse.data)
    }
    
  } catch (error) {
    console.error('❌ Error testing user update:', error.message)
  }
}

testUserUpdate()