import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, getEffectivePermissions } from '@/lib/permission-utils'

function formatConversion(c: any) {
  const tendered = c.tenderedAmount ? Number(c.tenderedAmount) : null
  const requested = Number(c.amount)
  return {
    id: c.id,
    businessId: c.businessId,
    business: c.business ?? undefined,
    amount: requested,
    tenderedAmount: tendered,
    variance: tendered !== null ? tendered - requested : null,
    notes: c.notes,
    status: c.status,
    requestedBy: c.requestedBy,
    requestedAt: c.requestedAt,
    requester: c.requester ?? undefined,
    approvedBy: c.approvedBy,
    approvedAt: c.approvedAt,
    approver: c.approver ?? undefined,
    completedBy: c.completedBy,
    completedAt: c.completedAt,
    completer: c.completer ?? undefined,
    rejectedBy: c.rejectedBy,
    rejectedAt: c.rejectedAt,
    rejecter: c.rejecter ?? undefined,
    rejectionReason: c.rejectionReason,
    transactionCode: c.transactionCode,
    ecocashAmount: c.ecocashAmount !== null ? Number(c.ecocashAmount) : null,
    cashTendered: c.cashTendered ?? null,
    outflowEntryId: c.outflowEntryId,
    inflowEntryId: c.inflowEntryId,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

/**
 * GET /api/ecocash-conversions
 * List conversions. Filters: businessId, status, startDate, endDate, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
    const offset = (page - 1) * limit

    const where: any = {}
    if (businessId) where.businessId = businessId
    if (status) where.status = status
    if (startDate || endDate) {
      where.requestedAt = {}
      if (startDate) where.requestedAt.gte = new Date(startDate)
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.requestedAt.lte = end
      }
    }

    const [conversions, total] = await Promise.all([
      prisma.ecocashConversion.findMany({
        where,
        include: {
          business: { select: { id: true, name: true, type: true } },
          requester: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          completer: { select: { id: true, name: true, email: true } },
          rejecter: { select: { id: true, name: true, email: true } },
        },
        orderBy: { requestedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.ecocashConversion.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        conversions: conversions.map(formatConversion),
        pagination: { total, page, limit, hasMore: offset + limit < total },
      },
    })
  } catch (error) {
    console.error('Error fetching ecocash conversions:', error)
    return NextResponse.json({ error: 'Failed to fetch ecocash conversions' }, { status: 500 })
  }
}

/**
 * POST /api/ecocash-conversions
 * Create a new conversion request (status = PENDING).
 * Body: { businessId, amount, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!isSystemAdmin(user) && !permissions.canSubmitPaymentBatch) {
      return NextResponse.json({ error: 'You do not have permission to request ecocash conversions' }, { status: 403 })
    }

    const body = await request.json()
    const { businessId, amount, notes } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }

    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const conversion = await prisma.ecocashConversion.create({
      data: {
        businessId,
        amount: Number(amount),
        notes: notes?.trim() || null,
        requestedBy: user.id,
      },
      include: {
        business: { select: { id: true, name: true, type: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({ success: true, data: formatConversion(conversion) }, { status: 201 })
  } catch (error) {
    console.error('Error creating ecocash conversion:', error)
    return NextResponse.json({ error: 'Failed to create ecocash conversion' }, { status: 500 })
  }
}
