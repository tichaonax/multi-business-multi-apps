const fs = require('fs')
const path = require('path')

// Target files with remaining .business_memberships. issues
const targetFiles = [
  'src/app/api/admin/users/[userId]/route.ts',
  'src/app/api/dashboard/stats/route.ts',
  'src/app/api/backup/route.ts',
  'src/app/api/users/[userId]/revoke-account/route.ts',
  'src/app/api/users/[userId]/link-employee/route.ts',
  'src/app/api/personal/loans/route.ts',
  'src/app/api/employees/[employeeId]/status/route.ts',
  'src/app/api/employees/[employeeId]/route.ts',
  'src/app/api/employees/[employeeId]/create-user/route.ts',
  'src/app/api/employees/[employeeId]/contracts/[contractId]/route.ts'
]

// Replace patterns for remaining instances
const replacements = [
  // Prisma model names (direct calls)
  { pattern: /prisma\.business_memberships\./g, replacement: 'prisma.businessMemberships.' },
  // Transaction model names  
  { pattern: /tx\.business_memberships\./g, replacement: 'tx.businessMemberships.' },
]

console.log('🔧 Fixing remaining business_memberships instances...\n')

let totalChanges = 0
let filesModified = 0

targetFiles.forEach(relativePath => {
  const filePath = path.resolve(relativePath)
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️ File not found: ${relativePath}`)
    return
  }
  
  let content = fs.readFileSync(filePath, 'utf8')
  let originalContent = content
  let fileChanges = 0
  
  replacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern)
    if (matches) {
      content = content.replace(pattern, replacement)
      fileChanges += matches.length
    }
  })
  
  if (fileChanges > 0) {
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✅ Fixed ${relativePath}: ${fileChanges} changes`)
    filesModified++
    totalChanges += fileChanges
  } else {
    console.log(`✨ ${relativePath}: Already clean`)
  }
})

console.log(`\n📊 Summary:`)
console.log(`Files modified: ${filesModified}`)  
console.log(`Total changes: ${totalChanges}`)
console.log('🎯 Remaining model name fixes complete!')