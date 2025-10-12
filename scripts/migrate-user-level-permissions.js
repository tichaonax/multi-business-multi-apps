const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

/**
 * Migration Script: Move Vehicle Management & Personal Finance permissions from BusinessMembership to User
 *
 * This script fixes the fundamental architecture issue where user-level permissions
 * (Personal Finance & Vehicle Management) were incorrectly stored in business memberships
 * instead of user records, causing permissions to disappear when switching businesses.
 */

const USER_LEVEL_PERMISSIONS = [
  // Personal Finance permissions
  'canAccessPersonalFinance',
  'canAddPersonalExpenses',
  'canEditPersonalExpenses',
  'canDeletePersonalExpenses',
  'canAddMoney',
  'canManagePersonalCategories',
  'canManagePersonalContractors',
  'canManagePersonalProjects',
  'canViewPersonalReports',
  'canExportPersonalData',

  // Vehicle Management permissions
  'canAccessVehicles',
  'canViewVehicles',
  'canManageVehicles',
  'canManageDrivers',
  'canManageTrips',
  'canManageVehicleMaintenance',
  'canViewVehicleReports',
  'canExportVehicleData',

  // System Administration permissions (user-level)
  'canManageSystemSettings',
  'canViewSystemLogs',
  'canManageAllBusinesses'
]

async function migrateUserLevelPermissions() {
  console.log('🚀 Starting user-level permissions migration...')

  try {
    // Get all users with business memberships
    const users = await prisma.users.findMany({
      include: {
        businessMemberships: {
          where: { isActive: true }
        }
      }
    })

    console.log(`📊 Found ${users.length} users to process`)

    let totalUpdated = 0

    for (const user of users) {
      console.log(`\n👤 Processing user: ${user.name} (${user.email})`)

      // Collect user-level permissions from all business memberships
      const aggregatedUserPermissions = {}
      let hasAnyUserPermissions = false

      for (const membership of user.businessMemberships) {
        const membershipPermissions = membership.permissions || {}

        // Extract user-level permissions from this membership
        for (const permission of USER_LEVEL_PERMISSIONS) {
          if (membershipPermissions[permission] === true) {
            aggregatedUserPermissions[permission] = true
            hasAnyUserPermissions = true
            console.log(`  ✅ Found ${permission} in ${membership.businessId}`)
          }
        }
      }

      if (hasAnyUserPermissions) {
        // Merge with existing user permissions
        const currentUserPermissions = user.permissions || {}
        const updatedUserPermissions = {
          ...currentUserPermissions,
          ...aggregatedUserPermissions
        }

        // Update user record
        await prisma.users.update({
          where: { id: user.id },
          data: {
            permissions: updatedUserPermissions
          }
        })

        console.log(`  📝 Updated user permissions for ${user.name}`)
        console.log(`  📋 Added permissions: ${Object.keys(aggregatedUserPermissions).join(', ')}`)

        // Remove user-level permissions from business memberships
        for (const membership of user.businessMemberships) {
          const membershipPermissions = { ...(membership.permissions || {}) }
          let membershipUpdated = false

          for (const permission of USER_LEVEL_PERMISSIONS) {
            if (membershipPermissions[permission] !== undefined) {
              delete membershipPermissions[permission]
              membershipUpdated = true
            }
          }

          if (membershipUpdated) {
            await prisma.businessMembership.update({
              where: { id: membership.id },
              data: {
                permissions: membershipPermissions
              }
            })
            console.log(`  🧹 Cleaned business membership permissions for business ${membership.businessId}`)
          }
        }

        totalUpdated++
      } else {
        console.log(`  ℹ️  No user-level permissions found for ${user.name}`)
      }
    }

    console.log(`\n✅ Migration completed successfully!`)
    console.log(`📊 Updated ${totalUpdated} users with user-level permissions`)
    console.log(`🎯 Personal Finance and Vehicle Management permissions are now business-agnostic`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Add admin user permissions if admin exists
async function ensureAdminUserPermissions() {
  console.log('\n🔧 Ensuring admin user has full user-level permissions...')

  try {
    const adminUsers = await prisma.users.findMany({
      where: { role: 'admin' }
    })

    const fullUserPermissions = {}
    for (const permission of USER_LEVEL_PERMISSIONS) {
      fullUserPermissions[permission] = true
    }

    for (const admin of adminUsers) {
      const currentPermissions = admin.permissions || {}
      const updatedPermissions = {
        ...currentPermissions,
        ...fullUserPermissions
      }

      await prisma.users.update({
        where: { id: admin.id },
        data: {
          permissions: updatedPermissions
        }
      })

      console.log(`✅ Updated admin user: ${admin.name} (${admin.email})`)
    }

  } catch (error) {
    console.error('❌ Failed to update admin permissions:', error)
    throw error
  }
}

// Run migration
async function main() {
  console.log('🏗️  User-Level Permissions Migration')
  console.log('===================================')
  console.log('This script migrates Personal Finance & Vehicle Management permissions')
  console.log('from business-specific to user-level (business-agnostic) storage.')
  console.log('')

  await migrateUserLevelPermissions()
  await ensureAdminUserPermissions()

  console.log('\n🎉 All done! Users can now access Personal Finance and Vehicle Management')
  console.log('   regardless of which business they have selected.')
}

main().catch((error) => {
  console.error('💥 Migration script failed:', error)
  process.exit(1)
})