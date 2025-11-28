/**
 * Diagnostic Script: Check Admin User Expense Account Permissions
 *
 * This script checks:
 * 1. User's role in the database
 * 2. User's permissions (both user-level and business-level)
 * 3. What permissions admins should have
 * 4. Why the Expense Accounts link might not be showing
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAdminExpensePermissions() {
  try {
    console.log('\n🔍 EXPENSE ACCOUNT PERMISSION DIAGNOSTIC\n')
    console.log('=' .repeat(60))

    // Find the admin user (assuming email admin@example.com or first admin user)
    console.log('\n1️⃣  Finding admin user...\n')

    // Try to find by common admin email first
    let adminUser = await prisma.users.findFirst({
      where: {
        email: 'admin@example.com'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
        isActive: true,
        business_memberships: {
          where: { isActive: true },
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

    // If not found, try finding first user with admin role
    if (!adminUser) {
      console.log('   admin@example.com not found, searching for first admin role user...')
      adminUser = await prisma.users.findFirst({
        where: {
          role: 'admin'
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          permissions: true,
          isActive: true,
          business_memberships: {
            where: { isActive: true },
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
    }

    // If still not found, list all users
    if (!adminUser) {
      console.log('   ❌ No admin user found! Listing all users:\n')
      const allUsers = await prisma.users.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true
        }
      })

      console.log('   Available users:')
      allUsers.forEach(user => {
        console.log(`   - ${user.email} (${user.name}) - Role: ${user.role}, Active: ${user.isActive}`)
      })

      console.log('\n   ℹ️  Please update this script to use your admin email address')
      console.log('   ℹ️  Or manually set a user to role="admin" in the database')
      return
    }

    console.log(`   ✅ Found admin user: ${adminUser.email} (${adminUser.name})`)
    console.log(`   📧 Email: ${adminUser.email}`)
    console.log(`   🆔 ID: ${adminUser.id}`)
    console.log(`   👤 Role: ${adminUser.role}`)
    console.log(`   ✓  Active: ${adminUser.isActive}`)
    console.log(`   🏢 Business memberships: ${adminUser.business_memberships.length}`)

    // Check if role is actually 'admin'
    console.log('\n2️⃣  Checking user role...\n')

    const isSystemAdmin = adminUser.role === 'admin'
    console.log(`   Role in database: "${adminUser.role}"`)
    console.log(`   Is system admin: ${isSystemAdmin ? '✅ YES' : '❌ NO'}`)

    if (!isSystemAdmin) {
      console.log('\n   ⚠️  PROBLEM IDENTIFIED: User role is NOT "admin"')
      console.log('   ℹ️  The sidebar checks for user.role === "admin"')
      console.log('\n   🔧 FIX: Run this SQL command to set the user as admin:')
      console.log(`   UPDATE users SET role = 'admin' WHERE email = '${adminUser.email}';`)
      console.log('\n   After updating, the user must log out and log back in.')
    }

    // Check user-level permissions
    console.log('\n3️⃣  Checking user-level permissions...\n')

    const userPermissions = adminUser.permissions || {}
    console.log('   User permissions from database:')
    console.log(JSON.stringify(userPermissions, null, 2))

    // Check expense account permissions specifically
    console.log('\n4️⃣  Checking expense account permissions...\n')

    const expensePermissions = {
      canAccessExpenseAccount: userPermissions.canAccessExpenseAccount,
      canCreateExpenseAccount: userPermissions.canCreateExpenseAccount,
      canMakeExpenseDeposits: userPermissions.canMakeExpenseDeposits,
      canMakeExpensePayments: userPermissions.canMakeExpensePayments,
      canViewExpenseReports: userPermissions.canViewExpenseReports,
      canCreateIndividualPayees: userPermissions.canCreateIndividualPayees,
      canDeleteExpenseAccounts: userPermissions.canDeleteExpenseAccounts,
      canAdjustExpensePayments: userPermissions.canAdjustExpensePayments,
    }

    console.log('   Expense Account Permissions:')
    Object.entries(expensePermissions).forEach(([key, value]) => {
      const icon = value ? '✅' : '❌'
      console.log(`   ${icon} ${key}: ${value || false}`)
    })

    // Show what admin permissions should be
    console.log('\n5️⃣  Admin permissions from ADMIN_USER_PERMISSIONS preset...\n')

    console.log('   System admins should have these expense permissions:')
    console.log('   ✅ canAccessExpenseAccount: true')
    console.log('   ✅ canCreateExpenseAccount: true')
    console.log('   ✅ canMakeExpenseDeposits: true')
    console.log('   ✅ canMakeExpensePayments: true')
    console.log('   ✅ canViewExpenseReports: true')
    console.log('   ✅ canCreateIndividualPayees: true')
    console.log('   ✅ canDeleteExpenseAccounts: true')
    console.log('   ✅ canAdjustExpensePayments: true')

    // Check sidebar logic
    console.log('\n6️⃣  Sidebar visibility check...\n')

    const hasExpenseAccess = userPermissions.canAccessExpenseAccount === true
    const showsInSidebar = hasExpenseAccess || isSystemAdmin

    console.log('   Sidebar logic: (hasUserPermission(...) || isSystemAdmin())')
    console.log(`   - hasUserPermission('canAccessExpenseAccount'): ${hasExpenseAccess ? '✅ true' : '❌ false'}`)
    console.log(`   - isSystemAdmin() [role === 'admin']: ${isSystemAdmin ? '✅ true' : '❌ false'}`)
    console.log(`   - Should show in sidebar: ${showsInSidebar ? '✅ YES' : '❌ NO'}`)

    // Final diagnosis
    console.log('\n7️⃣  DIAGNOSIS\n')

    if (showsInSidebar) {
      console.log('   ✅ User SHOULD see the Expense Accounts link in sidebar')
      console.log('\n   Possible issues:')
      console.log('   1. User session is stale - Try logging out and back in')
      console.log('   2. Browser cache - Try hard refresh (Ctrl+Shift+R)')
      console.log('   3. Check browser console for JavaScript errors')
    } else {
      console.log('   ❌ User will NOT see the Expense Accounts link')
      console.log('\n   🔧 SOLUTIONS:')

      if (!isSystemAdmin) {
        console.log('\n   Option 1: Set user role to admin (RECOMMENDED)')
        console.log(`   SQL: UPDATE users SET role = 'admin' WHERE email = '${adminUser.email}';`)
      }

      console.log('\n   Option 2: Grant user-level expense permissions')
      console.log('   SQL: UPDATE users SET permissions = permissions || \'{"canAccessExpenseAccount": true, "canCreateExpenseAccount": true, "canMakeExpenseDeposits": true, "canMakeExpensePayments": true, "canViewExpenseReports": true, "canCreateIndividualPayees": true, "canDeleteExpenseAccounts": true, "canAdjustExpensePayments": true}\'::jsonb')
      console.log(`   WHERE email = '${adminUser.email}';`)

      console.log('\n   ⚠️  After updating, user MUST log out and log back in to refresh session')
    }

    // Show business memberships
    if (adminUser.business_memberships.length > 0) {
      console.log('\n8️⃣  Business memberships...\n')
      adminUser.business_memberships.forEach(membership => {
        console.log(`   🏢 ${membership.businesses.name}`)
        console.log(`      Type: ${membership.businesses.type}`)
        console.log(`      Role: ${membership.role}`)
        console.log(`      Business ID: ${membership.businesses.id}`)
      })
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Diagnostic complete\n')

  } catch (error) {
    console.error('❌ Error running diagnostic:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAdminExpensePermissions()
