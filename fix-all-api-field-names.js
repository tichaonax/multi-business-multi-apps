#!/usr/bin/env node

/**
 * Comprehensive API Field Name Fixer
 * 
 * Scans all API routes and fixes field name mismatches between API expectations (camelCase)
 * and Prisma schema field names (snake_case)
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const ROOT_DIR = __dirname
const API_DIR = path.join(ROOT_DIR, 'src', 'app', 'api')

function log(message, type = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m', // Green
    WARN: '\x1b[33m',    // Yellow
    ERROR: '\x1b[31m',   // Red
    HEADER: '\x1b[35m'   // Magenta
  }
  const reset = '\x1b[0m'
  console.log(`${colors[type]}${message}${reset}`)
}

// Field name mappings from camelCase (API expectation) to snake_case (Prisma schema)
const FIELD_MAPPINGS = {
  // Include field patterns
  'businessBrand': 'business_brands',
  'businessCategory': 'business_categories', 
  'businessCategories': 'business_categories',
  'businessMembership': 'business_memberships',
  'businessMemberships': 'business_memberships',
  'payrollEntry': 'payroll_entries',
  'payrollEntries': 'payroll_entries',
  'payrollPeriod': 'payroll_periods',
  'payrollPeriods': 'payroll_periods',
  'payrollEntryBenefit': 'payroll_entry_benefits',
  'payrollEntryBenefits': 'payroll_entry_benefits',
  'vehicleTrip': 'vehicle_trips',
  'vehicleTrips': 'vehicle_trips',
  'vehicleExpense': 'vehicle_expenses',
  'vehicleExpenses': 'vehicle_expenses',
  'productVariant': 'product_variants',
  'productVariants': 'product_variants',
  'productImage': 'product_images',
  'productImages': 'product_images',
  'productAttribute': 'product_attributes',
  'productAttributes': 'product_attributes',
  'benefitType': 'benefit_types',
  'benefitTypes': 'benefit_types',
  'projectTransaction': 'project_transactions',
  'projectTransactions': 'project_transactions',
  'loanTransaction': 'loan_transactions',
  'loanTransactions': 'loan_transactions',
  'menuComboItems': 'menu_combo_items',
  'businessProducts': 'business_products',
  'projectContractors': 'project_contractors',
  'idFormatTemplates': 'id_format_templates',
  'driverLicenseTemplates': 'driver_license_templates',
  
  // Model name patterns (for queries) - snake_case to PascalCase
  'project_transactions': 'ProjectTransactions',
  'loan_transactions': 'LoanTransactions',
  'business_memberships': 'BusinessMemberships',
  'payroll_entries': 'PayrollEntries',
  'payroll_periods': 'PayrollPeriods', 
  'payroll_entry_benefits': 'PayrollEntryBenefits',
  'vehicle_trips': 'VehicleTrips',
  'vehicle_expenses': 'VehicleExpenses',
  'product_variants': 'ProductVariants',
  'product_images': 'ProductImages',
  'product_attributes': 'ProductAttributes',
  'benefit_types': 'BenefitTypes'
}

// Access patterns - these need to be fixed in dot notation and delete statements
const ACCESS_MAPPINGS = {
  '.businessBrand': '.business_brands',
  '.businessCategory': '.business_categories',
  '.businessMemberships': '.business_memberships', 
  '.payrollEntry': '.payroll_entries',
  '.payrollEntries': '.payroll_entries',
  '.payrollPeriod': '.payroll_periods',
  '.payrollPeriods': '.payroll_periods',
  '.payrollEntryBenefits': '.payroll_entry_benefits',
  '.vehicleTrip': '.vehicle_trips',
  '.vehicleTrips': '.vehicle_trips',
  '.vehicleExpenses': '.vehicle_expenses',
  '.productVariant': '.product_variants',
  '.productVariants': '.product_variants',
  '.productImage': '.product_images', 
  '.productImages': '.product_images',
  '.productAttributes': '.product_attributes',
  '.benefitTypes': '.benefit_types',
  '.projectTransactions': '.project_transactions',
  '.loanTransactions': '.loan_transactions'
}

/**
 * Find all TypeScript files in API directory
 */
function findApiFiles() {
  const files = []
  
  function scanDir(dir) {
    const items = fs.readdirSync(dir)
    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      
      if (stat.isDirectory()) {
        scanDir(fullPath)
      } else if (item.endsWith('.ts') || item.endsWith('.js')) {
        files.push(fullPath)
      }
    }
  }
  
  scanDir(API_DIR)
  return files
}

/**
 * Fix field names in a single file
 */
