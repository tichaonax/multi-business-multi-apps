import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isSystemAdmin } from '@/lib/permission-utils'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only system admins can access this endpoint
    if (!isSystemAdmin(session.user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get all persons (global contractor pool) with usage statistics
    const contractors = await prisma.person.findMany({
      include: {
        idFormatTemplate: {
          select: {
            name: true,
            countryCode: true
          }
        },
        projectContractors: {
          include: {
            constructionProject: {
              select: {
                id: true,
                name: true,
                status: true,
                createdBy: true,
                createdAt: true
              }
            }
          }
        },
        projectTransactions: {
          include: {
            personalExpense: {
              select: {
                amount: true,
                date: true,
                userId: true
              }
            },
            projectStage: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            projectContractors: true,
            projectTransactions: true
          }
        }
      },
      orderBy: [
        {
          projectContractors: {
            _count: 'desc'
          }
        },
        { fullName: 'asc' }
      ]
    })

    // Calculate analytics for each contractor
    const contractorAnalytics = contractors.map(contractor => {
      // Calculate total payments received
      const totalPayments = contractor.projectTransactions.reduce((sum, transaction) => {
        return sum + Number(transaction.personalExpense?.amount || 0)
      }, 0)

      // Get unique projects worked on
      const uniqueProjects = contractor.projectContractors.map(pc => pc.constructionProject)

      // Get unique users who have paid this contractor
      const uniquePayingUsers = [...new Set(
        contractor.projectTransactions
          .map(t => t.personalExpense?.userId)
          .filter(Boolean)
      )]

      // Calculate business type diversity (based on projects)
      const businessTypes = [...new Set(
        contractor.projectContractors.map(pc => 'construction') // All project contractors are construction
      )]

      // Recent activity
      const recentTransaction = contractor.projectTransactions
        .sort((a, b) => new Date(b.personalExpense?.date || 0).getTime() - new Date(a.personalExpense?.date || 0).getTime())[0]

      return {
        id: contractor.id,
        fullName: contractor.fullName,
        email: contractor.email,
        phone: contractor.phone,
        nationalId: contractor.nationalId,
        idFormatTemplate: contractor.idFormatTemplate,
        isActive: contractor.isActive,
        createdAt: contractor.createdAt,

        // Analytics
        totalProjects: contractor._count.projectContractors,
        totalPayments: totalPayments,
        totalTransactions: contractor._count.projectTransactions,
        averagePayment: contractor._count.projectTransactions > 0 ? totalPayments / contractor._count.projectTransactions : 0,
        uniquePayingUsers: uniquePayingUsers.length,
        businessTypesWorked: businessTypes.length,

        // Usage details
        projects: uniqueProjects,
        recentActivity: recentTransaction ? {
          date: recentTransaction.personalExpense?.date,
          amount: recentTransaction.personalExpense?.amount,
          stage: recentTransaction.projectStage?.name
        } : null
      }
    })

    // Overall system statistics
    const systemStats = {
      totalContractors: contractors.length,
      activeContractors: contractors.filter(c => c.isActive).length,
      contractorsWithProjects: contractors.filter(c => c._count.projectContractors > 0).length,
      contractorsWithPayments: contractors.filter(c => c._count.projectTransactions > 0).length,
      totalProjectAssignments: contractors.reduce((sum, c) => sum + c._count.projectContractors, 0),
      totalPaymentTransactions: contractors.reduce((sum, c) => sum + c._count.projectTransactions, 0),
      totalPaymentsValue: contractorAnalytics.reduce((sum, c) => sum + c.totalPayments, 0)
    }

    // Top performers
    const topByProjects = contractorAnalytics
      .filter(c => c.totalProjects > 0)
      .sort((a, b) => b.totalProjects - a.totalProjects)
      .slice(0, 10)

    const topByPayments = contractorAnalytics
      .filter(c => c.totalPayments > 0)
      .sort((a, b) => b.totalPayments - a.totalPayments)
      .slice(0, 10)

    const topByUsers = contractorAnalytics
      .filter(c => c.uniquePayingUsers > 0)
      .sort((a, b) => b.uniquePayingUsers - a.uniquePayingUsers)
      .slice(0, 10)

    return NextResponse.json({
      contractors: contractorAnalytics,
      systemStats,
      topPerformers: {
        byProjects: topByProjects,
        byPayments: topByPayments,
        byUsers: topByUsers
      }
    })
  } catch (error) {
    console.error('Contractor analytics fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contractor analytics' },
      { status: 500 }
    )
  }
}