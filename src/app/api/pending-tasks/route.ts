import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, hasUserPermission, getCustomPermissionValue } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.users?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const { searchParams } = new URL(req.url)
    const includeDetails = searchParams.get('details') === 'true'

    // Get user's business memberships for filtering
    const userBusinessIds = user.businessMemberships?.map(m => m.businessId) || []

    let pendingTasks: any[] = []

  // 1. Pending Orders (Restaurant business)
  if (hasUserPermission(user, 'canViewOrders' as any) || isSystemAdmin(user)) {
      try {
        const pendingOrders = await prisma.orders.findMany({
          where: {
            status: 'pending'
          },
          select: {
            id: true,
            orderNumber: true,
            total: true,
            createdAt: true,
            tableNumber: true,
            users: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        pendingOrders.forEach(order => {
          pendingTasks.push({
            id: `order-${order.id}`,
            type: 'order',
            title: `Order #${order.orderNumber}`,
            description: `Pending order${order.tableNumber ? ` for table ${order.tableNumber}` : ''} - $${Number(order.total).toFixed(2)}`,
            createdAt: order.createdAt,
            priority: 'high',
            module: 'restaurant',
            entityId: order.id,
            details: includeDetails ? order : undefined
          })
        })
      } catch (error) {
        console.warn('Failed to fetch pending orders:', error)
      }
    }

    // 2. Pending Project Stages
  if (hasUserPermission(user, 'canViewProjects' as any) ||
    hasUserPermission(user, 'canCreatePersonalProjects' as any) ||
    hasUserPermission(user, 'canManagePersonalProjects' as any) ||
    isSystemAdmin(user)) {
      try {
        const whereClause: any = {
          status: 'pending'
        }

        // Filter by user's business access if not system admin
        if (!isSystemAdmin(user)) {
          const canAccessCrossBusinessProjects = hasUserPermission(user, 'canAccessCrossBusinessProjects' as any)

          if (!canAccessCrossBusinessProjects) {
            whereClause.OR = [
              { projects: { businessId: null } }, // Personal projects
              { projects: { businessId: { in: userBusinessIds } } } // Projects from user's businesses
            ]
          }
        }

        const pendingStages = await prisma.projectStages.findMany({
          where: whereClause,
          include: {
            projects: {
              select: {
                id: true,
                name: true,
                businessType: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        pendingStages.forEach(stage => {
          pendingTasks.push({
            id: `stage-${stage.id}`,
            type: 'project_stage',
            title: `Project Stage: ${stage.name}`,
            description: `Pending stage in "${stage.projects?.name}" project`,
            createdAt: stage.createdAt,
            priority: 'medium',
            module: 'projects',
            entityId: stage.id,
            projectId: stage.projectId,
            details: includeDetails ? stage : undefined
          })
        })
      } catch (error) {
        console.warn('Failed to fetch pending project stages:', error)
      }
    }

    // 3. Pending Project Transactions (requiring approval)
  if (hasUserPermission(user, 'canViewProjects' as any) ||
    hasUserPermission(user, 'canCreatePersonalProjects' as any) ||
    hasUserPermission(user, 'canManagePersonalProjects' as any) ||
    isSystemAdmin(user)) {
      try {
        const whereClause: any = {
          status: 'pending'
        }

        // Filter by user's business access if not system admin
        if (!isSystemAdmin(user)) {
          const canAccessCrossBusinessProjects = hasUserPermission(user, 'canAccessCrossBusinessProjects' as any)

          if (!canAccessCrossBusinessProjects) {
            whereClause.OR = [
              { projects: { businessId: null } }, // Personal projects
              { projects: { businessId: { in: userBusinessIds } } } // Projects from user's businesses
            ]
          }
        }

        const pendingTransactions = await prisma.project_transactions.findMany({
          where: whereClause,
          include: {
            projects: {
              select: {
                id: true,
                name: true,
                businessType: true
              }
            },
            users_project_transactions_createdByTousers: {
              select: {
                name: true,
                email: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        pendingTransactions.forEach(transaction => {
          // Remap Prisma-generated relation name to legacy `creator` expected by UI
          ;(transaction as any).creator = (transaction as any).users_project_transactions_createdByTousers ?? null
          pendingTasks.push({
            id: `transaction-${transaction.id}`,
            type: 'project_transaction',
            title: `Transaction Approval: $${Number(transaction.amount).toFixed(2)}`,
            description: `${transaction.description} in "${transaction.projects?.name}" project`,
            createdAt: transaction.createdAt,
            priority: 'high',
            module: 'projects',
            entityId: transaction.id,
            projectId: transaction.projectId,
            details: includeDetails ? transaction : undefined
          })
        })
      } catch (error) {
        console.warn('Failed to fetch pending project transactions:', error)
      }
    }

    // 4. Pending Employee Leave Requests
  if (hasUserPermission(user, 'canViewEmployees' as any) ||
    hasUserPermission(user, 'canManageEmployees' as any) ||
    isSystemAdmin(user)) {
      try {
        const pendingLeaveRequests = await prisma.employeeLeaveRequests.findMany({
          where: {
            status: 'pending'
          },
          include: {
            employees_employee_leave_requests_employeeIdToemployees: {
              select: {
                id: true,
                fullName: true,
                employeeNumber: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        pendingLeaveRequests.forEach(request => {
          // Map heavy Prisma relation name to friendly `employee` key expected by UI
          const employee = (request as any).employees_employee_leave_requests_employeeIdToemployees
          pendingTasks.push({
            id: `leave-${request.id}`,
            type: 'leave_request',
            title: `Leave Request: ${employee?.fullName}`,
            description: `${request.leaveType || 'Leave'} request${request.reason ? ` - ${request.reason}` : ''}`,
            createdAt: request.createdAt,
            priority: 'medium',
            module: 'employees',
            entityId: request.id,
            employeeId: request.employeeId,
            details: includeDetails ? { ...request, employee } : undefined
          })
        })
      } catch (error) {
        console.warn('Failed to fetch pending leave requests:', error)
      }
    }

    // 5. Pending Contract Renewals
  if (hasUserPermission(user, 'canViewEmployees' as any) ||
    hasUserPermission(user, 'canManageEmployees' as any) ||
    isSystemAdmin(user)) {
      try {
        const pendingRenewals = await prisma.contractRenewals.findMany({
          where: {
            status: 'pending'
          },
          include: {
            employees: {
              select: {
                id: true,
                fullName: true,
                employeeNumber: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        })

        pendingRenewals.forEach(renewal => {
          const employee = (renewal as any).employees
          pendingTasks.push({
            id: `renewal-${renewal.id}`,
            type: 'contract_renewal',
            title: `Contract Renewal: ${employee?.fullName}`,
            description: `Employee contract renewal${renewal.notes ? ` - ${renewal.notes}` : ''}`,
            createdAt: renewal.createdAt,
            priority: 'medium',
            module: 'employees',
            entityId: renewal.id,
            employeeId: renewal.employeeId,
            details: includeDetails ? { ...renewal, employee } : undefined
          })
        })
      } catch (error) {
        console.warn('Failed to fetch pending contract renewals:', error)
      }
    }

    // Sort all tasks by priority and creation date
    const priorityOrder = { high: 3, medium: 2, low: 1 }
    pendingTasks.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityOrder[b.priority as keyof typeof priorityOrder] - priorityOrder[a.priority as keyof typeof priorityOrder]
      if (priorityDiff !== 0) return priorityDiff

      // Then by creation date (oldest first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    // Calculate summary counts
    const summary = {
      total: pendingTasks.length,
      byType: pendingTasks.reduce((acc, task) => {
        acc[task.type] = (acc[task.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byPriority: pendingTasks.reduce((acc, task) => {
        acc[task.priority] = (acc[task.priority] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byModule: pendingTasks.reduce((acc, task) => {
        acc[task.module] = (acc[task.module] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    return NextResponse.json({
      tasks: pendingTasks,
      summary,
      count: pendingTasks.length
    })

  } catch (error) {
    console.error('Pending tasks fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending tasks' },
      { status: 500 }
    )
  }
}