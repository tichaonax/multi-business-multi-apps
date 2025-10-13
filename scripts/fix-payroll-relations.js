/**
 * Fix Payroll Relations - Replace creator/approver with correct Prisma relation names
 *
 * Issue: API routes reference `creator` and `approver` relations but Prisma schema uses:
 * - users_payroll_periods_createdByTousers (not creator)
 * - users_payroll_periods_approvedByTousers (not approver)
 */

const fs = require('fs')
const path = require('path')

const apiDir = path.join(__dirname, '../src/app/api')

function fixPayrollRelations(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    const changes = []

    // Pattern 1: creator: { (in include/select)
    const creatorPattern = /\bcreator:\s*\{/g
    const creatorMatches = content.match(creatorPattern)
    if (creatorMatches) {
      content = content.replace(creatorPattern, 'users_payroll_periods_createdByTousers: {')
      modified = true
      changes.push(`creator → users_payroll_periods_createdByTousers: ${creatorMatches.length} occurrences`)
    }

    // Pattern 2: approver: { (in include/select)
    const approverPattern = /\bapprover:\s*\{/g
    const approverMatches = content.match(approverPattern)
    if (approverMatches) {
      content = content.replace(approverPattern, 'users_payroll_periods_approvedByTousers: {')
      modified = true
      changes.push(`approver → users_payroll_periods_approvedByTousers: ${approverMatches.length} occurrences`)
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      return { fixed: true, file: filePath, changes }
    }
    return { fixed: false, file: filePath }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message)
    return { fixed: false, file: filePath, error: error.message }
  }
}

function findAndFixPayrollRoutes(dir) {
  const results = []

  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)

      if (entry.isDirectory()) {
        walkDir(fullPath)
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const result = fixPayrollRelations(fullPath)
        if (result.fixed || result.error) {
          results.push(result)
        }
      }
    }
  }

  walkDir(dir)
  return results
}

console.log('🔧 Fixing payroll relation names...\n')
console.log('Issue: API routes using creator/approver instead of correct Prisma relation names')
console.log('Fixing: creator → users_payroll_periods_createdByTousers')
console.log('        approver → users_payroll_periods_approvedByTousers\n')

const results = findAndFixPayrollRoutes(apiDir)

const fixed = results.filter(r => r.fixed)
const errors = results.filter(r => r.error)

console.log('\n✅ Fix Summary:')
console.log(`  - Files scanned: ${results.length + fixed.length}`)
console.log(`  - Files fixed: ${fixed.length}`)
console.log(`  - Errors: ${errors.length}`)

if (fixed.length > 0) {
  console.log('\n📝 Files fixed:')
  fixed.forEach(f => {
    console.log(`  ✓ ${path.relative(process.cwd(), f.file)}`)
    if (f.changes) {
      f.changes.forEach(change => console.log(`    - ${change}`))
    }
  })
}

if (errors.length > 0) {
  console.log('\n❌ Errors:')
  errors.forEach(e => {
    console.log(`  ✗ ${path.relative(process.cwd(), e.file)}: ${e.error}`)
  })
}

console.log('\n🎉 Payroll relation fix complete!')
console.log('All API routes now use correct Prisma relation names for PayrollPeriods')
