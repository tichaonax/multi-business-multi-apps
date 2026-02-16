import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/business/[businessId]/wifi-token-sales
 * Get WiFi token sales report for a business
 * Query params:
 * - channel: DIRECT | POS (optional, returns both if not specified)
 * - startDate: ISO date string (optional)
 * - endDate: ISO date string (optional)
 * - limit: number (default 50)
 * - offset: number (default 0)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { businessId } = await params
    const { searchParams } = new URL(request.url)

    const channel = searchParams.get('channel') // DIRECT or POS
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Check permission
    const isAdmin = user.role === 'admin'

    if (!isAdmin) {
      const membership = await prisma.businessMemberships.findFirst({
        where: {
          userId: user.id,
          businessId: businessId,
          isActive: true,
        },
      })

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Build where clause
    const whereClause: any = { businessId }

    if (channel && (channel === 'DIRECT' || channel === 'POS')) {
      whereClause.saleChannel = channel
    }

    if (startDate || endDate) {
      whereClause.soldAt = {}
      if (startDate) {
        whereClause.soldAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.soldAt.lte = new Date(endDate)
      }
    }

    // Fetch sales with related data
    const [sales, total, summary] = await Promise.all([
      prisma.wifiTokenSales.findMany({
        where: whereClause,
        include: {
          wifi_tokens: {
            select: {
              token: true,
              status: true,
              firstUsedAt: true,
              expiresAt: true,
              token_configurations: {
                select: {
                  name: true,
                  durationMinutes: true,
                },
              },
            },
          },
          users: {
            select: {
              fullName: true,
              email: true,
            },
          },
          expense_accounts: {
            select: {
              accountName: true,
            },
          },
        },
        orderBy: { soldAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.wifiTokenSales.count({ where: whereClause }),
      prisma.wifiTokenSales.groupBy({
        by: ['saleChannel'],
        where: whereClause,
        _sum: {
          saleAmount: true,
        },
        _count: {
          id: true,
        },
      }),
    ])

    // Format summary
    const summaryByChannel = {
      DIRECT: {
        count: 0,
        totalAmount: 0,
      },
      POS: {
        count: 0,
        totalAmount: 0,
      },
    }

    summary.forEach((item) => {
      const channel = item.saleChannel as 'DIRECT' | 'POS'
      if (channel === 'DIRECT' || channel === 'POS') {
        summaryByChannel[channel] = {
          count: item._count.id,
          totalAmount: Number(item._sum.saleAmount || 0),
        }
      }
    })

    const totalSales = summaryByChannel.DIRECT.totalAmount + summaryByChannel.POS.totalAmount
    const totalCount = summaryByChannel.DIRECT.count + summaryByChannel.POS.count

    return NextResponse.json({
      success: true,
      sales: sales.map((sale) => ({
        id: sale.id,
        saleChannel: sale.saleChannel,
        saleAmount: sale.saleAmount,
        paymentMethod: sale.paymentMethod,
        soldAt: sale.soldAt,
        soldBy: {
          name: sale.users.fullName,
          email: sale.users.email,
        },
        expenseAccount: sale.expense_accounts.accountName,
        token: {
          token: sale.wifi_tokens.token,
          status: sale.wifi_tokens.status,
          configName: sale.wifi_tokens.token_configurations?.name,
          durationMinutes: sale.wifi_tokens.token_configurations?.durationMinutes,
          firstUsedAt: sale.wifi_tokens.firstUsedAt,
          expiresAt: sale.wifi_tokens.expiresAt,
        },
        receiptPrinted: sale.receiptPrinted,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + sales.length < total,
      },
      summary: {
        byChannel: summaryByChannel,
        total: {
          count: totalCount,
          amount: totalSales,
        },
      },
    })
  } catch (error: any) {
    console.error('WiFi token sales report error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch sales report', details: error.message },
      { status: 500 }
    )
  }
}
