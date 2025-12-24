/**
 * Script to fix number inputs that prevent blanking fields
 * Fixes: parseInt(e.target.value) || 0 -> e.target.value === '' ? 0 : parseInt(e.target.value)
 */

const fs = require('fs')
const path = require('path')

const files = [
  'src/app/business/manage/loans/page.tsx',
  'src/app/clothing/inventory/components/size-color-matrix.tsx',
  'src/app/clothing/products/components/variant-manager.tsx',
  'src/app/expense-accounts/new/page.tsx',
  'src/app/grocery/inventory/receive/page.tsx',
  'src/app/grocery/pos/page.tsx',
  'src/app/payroll/account/payments/page.tsx',
  'src/app/restaurant/inventory/receive/page.tsx',
  'src/app/restaurant/reports/end-of-day/page.tsx',
  'src/app/services/add/page.tsx',
  'src/app/wifi-portal/token-configs/page.tsx',
  'src/components/construction/project-detail-modal.tsx',
  'src/components/construction/transaction-detail-modal.tsx',
  'src/components/driver/expense-input.tsx',
  'src/components/driver/maintenance-service-expense-input.tsx',
  'src/components/driver/maintenance-service-input.tsx',
  'src/components/expense-account/create-account-modal.tsx',
  'src/components/expense-account/create-sibling-modal.tsx',
  'src/components/laybys/layby-form.tsx',
  'src/components/laybys/payment-form.tsx',
  'src/components/payroll/batch-payment-modal.tsx',
  'src/components/payroll/employee-payment-row.tsx',
  'src/components/payroll/payroll-entry-detail-modal.tsx',
  'src/components/payroll/payroll-entry-form.tsx',
  'src/components/restaurant/combo-builder.tsx',
  'src/components/restaurant/menu-item-form.tsx',
  'src/components/restaurant/promotion-manager.tsx',
  'src/components/universal/inventory/universal-inventory-stats.tsx',
  'src/components/universal/inventory/universal-stock-movements.tsx',
  'src/components/universal/pos-system.tsx',
  'src/components/universal/supplier/universal-supplier-form.tsx'
]

let totalFixed = 0
let fileErrors = []

files.forEach((filePath) => {
  const fullPath = path.join(__dirname, '..', filePath)

  try {
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️  File not found: ${filePath}`)
      fileErrors.push({ file: filePath, error: 'File not found' })
      return
    }

    let content = fs.readFileSync(fullPath, 'utf8')
    let modified = false
    let fixCount = 0

    // Fix pattern 1: parseInt(e.target.value) || 0
    const intPattern = /parseInt\(e\.target\.value\)\s*\|\|\s*0/g
    const intMatches = content.match(intPattern)
    if (intMatches) {
      content = content.replace(intPattern, "e.target.value === '' ? 0 : parseInt(e.target.value)")
      fixCount += intMatches.length
      modified = true
    }

    // Fix pattern 2: parseFloat(e.target.value) || 0
    const floatPattern = /parseFloat\(e\.target\.value\)\s*\|\|\s*0/g
    const floatMatches = content.match(floatPattern)
    if (floatMatches) {
      content = content.replace(floatPattern, "e.target.value === '' ? 0 : parseFloat(e.target.value)")
      fixCount += floatMatches.length
      modified = true
    }

    if (modified) {
      fs.writeFileSync(fullPath, content, 'utf8')
      console.log(`✅ Fixed ${fixCount} inputs in ${filePath}`)
      totalFixed += fixCount
    } else {
      console.log(`⏭️  No issues found in ${filePath}`)
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message)
    fileErrors.push({ file: filePath, error: error.message })
  }
})

console.log('\n' + '='.repeat(60))
console.log(`✨ Fixed ${totalFixed} number inputs across ${files.length} files`)

if (fileErrors.length > 0) {
  console.log(`\n⚠️  ${fileErrors.length} files had errors:`)
  fileErrors.forEach(({ file, error }) => {
    console.log(`   - ${file}: ${error}`)
  })
}

console.log('='.repeat(60))
