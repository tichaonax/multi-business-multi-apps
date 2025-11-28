/**
 * Verify Demo User Expense Account Permissions
 * Shows which demo users have expense account access
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function verifyDemoExpensePermissions() {
  try {
    console.log('\n🔍 VERIFYING DEMO USER EXPENSE ACCOUNT PERMISSIONS\n')
    console.log('=' .repeat(70))

    // Get all demo users (those with -demo.com emails)
    const demoUsers = await prisma.users.findMany({
      where: {
        email: {
          contains: '-demo.com'
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
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
      },
      orderBy: {
        email: 'asc'
      }
    })

    console.log(`\n✅ Found ${demoUsers.length} demo users\n`)

    // Group users by business
    const usersByBusiness = {}

    demoUsers.forEach(user => {
      user.business_memberships.forEach(membership => {
        const businessKey = membership.businesses.name
        if (!usersByBusiness[businessKey]) {
          usersByBusiness[businessKey] = []
        }
        usersByBusiness[businessKey].push({ user, membership })
      })
    })

    // Display users grouped by business
    for (const [businessName, users] of Object.entries(usersByBusiness)) {
      console.log(`\n🏢 ${businessName}`)
      console.log('─'.repeat(70))

      for (const { user, membership } of users) {
        const permissions = user.permissions || {}

        // Check expense account permissions
        const hasAccess = permissions.canAccessExpenseAccount === true
        const canCreate = permissions.canCreateExpenseAccount === true
        const canDeposit = permissions.canMakeExpenseDeposits === true
        const canPay = permissions.canMakeExpensePayments === true
        const canViewReports = permissions.canViewExpenseReports === true
        const canDelete = permissions.canDeleteExpenseAccounts === true

        const accessIcon = hasAccess ? '✅' : '❌'
        const permissionLevel =
          (canCreate && canDeposit && canDelete) ? '💰 FULL ACCESS' :
          (canPay && canViewReports) ? '📊 MANAGER' :
          hasAccess ? '👁️  VIEW ONLY' :
          '❌ NO ACCESS'

        console.log(`\n  ${accessIcon} ${user.name}`)
        console.log(`     Email: ${user.email}`)
        console.log(`     Business Role: ${membership.role}`)
        console.log(`     Expense Access: ${permissionLevel}`)

        if (hasAccess) {
          const grantedPermissions = []
          if (canCreate) grantedPermissions.push('Create Accounts')
          if (canDeposit) grantedPermissions.push('Make Deposits')
          if (canPay) grantedPermissions.push('Make Payments')
          if (canViewReports) grantedPermissions.push('View Reports')
          if (canDelete) grantedPermissions.push('Delete Accounts')

          if (grantedPermissions.length > 0) {
            console.log(`     Permissions: ${grantedPermissions.join(', ')}`)
          }
        }
      }
    }

    // Summary statistics
    console.log('\n' + '='.repeat(70))
    console.log('\n📊 SUMMARY\n')

    const usersWithFullAccess = demoUsers.filter(u =>
      u.permissions?.canCreateExpenseAccount &&
      u.permissions?.canMakeExpenseDeposits &&
      u.permissions?.canDeleteExpenseAccounts
    )

    const usersWithManagerAccess = demoUsers.filter(u =>
      u.permissions?.canAccessExpenseAccount &&
      u.permissions?.canMakeExpensePayments &&
      !u.permissions?.canCreateExpenseAccount
    )

    const usersWithNoAccess = demoUsers.filter(u =>
      !u.permissions?.canAccessExpenseAccount
    )

    console.log(`Total Demo Users: ${demoUsers.length}`)
    console.log(`├─ Full Access (Finance Manager): ${usersWithFullAccess.length}`)
    console.log(`├─ Manager Access: ${usersWithManagerAccess.length}`)
    console.log(`└─ No Access: ${usersWithNoAccess.length}`)

    console.log('\n💡 Demo Credentials:\n')
    console.log('Password for all demo users: Demo@123')
    console.log('\nRecommended Test Users:')

    if (usersWithFullAccess.length > 0) {
      console.log(`\n  💰 Finance Manager (Full Access):`)
      usersWithFullAccess.forEach(u => {
        console.log(`     ${u.email}`)
      })
    }

    if (usersWithManagerAccess.length > 0) {
      console.log(`\n  📊 Managers (Can make payments & view reports):`)
      usersWithManagerAccess.slice(0, 3).forEach(u => {
        console.log(`     ${u.email}`)
      })
      if (usersWithManagerAccess.length > 3) {
        console.log(`     ... and ${usersWithManagerAccess.length - 3} more`)
      }
    }

    // Check expense accounts
    console.log('\n' + '='.repeat(70))
    console.log('\n💳 EXPENSE ACCOUNTS\n')

    const expenseAccounts = await prisma.expenseAccounts.findMany({
      select: {
        accountName: true,
        accountNumber: true,
        balance: true,
        isActive: true,
        _count: {
          select: {
            deposits: true,
            payments: true
          }
        }
      },
      orderBy: {
        accountNumber: 'asc'
      }
    })

    if (expenseAccounts.length === 0) {
      console.log('⚠️  No expense accounts found!')
      console.log('\nRun: node scripts/seed-demo-expense-accounts.js')
    } else {
      console.log(`Found ${expenseAccounts.length} expense accounts:\n`)

      expenseAccounts.forEach(account => {
        console.log(`  📊 ${account.accountName}`)
        console.log(`     Number: ${account.accountNumber}`)
        console.log(`     Balance: $${parseFloat(account.balance).toFixed(2)}`)
        console.log(`     Deposits: ${account._count.deposits} | Payments: ${account._count.payments}`)
        console.log('')
      })
    }

    console.log('=' .repeat(70))
    console.log('\n✅ Verification complete\n')

  } catch (error) {
    console.error('❌ Error verifying permissions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyDemoExpensePermissions()
