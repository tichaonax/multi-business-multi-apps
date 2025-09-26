/**
 * Grant Mary the permission to edit/delete personal expenses
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔑 Checking Mary\'s permissions and granting delete access...\n')

  try {
    // Find Mary
    const mary = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Mary', mode: 'insensitive' } },
          { email: { contains: 'mary', mode: 'insensitive' } }
        ]
      },
      include: {
        businessMemberships: {
          include: {
            business: true
          }
        }
      }
    })

    if (!mary) {
      console.log('❌ Mary not found in the database')
      // Let's see what users exist
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true }
      })
      console.log('Available users:', users)
      return
    }

    console.log(`✅ Found Mary: ${mary.name} (${mary.email})`)
    console.log(`Business memberships: ${mary.businessMemberships.length}`)

    // Check if Mary has any business memberships
    if (mary.businessMemberships.length === 0) {
      console.log('❌ Mary has no business memberships. She needs to be assigned to a business first.')
      return
    }

    // Update Mary's permissions to include personal expense editing/deleting
    for (const membership of mary.businessMemberships) {
      console.log(`\n🏢 Updating permissions for business: ${membership.business.name}`)

      // Get current permissions
      let currentPermissions = membership.permissions || {}

      // Add the necessary permissions
      currentPermissions.canEditPersonalExpenses = true
      currentPermissions.canDeletePersonalExpenses = true
      currentPermissions.canAccessPersonalFinance = true

      // Update the membership
      await prisma.businessMembership.update({
        where: { id: membership.id },
        data: {
          permissions: currentPermissions
        }
      })

      console.log(`✅ Granted permissions: canEditPersonalExpenses, canDeletePersonalExpenses, canAccessPersonalFinance`)
    }

    console.log('\n🎯 Mary now has permission to:')
    console.log('- ✅ Access personal finance pages')
    console.log('- ✅ Edit personal expenses')
    console.log('- ✅ Delete personal expenses (within 24-hour window)')
    console.log('\nMary should now see the delete button on her personal expense rows!')

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch(console.error)