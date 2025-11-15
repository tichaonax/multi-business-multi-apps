/**
 * Test Script: Printer Permission Enforcement
 * Tests permission checks for all printer operations (user vs admin)
 *
 * Run: node scripts/test-printer-permissions.js
 */

const {
  canManageNetworkPrinters,
  canUseLabelPrinters,
  canPrintReceipts,
  canPrintInventoryLabels,
  canViewPrintQueue,
  canPrint,
  canAccessPrinterManagement
} = require('../src/lib/permission-utils.ts')

function testPermissions() {
  console.log('🔐 Testing Printer Permission Enforcement\n')
  console.log('=' .repeat(60))

  // Test users with different roles and permissions
  const testUsers = {
    systemAdmin: {
      id: 'admin-001',
      email: 'admin@example.com',
      name: 'System Admin',
      role: 'admin',
      permissions: {}
    },

    businessOwner: {
      id: 'owner-001',
      email: 'owner@example.com',
      name: 'Business Owner',
      role: 'user',
      permissions: {
        canManageNetworkPrinters: true,
        canUseLabelPrinters: true,
        canPrintReceipts: true,
        canPrintInventoryLabels: true,
        canViewPrintQueue: true
      }
    },

    manager: {
      id: 'manager-001',
      email: 'manager@example.com',
      name: 'Manager',
      role: 'user',
      permissions: {
        canUseLabelPrinters: true,
        canPrintReceipts: true,
        canPrintInventoryLabels: true
      }
    },

    employee: {
      id: 'employee-001',
      email: 'employee@example.com',
      name: 'Employee',
      role: 'user',
      permissions: {
        canPrintReceipts: true
      }
    },

    readOnlyUser: {
      id: 'readonly-001',
      email: 'readonly@example.com',
      name: 'Read Only User',
      role: 'user',
      permissions: {}
    },

    nullUser: null,
    undefinedUser: undefined
  }

  // Test cases
  const testCases = [
    {
      name: 'System Admin',
      user: testUsers.systemAdmin,
      expectedPermissions: {
        canManageNetworkPrinters: true,
        canUseLabelPrinters: true,
        canPrintReceipts: true,
        canPrintInventoryLabels: true,
        canViewPrintQueue: true,
        canPrint: true,
        canAccessPrinterManagement: true
      }
    },
    {
      name: 'Business Owner',
      user: testUsers.businessOwner,
      expectedPermissions: {
        canManageNetworkPrinters: true,
        canUseLabelPrinters: true,
        canPrintReceipts: true,
        canPrintInventoryLabels: true,
        canViewPrintQueue: true,
        canPrint: true,
        canAccessPrinterManagement: true
      }
    },
    {
      name: 'Manager',
      user: testUsers.manager,
      expectedPermissions: {
        canManageNetworkPrinters: false,
        canUseLabelPrinters: true,
        canPrintReceipts: true,
        canPrintInventoryLabels: true,
        canViewPrintQueue: false,
        canPrint: true,
        canAccessPrinterManagement: false
      }
    },
    {
      name: 'Employee',
      user: testUsers.employee,
      expectedPermissions: {
        canManageNetworkPrinters: false,
        canUseLabelPrinters: false,
        canPrintReceipts: true,
        canPrintInventoryLabels: false,
        canViewPrintQueue: false,
        canPrint: true,
        canAccessPrinterManagement: false
      }
    },
    {
      name: 'Read-Only User',
      user: testUsers.readOnlyUser,
      expectedPermissions: {
        canManageNetworkPrinters: false,
        canUseLabelPrinters: false,
        canPrintReceipts: false,
        canPrintInventoryLabels: false,
        canViewPrintQueue: false,
        canPrint: false,
        canAccessPrinterManagement: false
      }
    },
    {
      name: 'Null User',
      user: testUsers.nullUser,
      expectedPermissions: {
        canManageNetworkPrinters: false,
        canUseLabelPrinters: false,
        canPrintReceipts: false,
        canPrintInventoryLabels: false,
        canViewPrintQueue: false,
        canPrint: false,
        canAccessPrinterManagement: false
      }
    },
    {
      name: 'Undefined User',
      user: testUsers.undefinedUser,
      expectedPermissions: {
        canManageNetworkPrinters: false,
        canUseLabelPrinters: false,
        canPrintReceipts: false,
        canPrintInventoryLabels: false,
        canViewPrintQueue: false,
        canPrint: false,
        canAccessPrinterManagement: false
      }
    }
  ]

  let allTestsPassed = true
  let totalTests = 0
  let passedTests = 0

  // Run test cases
  testCases.forEach(testCase => {
    console.log(`\nTest: ${testCase.name}`)
    console.log('-'.repeat(60))

    const results = {
      canManageNetworkPrinters: canManageNetworkPrinters(testCase.user),
      canUseLabelPrinters: canUseLabelPrinters(testCase.user),
      canPrintReceipts: canPrintReceipts(testCase.user),
      canPrintInventoryLabels: canPrintInventoryLabels(testCase.user),
      canViewPrintQueue: canViewPrintQueue(testCase.user),
      canPrint: canPrint(testCase.user),
      canAccessPrinterManagement: canAccessPrinterManagement(testCase.user)
    }

    Object.keys(testCase.expectedPermissions).forEach(permission => {
      totalTests++
      const expected = testCase.expectedPermissions[permission]
      const actual = results[permission]
      const passed = expected === actual

      if (passed) {
        passedTests++
        console.log(`  ✓ ${permission}: ${actual} (expected: ${expected})`)
      } else {
        allTestsPassed = false
        console.log(`  ✗ ${permission}: ${actual} (expected: ${expected})`)
      }
    })
  })

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log(`Test Results: ${passedTests}/${totalTests} passed`)

  if (allTestsPassed) {
    console.log('✅ ALL PERMISSION TESTS PASSED!')
  } else {
    console.log(`❌ SOME TESTS FAILED (${totalTests - passedTests} failures)`)
  }

  console.log('='.repeat(60))

  // Additional edge case tests
  console.log('\n\nEdge Case Tests:')
  console.log('='.repeat(60))

  // Test: System admin overrides individual permissions
  console.log('\nTest: System admin overrides all permissions')
  const adminWithNoPermissions = {
    id: 'admin-002',
    role: 'admin',
    permissions: {
      canManageNetworkPrinters: false,
      canPrintReceipts: false
    }
  }
  const adminCanManage = canManageNetworkPrinters(adminWithNoPermissions)
  const adminCanPrint = canPrintReceipts(adminWithNoPermissions)

  if (adminCanManage && adminCanPrint) {
    console.log('  ✓ System admin role overrides permission flags')
  } else {
    console.log('  ✗ System admin should have all permissions regardless of flags')
    allTestsPassed = false
  }

  // Test: User with only some permissions
  console.log('\nTest: Partial permissions')
  const partialUser = {
    id: 'partial-001',
    role: 'user',
    permissions: {
      canPrintReceipts: true,
      canPrintInventoryLabels: false
    }
  }
  const partialCanPrintReceipts = canPrintReceipts(partialUser)
  const partialCanPrintLabels = canPrintInventoryLabels(partialUser)
  const partialCanPrint = canPrint(partialUser)

  if (partialCanPrintReceipts && !partialCanPrintLabels && partialCanPrint) {
    console.log('  ✓ Partial permissions work correctly')
    console.log(`    - canPrintReceipts: true`)
    console.log(`    - canPrintInventoryLabels: false`)
    console.log(`    - canPrint (any): true`)
  } else {
    console.log('  ✗ Partial permissions failed')
    allTestsPassed = false
  }

  // Test: canPrint aggregates all print permissions
  console.log('\nTest: canPrint() aggregates all print-related permissions')
  const scenarios = [
    { user: testUsers.manager, expected: true, reason: 'has canPrintReceipts' },
    { user: testUsers.readOnlyUser, expected: false, reason: 'has no print permissions' },
    {
      user: { id: 'label-only', role: 'user', permissions: { canUseLabelPrinters: true } },
      expected: true,
      reason: 'has canUseLabelPrinters'
    }
  ]

  scenarios.forEach(({ user, expected, reason }) => {
    const result = canPrint(user)
    if (result === expected) {
      console.log(`  ✓ ${reason}: ${result}`)
    } else {
      console.log(`  ✗ ${reason}: got ${result}, expected ${expected}`)
      allTestsPassed = false
    }
  })

  console.log('\n' + '='.repeat(60))
  if (allTestsPassed) {
    console.log('✅ ALL TESTS PASSED!')
    console.log('\nPermission System Summary:')
    console.log('  ✓ System admins have full access')
    console.log('  ✓ User permissions are properly enforced')
    console.log('  ✓ Null/undefined users have no permissions')
    console.log('  ✓ Partial permissions work correctly')
    console.log('  ✓ Aggregate permissions (canPrint) work correctly')
    console.log('  ✓ Admin-only permissions (canManageNetworkPrinters) restricted')
    console.log()
    return true
  } else {
    console.log('❌ SOME TESTS FAILED')
    console.log()
    process.exit(1)
  }
}

// Run tests
testPermissions()
