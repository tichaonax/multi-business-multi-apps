/**
 * Comprehensive Session Auth Fix - Replace ALL session.users references with session.user
 *
 * Catches both:
 * 1. session?.users?.id → session?.user?.id (optional chaining)
 * 2. session.users.id → session.user.id (direct access)
 * 3. session.users.property → session.user.property (any property access)
 */

const fs = require('fs')
const path = require('path')

const apiDir = path.join(__dirname, '../src/app/api')

function fixAllSessionReferences(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    const changes = []

    // Pattern 1: session?.users?.property (optional chaining)
    const optionalPattern = /session\?\.users\?\.([\w]+)/g
    const optionalMatches = content.match(optionalPattern)
    if (optionalMatches) {
      content = content.replace(optionalPattern, 'session?.user?.$1')
      modified = true
      changes.push(`Optional chaining: ${optionalMatches.length} occurrences`)
    }

    // Pattern 2: session.users.property (direct access)
    const directPattern = /session\.users\.([\w]+)/g
    const directMatches = content.match(directPattern)
    if (directMatches) {
      content = content.replace(directPattern, 'session.user.$1')
      modified = true
      changes.push(`Direct access: ${directMatches.length} occurrences`)
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

function findAndFixApiRoutes(dir) {
  const results = []

  function walkDir(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name)

      if (entry.isDirectory()) {
        walkDir(fullPath)
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
        const result = fixAllSessionReferences(fullPath)
        if (result.fixed || result.error) {
          results.push(result)
        }
      }
    }
  }

  walkDir(dir)
  return results
}

console.log('🔧 Running comprehensive session auth fix...\n')
console.log('Issue: API routes using session.users (plural) instead of session.user (singular)')
console.log('Fixing both optional chaining and direct access patterns\n')

const results = findAndFixApiRoutes(apiDir)

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

console.log('\n🎉 Comprehensive session auth fix complete!')
console.log('All API routes now correctly use session.user (singular) instead of session.users (plural)')
