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
    const contractors = await prisma.persons.findMany({
      include: {
        // schema relation name is `id_format_templates` (plural)
        id_format_templates: {
          select: {
            name: true,
            countryCode: true
          }
        },
        project_contractors: {
          include: {
            constructionProjects: {
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
        project_transactions: {
          include: {
            personalExpenses: {
              select: {
                amount: true,
                date: true,
                userId: true
              }
            },
            projectStages: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            project_contractors: true,
            project_transactions: true
          }
        }
      },
      orderBy: [
        {
          project_contractors: {
            _count: 'desc'
          }
        },
        { fullName: 'asc' }
      ]
    })

    // Calculate analytics for each contractor
    const contractorAnalytics = contractors.map((contractor: any) => {
      // Calculate total payments received
      const totalPayments = (contractor.project_transactions || []).reduce((sum: number, transaction: any) => {
        const amt = transaction.personalExpenses?.amount || transaction.personalExpenses?.amount?.toNumber?.() || 0
        return sum + Number(amt)
      }, 0)

      // Get unique projects worked on
      const uniqueProjects = (contractor.project_contractors || []).map((pc: any) => pc.constructionProjects)

      // Get unique users who have paid this contractor
      const uniquePayingUsers = [...new Set(
        (contractor.project_transactions || []).map((t: any) => t.personalExpenses?.userId).filter(Boolean)
      )]

      // Calculate business type diversity (based on projects)
      const businessTypes = [...new Set((contractor.project_contractors || []).map(() => 'construction'))]

      // Recent activity
      const recentTransaction = (contractor.project_transactions || [])
        .slice()
        .sort((a: any, b: any) => new Date(b.personalExpenses?.date || 0).getTime() - new Date(a.personalExpenses?.date || 0).getTime())[0]

      return {
        id: contractor.id,
        fullName: contractor.fullName,
        email: contractor.email,
        phone: contractor.phone,
        nationalId: contractor.nationalId,
  // preserve legacy response shape expected by frontend
  idFormatTemplate: (contractor as any).idFormatTemplates || null,
        isActive: contractor.isActive,
        createdAt: contractor.createdAt,

  // Analytics
  totalProjects: (contractor._count?.project_contractors) || 0,
  totalPayments: totalPayments,
  totalTransactions: (contractor._count?.project_transactions) || 0,
  averagePayment: ((contractor._count?.project_transactions) || 0) > 0 ? totalPayments / ((contractor._count?.project_transactions) || 1) : 0,
  uniquePayingUsers: uniquePayingUsers.length,
  businessTypesWorked: businessTypes.length,

        // Usage details
        projects: uniqueProjects,
        recentActivity: recentTransaction ? {
          date: recentTransaction.personalExpenses?.date,
          amount: recentTransaction.personalExpenses?.amount,
          stage: recentTransaction.projectStages?.name
        } : null
      }
    })

    // Overall system statistics
    const systemStats = {
      totalContractors: contractors.length,
      activeContractors: contractors.filter(c => c.isActive).length,
      contractorsWithProjects: contractors.filter(c => c._count.project_contractors > 0).length,
      contractorsWithPayments: contractors.filter(c => c._count.project_transactions > 0).length,
      totalProjectAssignments: contractors.reduce((sum, c) => sum + c._count.project_contractors, 0),
      totalPaymentTransactions: contractors.reduce((sum, c) => sum + c._count.project_transactions, 0),
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