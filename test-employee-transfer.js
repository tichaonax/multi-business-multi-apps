/**
 * Employee Transfer Flow - Integration Test Script
 * 
 * This script tests the complete employee transfer flow:
 * 1. Fetch transferable employees
 * 2. Get compatible target businesses
 * 3. Preview transfer
 * 4. Execute transfer
 * 5. Verify results
 * 
 * Usage: node test-employee-transfer.js <sourceBusinessId> <targetBusinessId>
 */

const sourceBusinessId = process.argv[2]
const targetBusinessId = process.argv[3]

if (!sourceBusinessId || !targetBusinessId) {
  console.error('Usage: node test-employee-transfer.js <sourceBusinessId> <targetBusinessId>')
  process.exit(1)
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

async function testEmployeeTransfer() {
  console.log('🧪 Employee Transfer Integration Test\n')
  console.log(`Source Business ID: ${sourceBusinessId}`)
  console.log(`Target Business ID: ${targetBusinessId}\n`)

  try {
    // Step 1: Fetch transferable employees
    console.log('📋 Step 1: Fetching transferable employees...')
    const employeesRes = await fetch(`${BASE_URL}/api/admin/businesses/${sourceBusinessId}/transferable-employees`, {
      headers: {
        'Cookie': process.env.TEST_COOKIE || ''
      }
    })
    
    if (!employeesRes.ok) {
      throw new Error(`Failed to fetch employees: ${employeesRes.status} ${await employeesRes.text()}`)
    }
    
    const employeesData = await employeesRes.json()
    console.log(`✅ Found ${employeesData.count} transferable employees`)
    
    if (employeesData.count === 0) {
      console.log('⚠️  No employees to transfer. Test complete.')
      return
    }
    
    const employeeIds = employeesData.employees.map(emp => emp.id)
    console.log(`   Employee IDs: ${employeeIds.join(', ')}\n`)

    // Step 2: Get compatible target businesses
    console.log('🏢 Step 2: Fetching compatible target businesses...')
    const businessesRes = await fetch(`${BASE_URL}/api/admin/businesses/${sourceBusinessId}/compatible-targets`, {
      headers: {
        'Cookie': process.env.TEST_COOKIE || ''
      }
    })
    
    if (!businessesRes.ok) {
      throw new Error(`Failed to fetch businesses: ${businessesRes.status} ${await businessesRes.text()}`)
    }
    
    const businessesData = await businessesRes.json()
    console.log(`✅ Found ${businessesData.count} compatible businesses`)
    
    const targetExists = businessesData.businesses.some(b => b.id === targetBusinessId)
    if (!targetExists) {
      throw new Error(`Target business ${targetBusinessId} not in compatible list`)
    }
    console.log(`✅ Target business ${targetBusinessId} is compatible\n`)

    // Step 3: Preview transfer
    console.log('🔍 Step 3: Previewing transfer...')
    const previewRes = await fetch(`${BASE_URL}/api/admin/businesses/${sourceBusinessId}/transfer-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.TEST_COOKIE || ''
      },
      body: JSON.stringify({
        targetBusinessId,
        employeeIds
      })
    })
    
    if (!previewRes.ok) {
      throw new Error(`Preview failed: ${previewRes.status} ${await previewRes.text()}`)
    }
    
    const previewData = await previewRes.json()
    console.log('✅ Preview validation:')
    console.log(`   Valid: ${previewData.validation.isValid}`)
    console.log(`   Valid employees: ${previewData.validation.validEmployeeIds.length}`)
    
    if (previewData.validation.errors.length > 0) {
      console.log(`   ❌ Errors: ${previewData.validation.errors.join(', ')}`)
    }
    
    if (previewData.validation.warnings.length > 0) {
      console.log(`   ⚠️  Warnings: ${previewData.validation.warnings.join(', ')}`)
    }
    
    if (!previewData.validation.isValid) {
      throw new Error('Transfer validation failed')
    }
    console.log('')

    // Step 4: Execute transfer (only if TEST_EXECUTE=true)
    if (process.env.TEST_EXECUTE !== 'true') {
      console.log('⏸️  Skipping execution (set TEST_EXECUTE=true to execute)')
      console.log('✅ All validation checks passed!\n')
      return
    }

    console.log('⚡ Step 4: Executing transfer...')
    const transferRes = await fetch(`${BASE_URL}/api/admin/businesses/${sourceBusinessId}/transfer-employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': process.env.TEST_COOKIE || ''
      },
      body: JSON.stringify({
        targetBusinessId,
        employeeIds: previewData.validation.validEmployeeIds
      })
    })
    
    if (!transferRes.ok) {
      throw new Error(`Transfer failed: ${transferRes.status} ${await transferRes.text()}`)
    }
    
    const transferData = await transferRes.json()
    console.log('✅ Transfer completed successfully!')
    console.log(`   Employees transferred: ${transferData.data.transferredCount}`)
    console.log(`   Contract renewals created: ${transferData.data.contractRenewalsCreated}`)
    console.log(`   Business assignments updated: ${transferData.data.businessAssignmentsUpdated}`)
    console.log(`   Audit log ID: ${transferData.data.auditLogId}\n`)

    // Step 5: Verify results
    console.log('✔️  Step 5: Verifying results...')
    const verifyRes = await fetch(`${BASE_URL}/api/admin/businesses/${sourceBusinessId}/transferable-employees`, {
      headers: {
        'Cookie': process.env.TEST_COOKIE || ''
      }
    })
    
    if (!verifyRes.ok) {
      console.log('⚠️  Could not verify results')
    } else {
      const verifyData = await verifyRes.json()
      console.log(`✅ Remaining transferable employees: ${verifyData.count}`)
      if (verifyData.count === 0) {
        console.log('✅ All employees successfully transferred!\n')
      }
    }

    console.log('🎉 Integration test completed successfully!\n')
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }
}

// Run the test
testEmployeeTransfer()
