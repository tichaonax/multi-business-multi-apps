const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

/**
 * Seed Leave Management Demo Data
 * Creates leave balances and leave requests for demo employees
 */

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getDaysAgo(days) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function getDaysFromNow(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date
}

async function seedLeaveManagement() {
  console.log('🏖️  Starting Leave Management Demo Data Seeding...\n')

  try {
    // Get a manager employee for approvals
    const managerEmployee = await prisma.employees.findFirst({
      where: {
        businesses: { isDemo: true },
        job_titles: {
          title: { contains: 'Manager' }
        }
      },
      select: { id: true, fullName: true }
    })

    if (!managerEmployee) {
      console.log('❌ No manager employee found. Cannot create leave requests.')
      return
    }

    console.log(`   Using manager for approvals: ${managerEmployee.fullName}\n`)

    // Get all demo employees
    const demoEmployees = await prisma.employees.findMany({
      where: {
        businesses: { isDemo: true }
      },
      include: {
        businesses: {
          select: { name: true }
        },
        employee_leave_balance: true
      }
    })

    console.log(`   Found ${demoEmployees.length} demo employees\n`)

    const currentYear = new Date().getFullYear()
    let totalBalancesCreated = 0
    let totalRequestsCreated = 0

    // ═══════════════════════════════════════════════════════════
    // CREATE LEAVE BALANCES FOR ALL EMPLOYEES
    // ═══════════════════════════════════════════════════════════
    console.log('📋 Creating Leave Balances...\n')

    for (const employee of demoEmployees) {
      // Check if balance already exists for current year
      const existingBalance = employee.employee_leave_balance.find(
        b => b.year === currentYear
      )

      if (!existingBalance) {
        // Standard leave allocation
        const annualLeaveDays = 15 // 15 days annual leave
        const sickLeaveDays = 10   // 10 days sick leave

        await prisma.employeeLeaveBalance.create({
          data: {
            employeeId: employee.id,
            year: currentYear,
            annualLeaveDays: annualLeaveDays,
            sickLeaveDays: sickLeaveDays,
            usedAnnualDays: 0, // Will update based on approved requests
            usedSickDays: 0,
            remainingAnnual: annualLeaveDays,
            remainingSick: sickLeaveDays,
            updatedAt: new Date()
          }
        })

        totalBalancesCreated++
      }
    }

    console.log(`   ✅ Created ${totalBalancesCreated} leave balances\n`)

    // ═══════════════════════════════════════════════════════════
    // CREATE LEAVE REQUESTS WITH DIFFERENT STATUSES
    // ═══════════════════════════════════════════════════════════
    console.log('📝 Creating Leave Requests...\n')

    const leaveReasons = {
      annual: [
        'Family vacation',
        'Personal matters',
        'Holiday trip',
        'Wedding ceremony',
        'House renovation'
      ],
      sick: [
        'Flu and fever',
        'Medical checkup',
        'Dental procedure',
        'Recovery from illness',
        'Doctor appointment'
      ]
    }

    for (const employee of demoEmployees) {
      // Skip the manager who approves requests
      if (employee.id === managerEmployee.id) continue

      const numRequests = randomInt(2, 4)

      for (let i = 0; i < numRequests; i++) {
        const leaveType = randomInt(0, 1) === 0 ? 'annual' : 'sick'
        const daysRequested = randomInt(1, 5)

        // Determine status and dates
        let status, startDate, endDate, approvedAt, approvedBy, rejectionReason
        const requestType = randomInt(0, 5) // 0-3: approved (past), 4: pending (future), 5: rejected

        if (requestType <= 3) {
          // APPROVED REQUEST (in the past)
          status = 'approved'
          const pastDays = randomInt(10, 90)
          startDate = getDaysAgo(pastDays)
          endDate = getDaysAgo(pastDays - daysRequested + 1)
          approvedBy = managerEmployee.id
          approvedAt = getDaysAgo(pastDays + randomInt(1, 5))

        } else if (requestType === 4) {
          // PENDING REQUEST (in the future)
          status = 'pending'
          const futureDays = randomInt(7, 60)
          startDate = getDaysFromNow(futureDays)
          endDate = getDaysFromNow(futureDays + daysRequested - 1)

        } else {
          // REJECTED REQUEST
          status = 'rejected'
          const pastDays = randomInt(5, 45)
          startDate = getDaysAgo(pastDays)
          endDate = getDaysAgo(pastDays - daysRequested + 1)
          approvedBy = managerEmployee.id
          approvedAt = getDaysAgo(pastDays + randomInt(1, 3))
          rejectionReason = randomInt(0, 1) === 0
            ? 'Insufficient leave balance'
            : 'Business needs - critical period'
        }

        // Get random reason
        const reason = leaveReasons[leaveType][randomInt(0, leaveReasons[leaveType].length - 1)]

        await prisma.employeeLeaveRequests.create({
          data: {
            employeeId: employee.id,
            leaveType: leaveType,
            startDate: startDate,
            endDate: endDate,
            daysRequested: daysRequested,
            status: status,
            reason: reason,
            approvedBy: approvedBy,
            approvedAt: approvedAt,
            rejectionReason: rejectionReason,
            createdAt: status === 'pending'
              ? getDaysAgo(randomInt(1, 7))
              : (status === 'approved' ? approvedAt : approvedAt),
            updatedAt: new Date()
          }
        })

        totalRequestsCreated++

        // Update leave balance for approved requests
        if (status === 'approved') {
          const leaveBalance = await prisma.employeeLeaveBalance.findFirst({
            where: {
              employeeId: employee.id,
              year: currentYear
            }
          })

          if (leaveBalance) {
            if (leaveType === 'annual') {
              await prisma.employeeLeaveBalance.update({
                where: { id: leaveBalance.id },
                data: {
                  usedAnnualDays: { increment: daysRequested },
                  remainingAnnual: { decrement: daysRequested },
                  updatedAt: new Date()
                }
              })
            } else if (leaveType === 'sick') {
              await prisma.employeeLeaveBalance.update({
                where: { id: leaveBalance.id },
                data: {
                  usedSickDays: { increment: daysRequested },
                  remainingSick: { decrement: daysRequested },
                  updatedAt: new Date()
                }
              })
            }
          }
        }
      }
    }

    console.log(`   ✅ Created ${totalRequestsCreated} leave requests\n`)

    // ═══════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║    ✅ Leave Management Demo Seeding Complete!             ║')
    console.log('╚════════════════════════════════════════════════════════════╝')

    console.log('\n📊 Summary:')
    console.log(`   Leave Balances Created: ${totalBalancesCreated}`)
    console.log(`   Leave Requests Created: ${totalRequestsCreated}`)

    // Get request statistics
    const requestStats = await prisma.employeeLeaveRequests.groupBy({
      by: ['status'],
      _count: true,
      _sum: {
        daysRequested: true
      },
      where: {
        employees_employee_leave_requests_employeeIdToemployees: {
          businesses: { isDemo: true }
        }
      }
    })

    console.log('\n📝 Leave Request Status Distribution:')
    for (const stat of requestStats) {
      console.log(`   ${stat.status.toUpperCase()}:`)
      console.log(`     - Count: ${stat._count} requests`)
      console.log(`     - Total Days: ${stat._sum.daysRequested} days`)
    }

    // Get leave type statistics
    const typeStats = await prisma.employeeLeaveRequests.groupBy({
      by: ['leaveType'],
      _count: true,
      _sum: {
        daysRequested: true
      },
      where: {
        employees_employee_leave_requests_employeeIdToemployees: {
          businesses: { isDemo: true }
        }
      }
    })

    console.log('\n📅 Leave Type Distribution:')
    for (const stat of typeStats) {
      console.log(`   ${stat.leaveType.toUpperCase()}:`)
      console.log(`     - Count: ${stat._count} requests`)
      console.log(`     - Total Days: ${stat._sum.daysRequested} days`)
    }

    // Get leave balance summary
    const balances = await prisma.employeeLeaveBalance.findMany({
      where: {
        year: currentYear,
        employees: {
          businesses: { isDemo: true }
        }
      },
      include: {
        employees: {
          select: {
            fullName: true,
            businesses: { select: { name: true } }
          }
        }
      }
    })

    console.log(`\n💼 Leave Balance Summary (${currentYear}):`)
    console.log(`   Total Employees: ${balances.length}`)

    const totalAnnualUsed = balances.reduce((sum, b) => sum + b.usedAnnualDays, 0)
    const totalSickUsed = balances.reduce((sum, b) => sum + b.usedSickDays, 0)
    const totalAnnualRemaining = balances.reduce((sum, b) => sum + b.remainingAnnual, 0)
    const totalSickRemaining = balances.reduce((sum, b) => sum + b.remainingSick, 0)

    console.log(`   Annual Leave: ${totalAnnualUsed} used, ${totalAnnualRemaining} remaining`)
    console.log(`   Sick Leave: ${totalSickUsed} used, ${totalSickRemaining} remaining`)

    // Sample employee balances
    console.log('\n👤 Sample Employee Balances:')
    for (let i = 0; i < Math.min(5, balances.length); i++) {
      const balance = balances[i]
      console.log(`   ${balance.employees.fullName} (${balance.employees.businesses?.name}):`)
      console.log(`     - Annual: ${balance.usedAnnualDays}/${balance.annualLeaveDays} used (${balance.remainingAnnual} remaining)`)
      console.log(`     - Sick: ${balance.usedSickDays}/${balance.sickLeaveDays} used (${balance.remainingSick} remaining)`)
    }

    console.log('\n🧪 Testing:')
    console.log('   - View employee leave dashboard')
    console.log('   - Submit new leave requests')
    console.log('   - Approve/reject pending requests')
    console.log('   - Check leave balance updates')
    console.log('   - View leave history and calendar')
    console.log('   - Test leave request notifications')

  } catch (error) {
    console.error('❌ Error seeding leave management demo data:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seeding function
seedLeaveManagement()
  .then(() => {
    console.log('\n✨ Seeding script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Seeding script failed:', error)
    process.exit(1)
  })
