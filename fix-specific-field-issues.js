#!/usr/bin/env node

/**
 * Targeted Field Name Fixer - Only fixes specific known problematic patterns
 * Does NOT do bidirectional fixes that could revert correct changes
 * 
 * CRITICAL DISTINCTION:
 * - Prisma model names should be camelCase: prisma.vehicleDrivers.findMany()
 * - Field names in includes/selects should be snake_case: { include: { vehicle_drivers: true } }
 */

const fs = require('fs')
const path = require('path')

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

// ONLY patterns that are definitively wrong and need fixing
// These are PascalCase or camelCase that should be snake_case
const WRONG_TO_CORRECT_PATTERNS = [
  // Include/select statements with wrong capitalization
  { wrong: /\bProductVariants\b/g, correct: 'product_variants', type: 'include/select' },
  { wrong: /\bProjectTransactions\b/g, correct: 'project_transactions', type: 'include/select' },
  { wrong: /\bBusinessMemberships\b/g, correct: 'business_memberships', type: 'include/select' },
  { wrong: /\bPayrollEntries\b/g, correct: 'payroll_entries', type: 'include/select' },
  { wrong: /\bPayrollPeriods\b/g, correct: 'payroll_periods', type: 'include/select' },
  { wrong: /\bVehicleTrips\b/g, correct: 'vehicle_trips', type: 'include/select' },
  { wrong: /\bVehicleExpenses\b/g, correct: 'vehicle_expenses', type: 'include/select' },
  { wrong: /\bBenefitTypes\b/g, correct: 'benefit_types', type: 'include/select' },
  { wrong: /\bLoanTransactions\b/g, correct: 'loan_transactions', type: 'include/select' },
  
  // PRISMA MODEL NAME FIXES (these should be camelCase)
  { wrong: /prisma\.vehicle_drivers\./g, correct: 'prisma.vehicleDrivers.', type: 'prisma-model' },
  { wrong: /prisma\.business_brands\./g, correct: 'prisma.businessBrands.', type: 'prisma-model' },
  { wrong: /prisma\.business_memberships\./g, correct: 'prisma.businessMemberships.', type: 'prisma-model' },
  { wrong: /prisma\.payroll_entries\./g, correct: 'prisma.payrollEntries.', type: 'prisma-model' },
  { wrong: /prisma\.project_transactions\./g, correct: 'prisma.projectTransactions.', type: 'prisma-model' },
  { wrong: /prisma\.product_variants\./g, correct: 'prisma.productVariants.', type: 'prisma-model' },
  { wrong: /prisma\.vehicle_trips\./g, correct: 'prisma.vehicleTrips.', type: 'prisma-model' },
  { wrong: /prisma\.menu_combo_items\./g, correct: 'prisma.menuComboItems.', type: 'prisma-model' },
  
  // TRANSACTION MODEL NAME FIXES (tx. should also be camelCase)
  { wrong: /tx\.business_memberships\./g, correct: 'tx.businessMemberships.', type: 'tx-model' },
  { wrong: /tx\.vehicle_drivers\./g, correct: 'tx.vehicleDrivers.', type: 'tx-model' },
  { wrong: /tx\.payroll_entries\./g, correct: 'tx.payrollEntries.', type: 'tx-model' },
  { wrong: /tx\.project_transactions\./g, correct: 'tx.projectTransactions.', type: 'tx-model' },
  { wrong: /tx\.product_variants\./g, correct: 'tx.productVariants.', type: 'tx-model' },
  { wrong: /tx\.vehicle_trips\./g, correct: 'tx.vehicleTrips.', type: 'tx-model' },
  
  // Object access patterns that are definitively wrong
  { wrong: /\.vehicleDrivers\b/g, correct: '.vehicle_drivers', type: 'access' },
  { wrong: /\.businessMemberships\b/g, correct: '.business_memberships', type: 'access' },
  { wrong: /\.projectTransactions\b/g, correct: '.project_transactions', type: 'access' },
  { wrong: /\.payrollEntries\b/g, correct: '.payroll_entries', type: 'access' },
  { wrong: /\.productVariants\b/g, correct: '.product_variants', type: 'access' }
]

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

function fixFileFieldNames(filePath) {
  const relativePath = path.relative(ROOT_DIR, filePath)
  let content = fs.readFileSync(filePath, 'utf8')
  let changes = []
  let modified = false
  
  for (const pattern of WRONG_TO_CORRECT_PATTERNS) {
    if (pattern.wrong.test(content)) {
      content = content.replace(pattern.wrong, pattern.correct)
      changes.push(`${pattern.type}: ${pattern.wrong.source.replace(/\\b/g, '')} → ${pattern.correct}`)
      modified = true
    }
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8')
    log(`✅ Fixed ${relativePath}:`, 'SUCCESS')
    changes.forEach(change => log(`   ${change}`, 'INFO'))
  }
  
  return changes.length
}

async function main() {
  try {
    log('\n🎯 Targeted Field Name Fixer', 'HEADER')
    log('============================\n', 'HEADER')
    
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
      log('\n🎯 Specific field name issues have been fixed!', 'SUCCESS')
      log('This script only fixes definitively wrong patterns and won\'t revert correct fixes.', 'INFO')
    } else {
      log('\n✅ No issues found - all field names appear to be correct!', 'SUCCESS')
    }
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'ERROR')
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}