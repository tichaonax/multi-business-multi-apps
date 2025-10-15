const { PrismaClient } = require('@prisma/client')

async function testUserQuery() {
  const prisma = new PrismaClient()
  
  try {
    console.log('Testing user query with business memberships...')
    
    // Try to find a user - any user first
    const users = await prisma.users.findMany({ take: 1 })
    if (users.length === 0) {
      console.log('No users found in database')
      return
    }
    
    const userId = users[0].id
    console.log(`Testing with user ID: ${userId}`)
    
    // Test the specific query that's failing
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        business_memberships: {
          include: {
            businesses: {
              select: {
                id: true,
                name: true,
                type: true
              }
            }
          }
        }
      }
    })
    
    if (user) {
      console.log('✅ Query successful!')
      console.log(`User: ${user.name} (${user.email})`)
      console.log(`Business memberships: ${user.business_memberships?.length || 0}`)
      
      if (user.business_memberships && user.business_memberships.length > 0) {
        console.log('Business memberships:')
        user.business_memberships.forEach((membership, index) => {
          console.log(`  ${index + 1}. Business: ${membership.businesses.name}`)
          console.log(`     Role: ${membership.role}`)
          console.log(`     Active: ${membership.isActive}`)
        })
      }
    } else {
      console.log('❌ User not found')
    }
    
  } catch (error) {
    console.error('❌ Query failed:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await prisma.$disconnect()
  }
}

testUserQuery()