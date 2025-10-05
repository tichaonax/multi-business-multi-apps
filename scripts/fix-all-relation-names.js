/**
 * Fix All Relation Names in Schema
 *
 * Convert all snake_case relation names to camelCase
 * This affects relation field names, NOT table names or column names
 */

const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma')
let schema = fs.readFileSync(schemaPath, 'utf8')

// Function to convert snake_case to camelCase
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())
}

// Map of snake_case relation names to camelCase
// These are the ones that appear as standalone relation fields (not part of @relation())
const relationMappings = {
  'business_orders': 'businessOrders',
  'business_stock_movements': 'businessStockMovements',
  'contract_renewals': 'contractRenewals',
  'employee_attendance': 'employeeAttendance',
  'employee_benefits': 'employeeBenefits',
  'employee_business_assignments': 'employeeBusinessAssignments',
  'employee_deduction_payments': 'employeeDeductionPayments',
  'employee_leave_balance': 'employeeLeaveBalance',
  'employee_loan_payments': 'employeeLoanPayments',
  'employee_time_tracking': 'employeeTimeTracking',
}

// Process each relation mapping
for (const [snakeCase, camelCase] of Object.entries(relationMappings)) {
  // Match lines like: "  business_orders     BusinessOrder[]"
  // and replace with:  "  businessOrders      BusinessOrder[]"
  const regex = new RegExp(`(\\s+)${snakeCase}(\\s+)`, 'g')
  schema = schema.replace(regex, `$1${camelCase}$2`)
}

// Write the corrected schema
fs.writeFileSync(schemaPath, schema, 'utf8')

console.log('✅ All relation names fixed!')
console.log('   - Converted snake_case relations to camelCase')
console.log('   - Fixed relations:', Object.keys(relationMappings).length)
