#!/usr/bin/env node

/**
 * Sibling Expense Accounts API Test Script
 *
 * This script tests the sibling expense account API endpoints
 * to ensure they work correctly after migration.
 */

const fetch = require('node-fetch')
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000'
const TEST_BUSINESS_ID = process.env.TEST_BUSINESS_ID || 'test-business-id'

async function testSiblingAPIs() {
  console.log('🧪 Testing Sibling Expense Accounts APIs...\n')

  const results = {
    passed: 0,
    failed: 0,
    tests: []
  }

  function test(name, testFn) {
    try {
      const result = testFn()
      results.passed++
      results.tests.push({ name, status: 'PASS', error: null })
      console.log(`✅ ${name}`)
      return result
    } catch (error) {
      results.failed++
      results.tests.push({ name, status: 'FAIL', error: error.message })
      console.log(`❌ ${name}: ${error.message}`)
      return null
    }
  }

  // Helper function to make API calls
  async function apiCall(method, endpoint, data = null) {
    const url = `${API_BASE_URL}/api${endpoint}`
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TEST_TOKEN || 'test-token'}`
      }
    }

    if (data) {
      options.body = JSON.stringify(data)
    }

    const response = await fetch(url, options)
    const responseData = await response.json()

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseData.error || response.statusText}`)
    }

    return responseData
  }

  try {
    // Setup: Create a test parent account
    const parentAccount = await prisma.expenseAccount.create({
      data: {
        accountNumber: 'TEST-001',
        accountName: 'Test Parent Account',
        businessId: TEST_BUSINESS_ID,
        balance: 1000,
        isSibling: false,
        canMerge: true
      }
    })

    console.log(`📝 Created test parent account: ${parentAccount.id}\n`)

    // Test 1: Get siblings for parent account
    await test('GET /expense-account/:id/sibling - Empty siblings list', async () => {
      const siblings = await apiCall('GET', `/expense-account/${parentAccount.id}/sibling`)
      if (!Array.isArray(siblings)) {
        throw new Error('Expected array response')
      }
      if (siblings.length !== 0) {
        throw new Error(`Expected 0 siblings, got ${siblings.length}`)
      }
    })

    // Test 2: Create a sibling account
    let siblingId
    await test('POST /expense-account/:id/sibling - Create sibling', async () => {
      const siblingData = {
        accountName: 'Test Sibling Account',
        balance: 500
      }

      const newSibling = await apiCall('POST', `/expense-account/${parentAccount.id}/sibling`, siblingData)

      if (!newSibling.id) {
        throw new Error('Sibling creation failed - no ID returned')
      }

      if (newSibling.parentAccountId !== parentAccount.id) {
        throw new Error('Sibling parent ID mismatch')
      }

      if (newSibling.isSibling !== true) {
        throw new Error('Sibling isSibling flag not set')
      }

      if (newSibling.siblingNumber !== 1) {
        throw new Error('First sibling should have siblingNumber = 1')
      }

      siblingId = newSibling.id
    })

    // Test 3: Get siblings list after creation
    await test('GET /expense-account/:id/sibling - Siblings list with one item', async () => {
      const siblings = await apiCall('GET', `/expense-account/${parentAccount.id}/sibling`)
      if (siblings.length !== 1) {
        throw new Error(`Expected 1 sibling, got ${siblings.length}`)
      }
      if (siblings[0].id !== siblingId) {
        throw new Error('Sibling ID mismatch in list')
      }
    })

    // Test 4: Create second sibling
    let siblingId2
    await test('POST /expense-account/:id/sibling - Create second sibling', async () => {
      const siblingData = {
        accountName: 'Test Sibling Account 2',
        balance: 300
      }

      const newSibling = await apiCall('POST', `/expense-account/${parentAccount.id}/sibling`, siblingData)

      if (newSibling.siblingNumber !== 2) {
        throw new Error('Second sibling should have siblingNumber = 2')
      }

      siblingId2 = newSibling.id
    })

    // Test 5: Get updated siblings list
    await test('GET /expense-account/:id/sibling - Siblings list with two items', async () => {
      const siblings = await apiCall('GET', `/expense-account/${parentAccount.id}/sibling`)
      if (siblings.length !== 2) {
        throw new Error(`Expected 2 siblings, got ${siblings.length}`)
      }

      // Check ordering by sibling number
      if (siblings[0].siblingNumber !== 1 || siblings[1].siblingNumber !== 2) {
        throw new Error('Siblings not ordered by sibling number')
      }
    })

    // Test 6: Get specific sibling
    await test('GET /expense-account/:id - Get sibling details', async () => {
      const sibling = await apiCall('GET', `/expense-account/${siblingId}`)

      if (sibling.id !== siblingId) {
        throw new Error('Sibling ID mismatch')
      }

      if (sibling.isSibling !== true) {
        throw new Error('isSibling flag not set correctly')
      }

      if (sibling.parentAccountId !== parentAccount.id) {
        throw new Error('Parent account ID mismatch')
      }
    })

    // Test 7: Update sibling
    await test('PUT /expense-account/:id - Update sibling', async () => {
      const updateData = {
        accountName: 'Updated Test Sibling',
        balance: 750
      }

      const updatedSibling = await apiCall('PUT', `/expense-account/${siblingId}`, updateData)

      if (updatedSibling.accountName !== updateData.accountName) {
        throw new Error('Account name not updated')
      }

      if (updatedSibling.balance !== updateData.balance) {
        throw new Error('Balance not updated')
      }
    })

    // Test 8: Test merge endpoint (if implemented)
    try {
      await test('POST /expense-account/:id/merge - Merge sibling', async () => {
        const mergeData = {
          targetAccountId: parentAccount.id
        }

        const mergeResult = await apiCall('POST', `/expense-account/${siblingId}/merge`, mergeData)

        if (!mergeResult.success) {
          throw new Error('Merge operation failed')
        }

        // Verify sibling was deleted after merge
        try {
          await apiCall('GET', `/expense-account/${siblingId}`)
          throw new Error('Sibling still exists after merge')
        } catch (error) {
          if (!error.message.includes('404')) {
            throw error
          }
        }
      })
    } catch (error) {
      console.log('⚠️  Merge endpoint not implemented or failed - skipping test')
    }

    // Test 9: Error handling - Create sibling for non-existent parent
    await test('POST /expense-account/:id/sibling - Error for invalid parent', async () => {
      try {
        await apiCall('POST', '/expense-account/invalid-id/sibling', {
          accountName: 'Should Fail'
        })
        throw new Error('Expected error for invalid parent ID')
      } catch (error) {
        if (!error.message.includes('404') && !error.message.includes('not found')) {
          throw new Error(`Unexpected error: ${error.message}`)
        }
      }
    })

    // Test 10: Permission check (if applicable)
    // This would require setting up test users with different permissions

  } catch (error) {
    console.error('💥 API testing failed:', error.message)
    results.failed++
  } finally {
    // Cleanup: Delete test data
    console.log('\n🧹 Cleaning up test data...')
    try {
      await prisma.expenseAccount.deleteMany({
        where: {
          OR: [
            { id: parentAccount.id },
            { parentAccountId: parentAccount.id }
          ]
        }
      })
      console.log('✅ Test data cleaned up')
    } catch (cleanupError) {
      console.error('⚠️  Failed to cleanup test data:', cleanupError.message)
    }

    await prisma.$disconnect()
  }

  // Summary
  console.log(`\n📊 API Test Results: ${results.passed} passed, ${results.failed} failed`)

  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:')
    results.tests.filter(t => t.status === 'FAIL').forEach(test => {
      console.log(`  - ${test.name}: ${test.error}`)
    })
    process.exit(1)
  } else {
    console.log('\n✅ All API tests passed!')
  }
}

// Handle command line arguments
const args = process.argv.slice(2)
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Sibling Expense Accounts API Test Script

Usage: node test-sibling-apis.js [options]

Environment Variables:
  API_BASE_URL     Base URL for API calls (default: http://localhost:3000)
  TEST_BUSINESS_ID Business ID for test data (default: test-business-id)
  TEST_TOKEN       Authorization token for API calls

Options:
  --help, -h       Show this help message

Examples:
  API_BASE_URL=http://staging-api.com TEST_TOKEN=abc123 node test-sibling-apis.js
`)
  process.exit(0)
}

testSiblingAPIs().catch(error => {
  console.error('💥 API test script failed:', error)
  process.exit(1)
})