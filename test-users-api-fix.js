// Test users API fix by checking the query structure
const { PrismaClient } = require('@prisma/client')

async function testUsersAPIStructure() {
  console.log('=== Testing Users API Structure ===\n')
  
  const prisma = new PrismaClient()
  
  try {
    console.log('1️⃣ Testing the actual Prisma query that the API uses...')
    
    // This is the exact query from the API
    const users = await prisma.users.findMany({
      include: {
        employees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true,
            employmentStatus: true,
          },
        },
        business_memberships: {
          include: {
            businesses: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            permission_templates: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1 // Just get one user for testing
    })
    
    console.log('✅ Query executed successfully!')
    
    if (users.length > 0) {
      const user = users[0]
      console.log(`\n2️⃣ Testing user: ${user.name} (${user.email})`)
      
      // Test the transformation logic
      const transformedUser = {
        ...user,
        businessMemberships: user.business_memberships?.map(membership => ({
          ...membership,
          business: membership.businesses,
          template: membership.permission_templates,
          businesses: membership.businesses, // Keep for frontend compatibility
          permissionTemplates: membership.permission_templates // Keep for frontend compatibility
        })) || []
      }
      
      console.log('\n3️⃣ Transformation results:')
      console.log(`   User has ${transformedUser.businessMemberships.length} business memberships`)
      
      transformedUser.businessMemberships.forEach((membership, index) => {
        console.log(`   ${index + 1}. Membership fields available:`)
        console.log(`      - membership.business: ${membership.business ? '✅ Available' : '❌ Missing'}`)
        console.log(`      - membership.businesses: ${membership.businesses ? '✅ Available' : '❌ Missing'}`)
        console.log(`      - membership.template: ${membership.template ? '✅ Available' : '❌ Missing'}`)
        console.log(`      - membership.permissionTemplates: ${membership.permissionTemplates ? '✅ Available' : '❌ Missing'}`)
        
        if (membership.businesses && membership.businesses.name) {
          console.log(`      - Business name: "${membership.businesses.name}"`)
        } else {
          console.log('      - ❌ Business name not accessible')
        }
      })
      
      console.log('\n🎯 Frontend compatibility check:')
      const frontendTest = transformedUser.businessMemberships.every(membership => 
        membership.businesses && membership.businesses.name
      )
      
      if (frontendTest || transformedUser.businessMemberships.length === 0) {
        console.log('✅ Frontend should work - businesses.name is accessible')
      } else {
        console.log('❌ Frontend will fail - businesses.name is not accessible')
      }
      
    } else {
      console.log('⚠️  No users found to test with')
    }
    
  } catch (error) {
    console.error('❌ API structure test failed:', error.message)
    if (error.message.includes('Unknown field')) {
      console.log('\n💡 This is likely a schema field mismatch')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testUsersAPIStructure().catch(console.error)