const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixGhostMember() {
  const businessId = '24e38355-84dc-4356-bfb7-7a7ae504e01b'
  const membershipId = 'b51c0689-7de0-4348-a2d7-e15b62a3f828'
  
  console.log('Fixing ghost member...\n')
  
  // Option 1: Deactivate the membership
  console.log('Deactivating membership...')
  const updated = await prisma.businessMemberships.update({
    where: {
      id: membershipId
    },
    data: {
      isActive: false
    }
  })
  
  console.log('✓ Membership deactivated')
  console.log(`  Membership ID: ${updated.id}`)
  console.log(`  User ID: ${updated.userId}`)
  console.log(`  Is Active: ${updated.isActive}`)
  
  // Verify
  const remaining = await prisma.businessMemberships.count({
    where: {
      businessId: businessId,
      isActive: true
    }
  })
  
  console.log(`\nActive members remaining: ${remaining}`)
  console.log(remaining === 0 ? '✓ Business can now be deleted' : '⚠️ Still has active members')
}

fixGhostMember()
  .catch(console.error)
  .finally(() => process.exit())
