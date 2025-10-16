const fs = require('fs')
const path = require('path')

// More comprehensive list of remaining files  
const targetFiles = [
  'src/app/api/admin/users/[userId]/business-permissions/route.ts',
  'src/app/api/admin/users/create-multi-business/route.ts', 
  'src/app/api/admin/seed-test-data/route.ts',
  'src/app/api/admin/seed-business-by-id/route.ts',
  'src/app/api/admin/reset-data/route.ts',
  'src/app/api/admin/businesses/route.ts',
  'src/app/api/auth/register/route.ts',
  'src/app/api/business/available-borrowers/route.ts',
  'src/app/api/business/balance/[businessId]/route.ts',
  'src/app/api/business/loans/analytics/route.ts',
  'src/app/api/business/loans/route.ts',
  'src/app/api/business/loans/[loanId]/transactions/route.ts',
  'src/app/api/business/orders/[id]/route.ts',
  'src/app/api/businesses/[businessId]/members/route.ts',
  'src/app/api/businesses/[businessId]/route.ts',
  'src/app/api/dashboard/team-breakdown/route.ts'
]

// Replace patterns for remaining instances
const replacements = [
  // Prisma model names (direct calls)
  { pattern: /prisma\.business_memberships\./g, replacement: 'prisma.businessMemberships.' },
  // Transaction model names  
  { pattern: /tx\.business_memberships\./g, replacement: 'tx.businessMemberships.' },
]

console.log('🔧 Fixing final batch of business_memberships instances...\n')

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
console.log('🎯 Final business_memberships model name fixes complete!')