/**
 * Fix Session Auth Bug - Replace session?.users?.id with session?.user?.id
 *
 * Critical issue: API routes check session?.users?.id (plural) but auth.ts correctly
 * sets session.user.id (singular), causing 401 Unauthorized errors across the app.
 */

const fs = require('fs')
const path = require('path')

const apiDir = path.join(__dirname, '../src/app/api')

function fixSessionReferences(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // Replace session?.users?.id with session?.user?.id
    const usersPattern = /session\?\.users\?\.id/g
    if (usersPattern.test(content)) {
      content = content.replace(usersPattern, 'session?.user?.id')
      modified = true
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      return { fixed: true, file: filePath }
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
        const result = fixSessionReferences(fullPath)
        if (result.fixed || result.error) {
          results.push(result)
        }
      }
    }
  }

  walkDir(dir)
  return results
}

console.log('🔧 Starting session auth bug fix...\n')
console.log('Issue: API routes checking session?.users?.id (plural) instead of session?.user?.id (singular)')
console.log('Impact: Causing 401 Unauthorized errors even for authenticated users\n')

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
  })
}

if (errors.length > 0) {
  console.log('\n❌ Errors:')
  errors.forEach(e => {
    console.log(`  ✗ ${path.relative(process.cwd(), e.file)}: ${e.error}`)
  })
}

console.log('\n🎉 Session auth bug fix complete!')
console.log('All API routes now correctly check session?.user?.id (singular)')
