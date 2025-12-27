import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin, hasUserPermission } from '@/lib/permission-utils'
import { SessionUser } from '@/lib/permission-utils'

// Defensive wrapper: when Prisma client or certain model methods are unavailable
// (for example in a fresh DB or during partial startup), return safe defaults
const safePrisma = (() => {
  const p: any = (globalThis as any).prisma || (typeof prisma !== 'undefined' ? prisma : null)

  const has = (model: string, method: string) => !!p && !!p[model] && typeof p[model][method] === 'function'

  return {
    async findMany(model: string, args: any, defaultValue: any = []) {
      try {
        if (!has(model, 'findMany')) return defaultValue
        return await (p as any)[model].findMany(args)
      } catch (err) {
        console.warn(`safePrisma.findMany(${model}) failed:`, err?.message || err)
        return defaultValue
      }
    },
    async count(model: string, args: any, defaultValue = 0) {
      try {
        if (!has(model, 'count')) return defaultValue
        return await (p as any)[model].count(args)
      } catch (err) {
        console.warn(`safePrisma.count(${model}) failed:`, err?.message || err)
        return defaultValue
      }
    },
    async aggregate(model: string, args: any, defaultValue: any = null) {
      try {
        if (!has(model, 'aggregate')) return defaultValue
        return await (p as any)[model].aggregate(args)
      } catch (err) {
        console.warn(`safePrisma.aggregate(${model}) failed:`, err?.message || err)
        return defaultValue
      }
    }
  }
})()

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = session.user as SessionUser
    const userBusinessIds = user.business_memberships?.map(m => m.businessId) || []

    // Parse query parameters for filtering
    const { searchParams } = new URL(req.url)
    const filterScope = searchParams.get('scope') || 'my' // 'my', 'all', 'user', 'business'
    const filterUserId = searchParams.get('userId')
    const filterBusinessId = searchParams.get('businessId')

    // Debug logging
    console.log('🔍 Recent Activity API - Filter Parameters:')
    console.log('  - filterScope:', filterScope)
    console.log('  - filterUserId:', filterUserId)
    console.log('  - filterBusinessId:', filterBusinessId)
    console.log('  - session.user.id:', session.user.id)
    console.log('  - isSystemAdmin:', isSystemAdmin(user))

    // Determine filtering based on scope and permissions
  let targetUserId: string | null = session.user.id // Default to current user
  let targetBusinessIds: string[] | null = userBusinessIds // Default to user's businesses
    let shouldReturnEmptyResults = false // Flag to return empty results when required selection is missing

    if (filterScope === 'all' && isSystemAdmin(user)) {
      // Admin viewing all activities - no user/business restriction
      targetUserId = null
      targetBusinessIds = null
    } else if (filterScope === 'user') {
      // Viewing specific user's activities (admin only)
      if (!isSystemAdmin(user)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }

      if (filterUserId) {
        targetUserId = filterUserId
        targetBusinessIds = null // Show all businesses for this user
      } else {
        // User filter selected but no specific user chosen - return empty results
        shouldReturnEmptyResults = true
      }
    } else if (filterScope === 'business') {
      // Viewing specific business activities
      if (filterBusinessId) {
        if (!userBusinessIds.includes(filterBusinessId) && !isSystemAdmin(user)) {
          return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
        }
        targetUserId = null // Show all users in this business
        targetBusinessIds = [filterBusinessId]
      } else {
        // Business filter selected but no specific business chosen - return empty results
        shouldReturnEmptyResults = true
      }
    }

    // Debug logging for calculated targets
    console.log('🎯 Calculated Filter Targets:')
    console.log('  - targetUserId:', targetUserId)
    console.log('  - targetBusinessIds:', targetBusinessIds)
    console.log('  - shouldReturnEmptyResults:', shouldReturnEmptyResults)

    // Return empty results early if required selection is missing
    if (shouldReturnEmptyResults) {
      console.log('🚫 Returning empty results - filter scope requires selection but none provided')
      return NextResponse.json({
        activities: [],
        summary: {
          total: 0,
          byType: {},
          byModule: {}
        },
        financialSummary: {
          totalRevenue: 0,
          totalExpenses: 0,
          netAmount: 0,
          hasRestrictedData: false
        },
        dateRange: {
          from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          to: new Date().toISOString()
        }
      })
    }

    // Get businesses the user owns/manages (for financial calculations)
    const ownedBusinessIds = user.business_memberships
      ?.filter(m => m.role === 'owner' || m.role === 'manager')
      ?.map(m => m.businessId) || []

    // Date 7 days ago
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    let activities: any[] = []
    let financialSummary = {
      totalRevenue: 0,
      totalExpenses: 0,
      netAmount: 0,
      hasRestrictedData: false
    }

    // 1. Recent Orders (Restaurant business)
    if (hasUserPermission(user, 'canViewOrders') || isSystemAdmin(user)) {
      try {
        // Build dynamic where clause for orders
        const orderWhereClause: any = {
          createdAt: { gte: sevenDaysAgo }
        }

        // Apply business filtering based on target
        if (targetBusinessIds && targetBusinessIds.length > 0) {
          orderWhereClause.businessId = { in: targetBusinessIds }
        } else if (!isSystemAdmin(user) && userBusinessIds.length > 0) {
          // Fallback for non-admin users - limit to their businesses
          orderWhereClause.businessId = { in: userBusinessIds }
        }
        // If targetBusinessIds is null and user is admin, show all businesses

        // console.log('🍽️ Orders Filter:')
        // console.log('  - whereClause:', JSON.stringify(orderWhereClause, null, 2))
        // console.log('  - targetBusinessIds applied:', targetBusinessIds)
        // console.log('  - userBusinessIds:', userBusinessIds)
        // console.log('  - user permissions canViewOrders:', hasUserPermission(user, 'canViewOrders'))
        // console.log('  - isSystemAdmin:', isSystemAdmin(user))

        const recentOrders = await safePrisma.findMany('businessOrder', {
          where: orderWhereClause,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            businessId: true,
            businesses: {
              select: {
                name: true,
                type: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        })

        // console.log(`🍽️ Found ${recentOrders.length} orders matching filter`)
        // recentOrders.forEach((order, index) => {
        //   console.log(`  ${index + 1}. ${order.orderNumber}: ${order.status} - $${order.totalAmount} (Business: ${order.businesses?.name})`)
        // })

        recentOrders.forEach(order => {
          const orderAmount = Number(order.totalAmount)
          const isOwnedBusiness = order.businessId && ownedBusinessIds.includes(order.businessId)
          const canViewFinancials = isSystemAdmin(user) || isOwnedBusiness
          const hasBusinessAccess = isSystemAdmin(user) || (order.businessId && userBusinessIds.includes(order.businessId))

          // Track financial data for owned businesses only
          if (canViewFinancials && order.status === 'COMPLETED') {
            financialSummary.totalRevenue += orderAmount
          } else if (!canViewFinancials && order.businessId) {
            financialSummary.hasRestrictedData = true
          }

          activities.push({
            id: `order-${order.id}`,
            type: 'order',
            title: `Order #${order.orderNumber}`,
            description: `${order.status} order`,
            createdAt: order.createdAt,
            module: order.business ? `restaurant(${order.businesses.name})` : 'restaurant',
            icon: '🍽️',
            status: order.status,
            entityId: order.id,
            link: hasBusinessAccess ? '/restaurant/orders' : null,
            businessInfo: order.business ? {
              businessId: order.businessId,
              businessName: order.businesses.name.length > 20
                ? order.businesses.name.substring(0, 20) + '...'
                : order.businesses.name,
              businessType: order.businesses.type,
              userHasAccess: hasBusinessAccess
            } : null,
            financialImpact: {
              amount: orderAmount,
              type: 'revenue' as const,
              isVisible: canViewFinancials
            },
            linkAccess: {
              hasAccess: hasBusinessAccess,
              reason: !hasBusinessAccess ? 'No access to this business' : undefined
            }
          })
        })
      } catch (error) {
        console.warn('Failed to fetch recent orders:', error)
      }
    }

    // 2. Recent Project Activities
    if (hasUserPermission(user, 'canViewProjects') ||
        hasUserPermission(user, 'canCreatePersonalProjects') ||
        hasUserPermission(user, 'canManagePersonalProjects') ||
        isSystemAdmin(user)) {
      try {
        const whereClause: any = {
          createdAt: { gte: sevenDaysAgo }
        }

        // Apply business filtering based on target
        if (targetBusinessIds && targetBusinessIds.length > 0) {
          whereClause.businessId = { in: targetBusinessIds }
        } else if (!isSystemAdmin(user)) {
          // Filter by user's business access if not system admin and no specific business target
          const canAccessCrossBusinessProjects = hasUserPermission(user, 'canAccessCrossBusinessProjects')

          if (!canAccessCrossBusinessProjects) {
            whereClause.OR = [
              { businessId: null }, // Personal projects
              { businessId: { in: userBusinessIds } } // Projects from user's businesses
            ]
          }
        }

        // Debug logging for project filtering
        console.log('🏗️ Project Activities Filter:')
        console.log('  - whereClause:', JSON.stringify(whereClause, null, 2))
        console.log('  - targetBusinessIds applied:', targetBusinessIds)
        console.log('  - filterScope:', filterScope)
        console.log('  - filterBusinessId:', filterBusinessId)

        const recentProjects = await safePrisma.findMany('constructionProject', {
          where: whereClause,
          select: {
            id: true,
            name: true,
            status: true,
            businessType: true,
            budget: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        })

        recentProjects.forEach(project => {
          activities.push({
            id: `project-${project.id}`,
            type: 'project',
            title: `Project: ${project.name}`,
            description: `${project.status} project${project.businessType ? ` (${project.businessType})` : ''} - $${Number(project.budget || 0).toFixed(2)}`,
            createdAt: project.createdAt,
            module: 'projects',
            icon: '🏗️',
            status: project.status,
            entityId: project.id,
            link: `/projects/${project.id}`
          })
        })

        // Recent Project Transactions
        const transactionWhereClause: any = {
          createdAt: { gte: sevenDaysAgo }
        }

        // Apply business filtering based on target
        if (targetBusinessIds && targetBusinessIds.length > 0) {
          transactionWhereClause.project = { businessId: { in: targetBusinessIds } }
        } else if (!isSystemAdmin(user) && !hasUserPermission(user, 'canAccessCrossBusinessProjects')) {
          // Non-admin users without cross-business access
          transactionWhereClause.OR = [
            { project: { businessId: null } },
            { project: { businessId: { in: userBusinessIds } } }
          ]
        }

        console.log('💰 Project Transactions Filter:')
        console.log('  - whereClause:', JSON.stringify(transactionWhereClause, null, 2))
        console.log('  - targetBusinessIds applied:', targetBusinessIds)

        const recentTransactions = await safePrisma.findMany('projectTransaction', {
          where: transactionWhereClause,
          include: {
            // relation name in schema is `project` (singular)
            project: {
              select: {
                id: true,
                name: true,
                businessType: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        })

        recentTransactions.forEach(transaction => {
          activities.push({
            id: `transaction-${transaction.id}`,
            type: 'transaction',
            title: `Transaction: $${Number(transaction.amount).toFixed(2)}`,
            description: `${transaction.description} in "${transaction.project?.name}" project`,
            createdAt: transaction.createdAt,
            module: 'projects',
            icon: '💰',
            status: transaction.status,
            entityId: transaction.id,
            link: `/projects/${transaction.projectId}`
          })
        })
      } catch (error) {
        console.warn('Failed to fetch recent project activities:', error)
      }
    }

    // 3. Recent Personal Expenses
    if (hasUserPermission(user, 'canAccessPersonalFinance') ||
        hasUserPermission(user, 'canCreatePersonalProjects') ||
        isSystemAdmin(user)) {
      try {
        // Build dynamic where clause for personal expenses
        const expenseWhereClause: any = {
          createdAt: { gte: sevenDaysAgo }
        }

        // Apply user filtering based on target
        if (targetUserId) {
          expenseWhereClause.userId = targetUserId
        } else if (targetBusinessIds && targetBusinessIds.length > 0) {
          // For business filtering, only include expenses that are actually linked to business projects
          // Personal expenses are only business-related if they have project_transactions linking to business projects
          const businessProjectTransactions = await prisma.projectTransactions.findMany({
            where: ({
              project: {
                businessId: { in: targetBusinessIds }
              },
              personalExpenseId: { not: null }
            } as any),
            select: { personalExpenseId: true }
          })
          const businessExpenseIds = businessProjectTransactions
            .map(pt => pt.personalExpenseId)
            .filter(id => id !== null)

          if (businessExpenseIds.length > 0) {
            expenseWhereClause.id = { in: businessExpenseIds }
          } else {
            // No business-linked expenses found, return empty results
            expenseWhereClause.id = 'non-existent-expense-id'
          }
        }
        // If targetUserId is null and no business filtering, show all users' expenses (admin viewing all)

        // Debug logging for expense filtering
        console.log('💸 Personal Expenses Filter:')
        console.log('  - expenseWhereClause:', JSON.stringify(expenseWhereClause, null, 2))
        console.log('  - targetUserId applied:', targetUserId)
        console.log('  - targetBusinessIds applied:', targetBusinessIds)
        console.log('  - filterScope:', filterScope)
        console.log('  - filterUserId:', filterUserId)
        console.log('  - filterBusinessId:', filterBusinessId)

        // Additional validation to ensure filtering is applied correctly
        if (filterScope === 'user' && filterUserId && targetUserId !== filterUserId) {
          console.error('❌ FILTER MISMATCH: targetUserId does not match filterUserId')
          console.error(`   Expected: ${filterUserId}, Got: ${targetUserId}`)
        }

        const recentExpenses = await safePrisma.findMany('personalExpenses', {
          where: expenseWhereClause,
          include: {
            expense_category: {
              select: {
                id: true,
                name: true,
                emoji: true
              }
            },
            expense_subcategory: {
              select: {
                id: true,
                name: true,
                emoji: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        })

        recentExpenses.forEach(expense => {
          // Build category display string with emoji hierarchy
          let categoryDisplay = expense.category || 'General'

          // If we have the new 3-level hierarchy data, use that instead
          if (expense.expense_category) {
            categoryDisplay = `${expense.expense_category.emoji} ${expense.expense_category.name}`
            if (expense.expense_subcategory) {
              categoryDisplay += ` → ${expense.expense_subcategory.emoji} ${expense.expense_subcategory.name}`
            }
          }
          const isIncome = Number(expense.amount) > 0 && (
            expense.category?.toLowerCase().includes('income') ||
            expense.category?.toLowerCase().includes('salary') ||
            expense.category?.toLowerCase().includes('revenue')
          )

          const expenseAmount = Math.abs(Number(expense.amount))

          // Track personal financial data (always visible for personal data)
          if (isIncome) {
            financialSummary.totalRevenue += expenseAmount
          } else {
            financialSummary.totalExpenses += expenseAmount
          }

          activities.push({
            id: `expense-${expense.id}`,
            type: isIncome ? 'income' : 'expense',
            title: `${isIncome ? 'Income' : 'Expense'}: $${expenseAmount.toFixed(2)}`,
            description: `${expense.description} (${categoryDisplay})`,
            createdAt: expense.createdAt,
            module: 'personal',
            icon: isIncome ? '💵' : '💸',
            status: 'completed',
            entityId: expense.id,
            link: '/personal',
            businessInfo: null, // Personal transactions have no business affiliation
            financialImpact: {
              amount: expenseAmount,
              type: isIncome ? 'revenue' : 'expense',
              isVisible: true // Always visible for personal data
            },
            linkAccess: {
              hasAccess: true, // Always accessible for personal data
              reason: undefined
            }
          })
        })
      } catch (error) {
        console.warn('Failed to fetch recent personal expenses:', error)
      }
    }

    // 4. Recent Business Orders (from business modules)
    if (hasUserPermission(user, 'canViewOrders') ||
        hasUserPermission(user, 'canViewBusinessOrders') ||
        isSystemAdmin(user)) {
      try {
        const businessWhereClause: any = {
          createdAt: { gte: sevenDaysAgo }
        }

        // Apply business filtering based on target
        if (targetBusinessIds && targetBusinessIds.length > 0) {
          businessWhereClause.businessId = { in: targetBusinessIds }
          // Always exclude restaurants when filtering by specific business
          // because Section 1 "Recent Orders (Restaurant business)" handles restaurant orders
          businessWhereClause.business = { type: { not: 'restaurant' } }
        } else if (!isSystemAdmin(user) && userBusinessIds.length > 0) {
          // Fallback for non-admin users - limit to their businesses
          businessWhereClause.businessId = { in: userBusinessIds }
          // Also exclude restaurants to avoid duplication with Section 1
          businessWhereClause.business = { type: { not: 'restaurant' } }
        } else {
          // When not filtering by specific business, exclude restaurants
          // since they're handled in Section 1 "Recent Orders (Restaurant business)"
          businessWhereClause.business = { type: { not: 'restaurant' } }
        }
        // If targetBusinessIds is null and user is admin, show all businesses

        console.log('🏪 Business Orders Filter:')
        console.log('  - whereClause:', JSON.stringify(businessWhereClause, null, 2))
        console.log('  - targetBusinessIds applied:', targetBusinessIds)
        console.log('  - userBusinessIds:', userBusinessIds)
        console.log('  - user permissions canViewBusinessOrders:', hasUserPermission(user, 'canViewBusinessOrders'))
        console.log('  - isSystemAdmin:', isSystemAdmin(user))

        const recentBusinessOrders = await safePrisma.findMany('businessOrder', {
          where: businessWhereClause,
          include: {
            businesses: {
              select: {
                name: true,
                type: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        })

        console.log(`🏪 Found ${recentBusinessOrders.length} business orders matching filter`)
        recentBusinessOrders.forEach((order, index) => {
          console.log(`  ${index + 1}. ${order.orderNumber}: ${order.businesses?.type} - ${order.businesses?.name}`)
        })
        // recentBusinessOrders.forEach((order, index) => {
        //   console.log(`  ${index + 1}. ${order.orderNumber}: ${order.status} - $${order.subtotal} (Business: ${order.businesses?.name})`)
        // })

        recentBusinessOrders.forEach(order => {
          const businessType = order.businesses?.type || 'business'
          const businessIcon = businessType === 'grocery' ? '🛒' :
                              businessType === 'clothing' ? '👕' :
                              businessType === 'hardware' ? '🔧' : '🏪'

          activities.push({
            id: `business-order-${order.id}`,
            type: 'business_order',
            title: `${businessType.charAt(0).toUpperCase() + businessType.slice(1)} Order`,
            description: `${order.status} order from ${order.businesses?.name || 'Business'} - $${Number(order.totalAmount).toFixed(2)}`,
            createdAt: order.createdAt,
            module: businessType,
            icon: businessIcon,
            status: order.status,
            entityId: order.id,
            link: `/${businessType}/orders`
          })
        })
      } catch (error) {
        console.warn('Failed to fetch recent business orders:', error)
      }
    }

    // 5. Recent User Activities (if admin and not filtering by specific user/business)
    if (isSystemAdmin(user) && filterScope !== 'user' && filterScope !== 'business') {
      try {
        console.log('👤 User Activities: Showing admin user creation activities (no user/business filter)')

        const recentUsers = await prisma.users.findMany({
          where: {
            createdAt: { gte: sevenDaysAgo }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        })

        recentUsers.forEach(newUser => {
          activities.push({
            id: `user-${newUser.id}`,
            type: 'user_created',
            title: `New User: ${newUser.name}`,
            description: `${newUser.email} joined the system`,
            createdAt: newUser.createdAt,
            module: 'admin',
            icon: '👤',
            status: 'active',
            entityId: newUser.id,
            link: '/admin/users'
          })
        })
      } catch (error) {
        console.warn('Failed to fetch recent user activities:', error)
      }
    } else if (isSystemAdmin(user)) {
      console.log('👤 User Activities: Skipped due to user/business filtering')
    }

    // 9. R710 WiFi Portal Sync Events (Admin and Business Owners)
    if (isSystemAdmin(user) || hasUserPermission(user, 'canManageWifiPortal')) {
      try {
        const whereClause: any = {
          syncedAt: { gte: sevenDaysAgo }
        }

        // Apply business filtering based on target
        if (targetBusinessIds && targetBusinessIds.length > 0) {
          whereClause.businessId = { in: targetBusinessIds }
        } else if (!isSystemAdmin(user)) {
          // Show only sync logs for businesses user has access to
          whereClause.businessId = { in: userBusinessIds }
        }

        console.log('📡 R710 Sync Activities Filter:')
        console.log('  - whereClause:', JSON.stringify(whereClause, null, 2))
        console.log('  - targetBusinessIds applied:', targetBusinessIds)

        const recentSyncLogs = await safePrisma.findMany('r710SyncLogs', {
          where: whereClause,
          select: {
            id: true,
            businessId: true,
            syncType: true,
            status: true,
            tokensChecked: true,
            tokensUpdated: true,
            errorMessage: true,
            syncDurationMs: true,
            syncedAt: true,
            businesses: {
              select: {
                name: true,
                type: true
              }
            },
            device_registry: {
              select: {
                ipAddress: true
              }
            }
          },
          orderBy: {
            syncedAt: 'desc'
          },
          take: 10
        })

        console.log(`📡 Found ${recentSyncLogs.length} R710 sync logs matching filter`)

        recentSyncLogs.forEach(log => {
          const hasBusinessAccess = isSystemAdmin(user) || userBusinessIds.includes(log.businessId)
          const syncTypeLabel = log.syncType === 'TOKEN_SYNC' ? 'Token Sync' :
                                log.syncType === 'AUTO_GENERATION' ? 'Auto-Generate' : 'Health Check'

          let icon = '📡'
          let statusLabel = log.status

          if (log.status === 'ERROR') {
            icon = '❌'
            statusLabel = 'Failed'
          } else if (log.status === 'DEVICE_UNREACHABLE') {
            icon = '⚠️'
            statusLabel = 'Device Unreachable'
          } else {
            icon = '✅'
            statusLabel = 'Success'
          }

          activities.push({
            id: `r710-sync-${log.id}`,
            type: 'r710_sync',
            title: `R710 ${syncTypeLabel}`,
            description: log.status === 'SUCCESS'
              ? `${log.tokensUpdated}/${log.tokensChecked} tokens updated`
              : log.errorMessage || `${statusLabel}`,
            createdAt: log.syncedAt,
            module: `r710(${log.businesses.name})`,
            icon,
            status: log.status,
            entityId: log.id,
            link: hasBusinessAccess ? '/r710-portal' : null,
            businessInfo: {
              businessId: log.businessId,
              businessName: log.businesses.name.length > 20
                ? log.businesses.name.substring(0, 20) + '...'
                : log.businesses.name,
              businessType: log.businesses.type,
              userHasAccess: hasBusinessAccess
            },
            metadata: {
              deviceIp: log.device_registry.ipAddress,
              syncType: log.syncType,
              tokensChecked: log.tokensChecked,
              tokensUpdated: log.tokensUpdated,
              duration: log.syncDurationMs ? `${log.syncDurationMs}ms` : null
            },
            linkAccess: {
              hasAccess: hasBusinessAccess,
              reason: !hasBusinessAccess ? 'No access to this business' : undefined
            }
          })
        })
      } catch (error) {
        console.warn('Failed to fetch R710 sync activities:', error)
      }
    }

    // Sort all activities by creation date (most recent first)
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Limit to most recent 20 activities
    activities = activities.slice(0, 20)

    // Calculate summary stats
    const summary = {
      total: activities.length,
      byType: activities.reduce((acc, activity) => {
        acc[activity.type] = (acc[activity.type] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      byModule: activities.reduce((acc, activity) => {
        acc[activity.module] = (acc[activity.module] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    // Calculate net amount
    financialSummary.netAmount = financialSummary.totalRevenue - financialSummary.totalExpenses

    return NextResponse.json({
      activities,
      summary,
      financialSummary,
      dateRange: {
        from: sevenDaysAgo.toISOString(),
        to: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Recent activity fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent activity' },
      { status: 500 }
    )
  }
}