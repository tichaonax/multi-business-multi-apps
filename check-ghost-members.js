const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkMembers() {
  const businessId = '24e38355-84dc-4356-bfb7-7a7ae504e01b'
  
  console.log('Checking active business members...\n')
  
  const members = await prisma.businessMemberships.findMany({
    where: {
      businessId: businessId,
      isActive: true
    },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true
        }
      }
    }
  })
  
  console.log(`Found ${members.length} active member(s):\n`)
  
  members.forEach((member, index) => {
    console.log(`Member ${index + 1}:`)
    console.log(`  Membership ID: ${member.id}`)
    console.log(`  User ID: ${member.userId}`)
    console.log(`  Role: ${member.role}`)
    console.log(`  Membership Active: ${member.isActive}`)
    console.log(`  User Details:`)
    console.log(`    Email: ${member.users?.email || 'N/A'}`)
    console.log(`    Name: ${member.users?.name || 'N/A'}`)
    console.log(`    User Active: ${member.users?.isActive || 'N/A'}`)
    console.log(`  Created At: ${member.createdAt}`)
    console.log('')
  })
  
  // Also check for orphaned memberships (user deleted but membership remains)
  const allMemberships = await prisma.businessMemberships.findMany({
    where: {
      businessId: businessId
    }
  })
  
  console.log(`\nTotal memberships (active and inactive): ${allMemberships.length}`)
  
  const orphaned = allMemberships.filter(m => {
    const member = members.find(activeMember => activeMember.id === m.id)
    return m.isActive && (!member || !member.users)
  })
  
  if (orphaned.length > 0) {
    console.log(`\n⚠️ Found ${orphaned.length} orphaned membership(s) (active but no user):`)
    orphaned.forEach(m => {
      console.log(`  - Membership ID: ${m.id}, User ID: ${m.userId}`)
    })
  }
}

checkMembers()
  .catch(console.error)
  .finally(() => process.exit())