function fixFileFieldNames(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath)
  let content = fs.readFileSync(filePath, 'utf8')
  let changes = []
  
  // Fix include statements - ONLY convert camelCase/PascalCase TO snake_case (not the reverse)
  for (const [camelCase, snakeCase] of Object.entries(FIELD_MAPPINGS)) {
    // Skip if the snake_case version is already present to avoid reverting correct fixes
    if (content.includes(snakeCase + ':') || content.includes(snakeCase + ' ')) {
      continue
    }
    
    // Include field patterns: include: { fieldName: ...
    const includeRegex = new RegExp(`(include:\\s*{[^}]*?)\\b${camelCase}\\b`, 'g')
    if (includeRegex.test(content)) {
      content = content.replace(includeRegex, `$1${snakeCase}`)
      changes.push(`include: ${camelCase} → ${snakeCase}`)
    }
    
    // Select field patterns: select: { fieldName: ...
    const selectRegex = new RegExp(`(select:\\s*{[^}]*?)\\b${camelCase}\\b`, 'g')
    if (selectRegex.test(content)) {
      content = content.replace(selectRegex, `$1${snakeCase}`)
      changes.push(`select: ${camelCase} → ${snakeCase}`)
    }
    
    // Also check for capitalized field names (e.g., ProductVariants)
    const capitalizedField = camelCase.replace(/^[a-z]/, match => match.toUpperCase())
    const capitalizedIncludeRegex = new RegExp(`(include:\\s*{[^}]*?)\\b${capitalizedField}\\b`, 'g')
    if (capitalizedIncludeRegex.test(content)) {
      content = content.replace(capitalizedIncludeRegex, `$1${snakeCase}`)
      changes.push(`include: ${capitalizedField} → ${snakeCase}`)
    }
    
    // Also check for capitalized select patterns
    const capitalizedSelectRegex = new RegExp(`(select:\\s*{[^}]*?)\\b${capitalizedField}\\b`, 'g')
    if (capitalizedSelectRegex.test(content)) {
      content = content.replace(capitalizedSelectRegex, `$1${snakeCase}`)
      changes.push(`select: ${capitalizedField} → ${snakeCase}`)
    }
  }
  
  // Fix dot notation access patterns
  for (const [camelAccess, snakeAccess] of Object.entries(ACCESS_MAPPINGS)) {
    // Skip if snake_case version already exists to avoid reverting fixes
    if (content.includes(snakeAccess)) {
      continue
    }
    
    const accessRegex = new RegExp(`\\${camelAccess}\\b`, 'g')
    if (accessRegex.test(content)) {
      content = content.replace(accessRegex, snakeAccess)
      changes.push(`access: ${camelAccess} → ${snakeAccess}`)
    }
  }
  
  // Also fix camelCase field access in object destructuring/access patterns
  const additionalAccessPatterns = {
    'vehicleDrivers': 'vehicle_drivers',
    'vehicleExpenses': 'vehicle_expenses',
    'businessMemberships': 'business_memberships',
    'projectTransactions': 'project_transactions',
    'payrollEntries': 'payroll_entries',
    'productVariants': 'product_variants'
  }
  
  for (const [camelField, snakeField] of Object.entries(additionalAccessPatterns)) {
    // Match patterns like trip.vehicleDrivers, person.businessMemberships, etc.
    const fieldAccessRegex = new RegExp(`(\\w+\\.)${camelField}\\b`, 'g')
    if (fieldAccessRegex.test(content)) {
      content = content.replace(fieldAccessRegex, `$1${snakeField}`)
      changes.push(`access: .${camelField} → .${snakeField}`)
    }
  }
  
  // Fix delete statements
  for (const [camelCase, snakeCase] of Object.entries(FIELD_MAPPINGS)) {
    const deleteRegex = new RegExp(`delete\\s+([\\w\\.]+)\\.${camelCase}\\b`, 'g')
    if (deleteRegex.test(content)) {
      content = content.replace(deleteRegex, `delete $1.${snakeCase}`)
      changes.push(`delete: ${camelCase} → ${snakeCase}`)
    }
  }
  
  // Fix prisma model names (snake_case to camelCase)
  const PRISMA_MODEL_FIXES = {
    'prisma.project_transactions': 'prisma.projectTransactions',
    'prisma.loan_transactions': 'prisma.loanTransactions',
    'prisma.business_memberships': 'prisma.businessMemberships',
    'prisma.payroll_entries': 'prisma.payrollEntries',
    'prisma.payroll_periods': 'prisma.payrollPeriods',
    'prisma.payroll_entry_benefits': 'prisma.payrollEntryBenefits',
    'prisma.vehicle_trips': 'prisma.vehicleTrips',
    'prisma.vehicle_expenses': 'prisma.vehicleExpenses',
    'prisma.product_variants': 'prisma.productVariants',
    'prisma.product_images': 'prisma.productImages',
    'prisma.product_attributes': 'prisma.productAttributes',
    'prisma.benefit_types': 'prisma.benefitTypes'
  }
  
  for (const [snakeModel, camelModel] of Object.entries(PRISMA_MODEL_FIXES)) {
    const modelRegex = new RegExp(`\\b${snakeModel.replace('.', '\\.')}\\b`, 'g')
    if (modelRegex.test(content)) {
      content = content.replace(modelRegex, camelModel)
      changes.push(`model: ${snakeModel} → ${camelModel}`)
    }
  }
  
  // Write back if changes were made
  if (changes.length > 0) {
    fs.writeFileSync(filePath, content, 'utf8')
    log(`✅ Fixed ${relativePath}:`, 'SUCCESS')
    changes.forEach(change => log(`   ${change}`, 'INFO'))
  }
  
  return changes.length
}

/**
 * Main execution
 */
async function main() {
  try {
    log('\n🔧 Comprehensive API Field Name Fixer', 'HEADER')
    log('=====================================\n', 'HEADER')
    
    log('Finding API files...', 'INFO')
    const apiFiles = findApiFiles()
    log(`Found ${apiFiles.length} API files to check\n`, 'INFO')
    
    let totalFiles = 0
    let totalChanges = 0
    
    for (const file of apiFiles) {
      const changes = fixFileFieldNames(file)
      if (changes > 0) {
        totalFiles++
        totalChanges += changes
      }
    }
    
    log(`\n📊 Summary:`, 'HEADER')
    log(`Files modified: ${totalFiles}`, 'SUCCESS')
    log(`Total changes: ${totalChanges}`, 'SUCCESS')
    
    if (totalChanges > 0) {
      log('\n🎯 All field name mismatches have been fixed!', 'SUCCESS')
      log('You can now test the APIs - they should work without schema errors.', 'INFO')
    } else {
      log('\n✨ No field name issues found - all APIs are already aligned!', 'SUCCESS')
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'ERROR')
    process.exit(1)
  }
}

main()