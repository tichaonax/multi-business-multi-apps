import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPermission } from '@/lib/permission-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions
    const canViewReports = hasPermission(session.user, 'canViewEmployees') ||
                          hasPermission(session.user, 'canManageEmployees') ||
                          hasPermission(session.user, 'isSystemAdmin')

    if (!canViewReports) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const period = searchParams.get('period') || 'month'
    const businessId = searchParams.get('businessId')

    // Calculate date ranges
    const now = new Date()
    let startDate = new Date()
    
    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(now.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3)
        break
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1)
        break
      case 'all':
      default:
        startDate = new Date(2020, 0, 1) // Far back date
        break
    }

    // Build where clause for business filter
    const businessWhereClause = businessId ? {
      OR: [
        { primaryBusinessId: businessId },
        { employee_business_assignments: { some: { businessId, isActive: true } } }
      ]
    } : {}

    // Employee Metrics
    const [
      totalEmployees,
      activeEmployees,
      employeesByStatus,
      employeesByDepartment,
      employeesByBusiness,
      newHiresThisMonth,
      newHiresThisYear,
      terminationsThisMonth,
      terminationsThisYear,
      averageTenureData
    ] = await Promise.all([
      // Total employees
      prisma.employees.count({
        where: businessWhereClause
      }),
      
      // Active employees
      prisma.employees.count({
        where: {
          ...businessWhereClause,
          isActive: true,
          employmentStatus: 'active'
        }
      }),

      // Employees by status
      prisma.employees.groupBy({
        by: ['employmentStatus'],
        where: businessWhereClause,
        _count: true
      }),

      // Employees by department
      prisma.employees.groupBy({
        by: ['jobTitle'],
        where: businessWhereClause,
        _count: true
      }).then(async (results) => {
        const jobTitleIds = results.map(r => r.jobTitle).filter(Boolean)
        const jobTitles = await prisma.jobTitles.findMany({
          where: { id: { in: jobTitleIds } },
          select: { id: true, department: true }
        })
        
        const departmentCounts: Record<string, number> = {}
        results.forEach(result => {
          const jobTitle = jobTitles.find(jt => jt.id === result.jobTitle)
          const department = jobTitle?.department || null
          const key = department || 'Unassigned'
          departmentCounts[key] = (departmentCounts[key] || 0) + result._count
        })
        
        return Object.entries(departmentCounts).map(([department, count]) => ({
          department: department === 'Unassigned' ? null : department,
          count
        }))
      }),

      // Employees by business
      prisma.businesses.findMany({
        where: businessId ? { id: businessId } : {},
        include: {
          primaryEmployees: {
            where: businessWhereClause,
            select: { id: true }
          }
        }
      }).then(businesses => 
        businesses.map(business => ({
          businessName: business.name,
          businessType: business.type,
          count: business.primaryEmployees.length
        }))
      ),

      // New hires this month
      prisma.employees.count({
        where: {
          ...businessWhereClause,
          hireDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1)
          }
        }
      }),

      // New hires this year
      prisma.employees.count({
        where: {
          ...businessWhereClause,
          hireDate: {
            gte: new Date(now.getFullYear(), 0, 1)
          }
        }
      }),

      // Terminations this month
      prisma.employees.count({
        where: {
          ...businessWhereClause,
          terminationDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1)
          }
        }
      }),

      // Terminations this year
      prisma.employees.count({
        where: {
          ...businessWhereClause,
          terminationDate: {
            gte: new Date(now.getFullYear(), 0, 1)
          }
        }
      }),

      // Average tenure calculation
      prisma.employees.findMany({
        where: {
          ...businessWhereClause,
          isActive: true
        },
        select: { hireDate: true }
      })
    ])

    // Calculate average tenure in years
    const currentDate = new Date()
    const totalTenureMonths = averageTenureData.reduce((sum, emp) => {
      const hireDate = new Date(emp.hireDate)
      const months = (currentDate.getFullYear() - hireDate.getFullYear()) * 12 + 
                    (currentDate.getMonth() - hireDate.getMonth())
      return sum + months
    }, 0)
    const averageTenure = averageTenureData.length > 0 ? totalTenureMonths / averageTenureData.length / 12 : 0

    // Contract Metrics
    const [
      totalContracts,
      contractsByStatus,
      contractFinancials
    ] = await Promise.all([
      prisma.employeeContracts.count({
        where: businessId ? {
          employee: businessWhereClause
        } : {}
      }),

      prisma.employeeContracts.groupBy({
        by: ['status'],
        where: businessId ? {
          employee: businessWhereClause
        } : {},
        _count: true
      }),

      prisma.employeeContracts.aggregate({
        where: businessId ? {
          employee: businessWhereClause
        } : {},
        _avg: { baseSalary: true },
        _sum: { baseSalary: true }
      })
    ])

    // Disciplinary Metrics
    const [
      totalDisciplinaryActions,
      disciplinaryByStatus,
      disciplinaryBySeverity,
      disciplinaryByType,
      disciplinaryThisMonth,
      disciplinaryThisYear,
      overdueDisciplinary
    ] = await Promise.all([
      prisma.disciplinaryActions.count({
        where: businessId ? {
          employee: businessWhereClause
        } : {}
      }),

      prisma.disciplinaryActions.groupBy({
        by: ['isResolved'],
        where: businessId ? {
          employee: businessWhereClause
        } : {},
        _count: true
      }),

      prisma.disciplinaryActions.groupBy({
        by: ['severity'],
        where: businessId ? {
          employee: businessWhereClause
        } : {},
        _count: true
      }),

      prisma.disciplinaryActions.groupBy({
        by: ['type'],
        where: businessId ? {
          employee: businessWhereClause
        } : {},
        _count: true
      }),

      prisma.disciplinaryActions.count({
        where: {
          ...(businessId ? { employee: businessWhereClause } : {}),
          actionDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1)
          }
        }
      }),

      prisma.disciplinaryActions.count({
        where: {
          ...(businessId ? { employee: businessWhereClause } : {}),
          actionDate: {
            gte: new Date(now.getFullYear(), 0, 1)
          }
        }
      }),

      prisma.disciplinaryActions.count({
        where: {
          ...(businessId ? { employee: businessWhereClause } : {}),
          isResolved: false,
          followUpDate: {
            lt: now
          }
        }
      })
    ])

    // Benefits Metrics
    const [
      totalBenefitTypes,
      activeBenefitTypes,
      benefitFinancials,
      benefitsByType
    ] = await Promise.all([
      prisma.benefit_types.count(),
      
      prisma.benefit_types.count({
        where: { isActive: true }
      }),

      prisma.contractBenefits.aggregate({
        _sum: { amount: true },
        _count: true
      }),

      prisma.benefit_types.groupBy({
        by: ['type'],
        _count: true
      })
    ])

    // Format the response
    const dashboardData = {
      employees: {
        totalEmployees,
        activeEmployees,
        inactiveEmployees: totalEmployees - activeEmployees,
        newHiresThisMonth,
        newHiresThisYear,
        terminationsThisMonth,
        terminationsThisYear,
        averageTenure,
        employeesByStatus: employeesByStatus.reduce((acc, status) => {
          acc[status.employmentStatus] = status._count
          return acc
        }, {} as Record<string, number>),
        employeesByDepartment,
        employeesByBusiness
      },
      contracts: {
        totalContracts,
        activeContracts: contractsByStatus.find(s => s.status === 'active')?._count || 0,
        pendingContracts: contractsByStatus.find(s => s.status === 'pending_approval')?._count || 0,
        expiredContracts: contractsByStatus.find(s => s.status === 'expired')?._count || 0,
        drafts: contractsByStatus.find(s => s.status === 'draft')?._count || 0,
        contractsByStatus: contractsByStatus.reduce((acc, status) => {
          acc[status.status] = status._count
          return acc
        }, {} as Record<string, number>),
        averageContractValue: contractFinancials._avg.baseSalary || 0,
        totalContractValue: contractFinancials._sum.baseSalary || 0
      },
      disciplinary: {
        totalActions: totalDisciplinaryActions,
        openActions: disciplinaryByStatus.find(s => !s.isResolved)?._count || 0,
        resolvedActions: disciplinaryByStatus.find(s => s.isResolved)?._count || 0,
        overdueActions: overdueDisciplinary,
        actionsBySeverity: disciplinaryBySeverity.reduce((acc, severity) => {
          acc[severity.severity] = severity._count
          return acc
        }, {} as Record<string, number>),
        actionsByType: disciplinaryByType.map(type => ({
          type: type.type,
          count: type._count
        })),
        actionsThisMonth: disciplinaryThisMonth,
        actionsThisYear: disciplinaryThisYear
      },
      benefits: {
        totalBenefitTypes,
        activeBenefitTypes,
        totalBenefitValue: benefitFinancials._sum.amount || 0,
        averageBenefitsPerEmployee: activeEmployees > 0 ? 
          (benefitFinancials._sum.amount || 0) / activeEmployees : 0,
        benefitsByType: benefitsByType.map(type => ({
          type: type.type,
          count: type._count,
          totalValue: 0 // Could be calculated with more complex query if needed
        }))
      }
    }

    return NextResponse.json(dashboardData)
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}