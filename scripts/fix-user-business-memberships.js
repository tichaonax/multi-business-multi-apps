/**
 * Fix User Business Memberships Script
 *
 * This script fixes users who were promoted from employees but didn't get
 * all their business memberships created due to the bug in create-user route.
 *
 * Usage: node scripts/fix-user-business-memberships.js
 *
 * Options:
 *   --email=<email>     Target user email (required)
 *   --role=<role>       Role to set for memberships (default: business-manager)
 *   --password=<pass>   New password to set (optional)
 *   --dry-run           Show what would be done without making changes
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })

const prisma = new PrismaClient()

// Permission presets (matching src/types/permissions.ts)
const BUSINESS_PERMISSION_PRESETS = {
  'employee': {
    canViewBusiness: true,
    canViewEmployees: false,
    canViewReports: false,
    canManageInventory: false,
    canManageOrders: true,
    canProcessPayments: true,
    canManageBusinessUsers: false,
    canManageBusinessSettings: false,
  },
  'business-manager': {
    canViewBusiness: true,
    canViewEmployees: true,
    canViewReports: true,
    canManageInventory: true,
    canManageOrders: true,
    canProcessPayments: true,
    canManageBusinessUsers: true,
    canManageBusinessSettings: true,
    canSetupPortalIntegration: true,
    canSellWifiTokens: true,
  },
  'business-owner': {
    canViewBusiness: true,
    canViewEmployees: true,
    canViewReports: true,
    canManageInventory: true,
    canManageOrders: true,
    canProcessPayments: true,
    canManageBusinessUsers: true,
    canManageBusinessSettings: true,
    canSetupPortalIntegration: true,
    canSellWifiTokens: true,
    canDeleteBusiness: true,
  }
}

async function fixUserBusinessMemberships() {
  // Parse command line arguments
  const args = process.argv.slice(2)
  const options = {}

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=')
      options[key] = value === undefined ? true : value
    }
  }

  const targetEmail = options.email
  const targetRole = options.role || 'business-manager'
  const newPassword = options.password
  const dryRun = options['dry-run'] || false

  if (!targetEmail) {
    console.error('Error: --email=<email> is required')
    console.log('\nUsage: node scripts/fix-user-business-memberships.js --email=user@example.com [--role=business-manager] [--password=newpass] [--dry-run]')
    process.exit(1)
  }

  console.log('='.repeat(60))
  console.log('Fix User Business Memberships Script')
  console.log('='.repeat(60))
  console.log(`Target Email: ${targetEmail}`)
  console.log(`Target Role: ${targetRole}`)
  console.log(`Set Password: ${newPassword ? 'Yes' : 'No'}`)
  console.log(`Dry Run: ${dryRun}`)
  console.log('')

  try {
    // 1. Find the user
    console.log('Step 1: Finding user...')
    const user = await prisma.users.findUnique({
      where: { email: targetEmail },
      include: {
        business_memberships: {
          include: {
            businesses: {
              select: { id: true, name: true, type: true }
            }
          }
        }
      }
    })

    if (!user) {
      console.error(`Error: User with email "${targetEmail}" not found`)
      process.exit(1)
    }

    console.log(`  Found user: ${user.name} (ID: ${user.id})`)
    console.log(`  Current role: ${user.role}`)
    console.log(`  Current business memberships: ${user.business_memberships.length}`)
    for (const membership of user.business_memberships) {
      console.log(`    - ${membership.businesses.name} (${membership.businesses.type}) - Role: ${membership.role}`)
    }
    console.log('')

    // 2. Find the linked employee
    console.log('Step 2: Finding linked employee...')
    const employee = await prisma.employees.findFirst({
      where: { userId: user.id },
      include: {
        employee_business_assignments: {
          where: { isActive: true },
          include: {
            businesses: {
              select: { id: true, name: true, type: true }
            }
          }
        },
        businesses: {
          select: { id: true, name: true, type: true }
        }
      }
    })

    if (!employee) {
      console.log('  No linked employee found.')
      console.log('  Checking if user needs employee link...')

      // Try to find an employee that should be linked
      const unlinkedEmployee = await prisma.employees.findFirst({
        where: {
          email: targetEmail,
          userId: null
        },
        include: {
          employee_business_assignments: {
            where: { isActive: true },
            include: {
              businesses: {
                select: { id: true, name: true, type: true }
              }
            }
          },
          businesses: {
            select: { id: true, name: true, type: true }
          }
        }
      })

      if (unlinkedEmployee) {
        console.log(`  Found unlinked employee: ${unlinkedEmployee.fullName} (${unlinkedEmployee.employeeNumber})`)
        console.log(`  This employee should be linked to the user.`)

        if (!dryRun) {
          await prisma.employees.update({
            where: { id: unlinkedEmployee.id },
            data: { userId: user.id }
          })
          console.log('  Employee linked to user.')
        } else {
          console.log('  [DRY RUN] Would link employee to user.')
        }
      } else {
        console.log('  No unlinked employee found with matching email.')
      }
      console.log('')
    } else {
      console.log(`  Found employee: ${employee.fullName} (${employee.employeeNumber})`)
      console.log(`  Primary business: ${employee.businesses.name}`)
      console.log(`  Business assignments: ${employee.employee_business_assignments.length}`)
      for (const assignment of employee.employee_business_assignments) {
        console.log(`    - ${assignment.businesses.name} (${assignment.businesses.type}) - Role: ${assignment.role || 'not set'}`)
      }
      console.log('')
    }

    // 3. Determine which business memberships need to be created
    console.log('Step 3: Analyzing missing business memberships...')

    const existingMembershipBusinessIds = user.business_memberships.map(m => m.businessId)
    const missingMemberships = []

    // Get employee data (either linked or newly found)
    const employeeData = employee || await prisma.employees.findFirst({
      where: { userId: user.id },
      include: {
        employee_business_assignments: {
          where: { isActive: true },
          include: {
            businesses: {
              select: { id: true, name: true, type: true }
            }
          }
        },
        businesses: {
          select: { id: true, name: true, type: true }
        }
      }
    })

    if (employeeData) {
      // Check primary business
      if (!existingMembershipBusinessIds.includes(employeeData.primaryBusinessId)) {
        missingMemberships.push({
          businessId: employeeData.primaryBusinessId,
          businessName: employeeData.businesses.name,
          businessType: employeeData.businesses.type,
          isPrimary: true
        })
      }

      // Check additional assignments
      for (const assignment of employeeData.employee_business_assignments) {
        if (!existingMembershipBusinessIds.includes(assignment.businessId)) {
          missingMemberships.push({
            businessId: assignment.businessId,
            businessName: assignment.businesses.name,
            businessType: assignment.businesses.type,
            isPrimary: false
          })
        }
      }
    }

    if (missingMemberships.length === 0) {
      console.log('  No missing business memberships found.')
    } else {
      console.log(`  Found ${missingMemberships.length} missing business membership(s):`)
      for (const missing of missingMemberships) {
        console.log(`    - ${missing.businessName} (${missing.businessType})${missing.isPrimary ? ' [PRIMARY]' : ''}`)
      }
    }
    console.log('')

    // 4. Create missing memberships and update existing ones
    console.log('Step 4: Fixing business memberships...')

    const permissions = BUSINESS_PERMISSION_PRESETS[targetRole] || BUSINESS_PERMISSION_PRESETS['employee']

    if (!dryRun) {
      // Create missing memberships
      for (const missing of missingMemberships) {
        await prisma.businessMemberships.create({
          data: {
            userId: user.id,
            businessId: missing.businessId,
            role: targetRole,
            permissions: permissions,
            isActive: true,
            joinedAt: new Date(),
            lastAccessedAt: new Date(),
          }
        })
        console.log(`  Created membership for: ${missing.businessName} with role: ${targetRole}`)
      }

      // Update existing memberships to correct role
      for (const membership of user.business_memberships) {
        if (membership.role !== targetRole) {
          await prisma.businessMemberships.update({
            where: { id: membership.id },
            data: {
              role: targetRole,
              permissions: permissions,
            }
          })
          console.log(`  Updated membership for: ${membership.businesses.name} from role: ${membership.role} to: ${targetRole}`)
        }
      }
    } else {
      for (const missing of missingMemberships) {
        console.log(`  [DRY RUN] Would create membership for: ${missing.businessName} with role: ${targetRole}`)
      }
      for (const membership of user.business_memberships) {
        if (membership.role !== targetRole) {
          console.log(`  [DRY RUN] Would update membership for: ${membership.businesses.name} from role: ${membership.role} to: ${targetRole}`)
        }
      }
    }
    console.log('')

    // 5. Update user password if requested
    if (newPassword) {
      console.log('Step 5: Setting new password...')
      if (!dryRun) {
        const hashedPassword = await bcrypt.hash(newPassword, 12)
        await prisma.users.update({
          where: { id: user.id },
          data: {
            passwordHash: hashedPassword,
            passwordResetRequired: false
          }
        })
        console.log('  Password updated successfully.')
        console.log('  Password reset requirement cleared.')
      } else {
        console.log('  [DRY RUN] Would set new password.')
      }
      console.log('')
    }

    // 6. Verify final state
    console.log('Step 6: Final state verification...')
    const updatedUser = await prisma.users.findUnique({
      where: { id: user.id },
      include: {
        business_memberships: {
          include: {
            businesses: {
              select: { id: true, name: true, type: true }
            }
          }
        },
        employees: {
          select: {
            id: true,
            fullName: true,
            employeeNumber: true
          }
        }
      }
    })

    console.log(`  User: ${updatedUser.name}`)
    console.log(`  Email: ${updatedUser.email}`)
    console.log(`  System Role: ${updatedUser.role}`)
    console.log(`  Linked Employee: ${updatedUser.employees ? `${updatedUser.employees.fullName} (${updatedUser.employees.employeeNumber})` : 'None'}`)
    console.log(`  Password Reset Required: ${updatedUser.passwordResetRequired}`)
    console.log(`  Business Memberships: ${updatedUser.business_memberships.length}`)
    for (const membership of updatedUser.business_memberships) {
      console.log(`    - ${membership.businesses.name} (${membership.businesses.type}) - Role: ${membership.role}`)
    }
    console.log('')

    console.log('='.repeat(60))
    if (dryRun) {
      console.log('DRY RUN COMPLETE - No changes were made.')
      console.log('Run without --dry-run to apply changes.')
    } else {
      console.log('FIX COMPLETE!')
    }
    console.log('='.repeat(60))

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

fixUserBusinessMemberships()
