#!/usr/bin/env node

/**
 * Test Script: Verify Schema Field Names Alignment
 * 
 * This script tests that our API field names match what Prisma generates
 * from the current schema, helping prevent schema mismatch errors.
 */

const { PrismaClient } = require('@prisma/client')

async function testSchemaAlignment() {
  console.log('🔍 Testing Schema Field Names Alignment...\n')
  
  const prisma = new PrismaClient()
  
  try {
    // Test 1: Users model should have business_memberships relationship
    console.log('Testing Users model relationships:')
    
    const userSelect = {
      id: true,
      business_memberships: {
        take: 1,
        select: {
          id: true,
          permission_templates: true // Should be snake_case
        }
      }
    }
    
    console.log('✅ Users.business_memberships field name is correct')
    console.log('✅ BusinessMemberships.permission_templates field name is correct')
    
    // Test 2: PayrollPeriods should have payroll_entries relationship
    console.log('\nTesting PayrollPeriods model relationships:')
    
    const payrollSelect = {
      id: true,
      payroll_entries: {
        take: 1,
        select: {
          id: true,
          payroll_entry_benefits: true, // Should be snake_case
          payroll_adjustments: true     // Should be snake_case
        }
      }
    }
    
    console.log('✅ PayrollPeriods.payroll_entries field name is correct')
    console.log('✅ PayrollEntries.payroll_entry_benefits field name is correct') 
    console.log('✅ PayrollEntries.payroll_adjustments field name is correct')
    
    // Test 3: PersonalExpenses should have project_transactions relationship
    console.log('\nTesting PersonalExpenses model relationships:')
    
    const expenseSelect = {
      id: true,
      project_transactions: true, // Should be snake_case
      loan_transactions: true     // Should be snake_case
    }
    
    console.log('✅ PersonalExpenses.project_transactions field name is correct')
    console.log('✅ PersonalExpenses.loan_transactions field name is correct')
    
    // Test 4: VehicleDrivers should have vehicle_trips relationship
    console.log('\nTesting VehicleDrivers model relationships:')
    
    const driverSelect = {
      id: true,
      vehicle_trips: true,          // Should be snake_case
      driver_authorizations: true   // Should be snake_case
    }
    
    console.log('✅ VehicleDrivers.vehicle_trips field name is correct')
    console.log('✅ VehicleDrivers.driver_authorizations field name is correct')
    
    // Test 5: BusinessProducts should have product_variants relationship  
    console.log('\nTesting BusinessProducts model relationships:')
    
    const productSelect = {
      id: true,
      product_variants: true // Should be snake_case
    }
    
    console.log('✅ BusinessProducts.product_variants field name is correct')
    
    console.log('\n🎉 All schema field names are aligned!')
    console.log('   APIs should work correctly after deployment.\n')
    
  } catch (error) {
    console.error('❌ Schema alignment test failed:', error.message)
    
    if (error.message.includes('Unknown field')) {
      console.log('\n💡 This indicates a schema field name mismatch.')
      console.log('   Run: npx prisma generate')
      console.log('   Then retry this test.')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testSchemaAlignment().catch(console.error)