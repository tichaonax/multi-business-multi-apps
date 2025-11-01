const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function investigateMember() {
  const businessId = '24e38355-84dc-4356-bfb7-7a7ae504e01b'
  const userId = '0631ea51-9bf8-443c-85ee-6647290e47fa'
  
  console.log('Investigating member details...\n')
  
  // Get full user details
  const user = await prisma.users.findUnique({
    where: { id: userId },
    include: {
      business_memberships: {
        where: { businessId }
      }
    }
  })
  
  console.log('User Details:')
  console.log(`  ID: ${user.id}`)
  console.log(`  Email: ${user.email}`)
  console.log(`  Name: ${user.name}`)
  console.log(`  Is Active: ${user.isActive}`)
  console.log(`  Created: ${user.createdAt}`)
  
  console.log('\nMembership Details:')
  user.business_memberships.forEach(m => {
    console.log(`  Role: ${m.role}`)
    console.log(`  Is Active: ${m.isActive}`)
    console.log(`  Joined At: ${m.joinedAt}`)
  })
  
  // Check if this is the business owner
  const business = await prisma.businesses.findUnique({
    where: { id: businessId },
    select: {
      id: true,
      name: true,
      createdBy: true
    }
  })
  
  console.log('\nBusiness Details:')
  console.log(`  Name: ${business.name}`)
  console.log(`  Created By: ${business.createdBy}`)
  console.log(`  Is this user the creator? ${business.createdBy === userId ? 'YES' : 'NO'}`)
  
  // Check all memberships for this business
  const allMembers = await prisma.businessMemberships.findMany({
    where: { businessId },
    include: {
      users: {
        select: { email: true, name: true, isActive: true }
      }
    }
  })
  
  console.log(`\nAll memberships for this business: ${allMembers.length}`)
  allMembers.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.users.email} - ${m.role} - Active: ${m.isActive}`)
  })
}

investigateMember()
  .catch(console.error)
  .finally(() => process.exit())
