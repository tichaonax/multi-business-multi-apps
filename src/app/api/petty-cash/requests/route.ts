import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

// Helper: check if user has a named system permission
async function hasSystemPermission(userId: string, permissionName: string): Promise<boolean> {
  const record = await prisma.userPermissions.findFirst({
    where: {
      userId,
      granted: true,
      permission: { name: permissionName },
    },
  })
  return !!record
}

/**
 * GET /api/petty-cash/requests
 * List petty cash requests. Filters: businessId, status, dateFrom, dateTo, page, limit
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
    const offset = (page - 1) * limit

    const where: any = {}
    if (businessId) where.businessId = businessId
    if (status) where.status = status
    if (dateFrom || dateTo) {
      where.requestedAt = {}
      if (dateFrom) where.requestedAt.gte = new Date(dateFrom)
      if (dateTo) {
        const end = new Date(dateTo)
        end.setHours(23, 59, 59, 999)
        where.requestedAt.lte = end
      }
    }

    const [requests, total] = await Promise.all([
      prisma.pettyCashRequests.findMany({
        where,
        include: {
          business: { select: { id: true, name: true, type: true } },
          expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
          requester: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          settler: { select: { id: true, name: true, email: true } },
        },
        orderBy: { requestedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.pettyCashRequests.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        requests: requests.map(formatRequest),
        pagination: { total, page, limit, hasMore: offset + limit < total },
      },
    })
  } catch (error) {
    console.error('Error fetching petty cash requests:', error)
    return NextResponse.json({ error: 'Failed to fetch petty cash requests' }, { status: 500 })
  }
}

/**
 * POST /api/petty-cash/requests
 * Submit a new petty cash request. Requires petty_cash.request permission.
 * Body: { businessId, requestedAmount, purpose, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isSystemAdmin(user) && !(await hasSystemPermission(user.id, 'petty_cash.request'))) {
      return NextResponse.json({ error: 'You do not have permission to submit petty cash requests' }, { status: 403 })
    }

    const body = await request.json()
    const { businessId, requestedAmount, purpose, notes, paymentChannel } = body

    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!purpose?.trim()) return NextResponse.json({ error: 'purpose is required' }, { status: 400 })
    if (!requestedAmount || Number(requestedAmount) <= 0) {
      return NextResponse.json({ error: 'requestedAmount must be a positive number' }, { status: 400 })
    }

    const business = await prisma.businesses.findUnique({
      where: { id: businessId },
      select: { id: true, name: true },
    })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    // Resolve the business's primary expense account now so we have a valid FK
    const expenseAccount = await prisma.expenseAccounts.findFirst({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    if (!expenseAccount) {
      return NextResponse.json(
        { error: 'No active expense account found for this business. Please create one first.' },
        { status: 400 }
      )
    }

    const newRequest = await prisma.pettyCashRequests.create({
      data: {
        businessId,
        expenseAccountId: expenseAccount.id,
        requestedBy: user.id,
        requestedAmount: Number(requestedAmount),
        purpose: purpose.trim(),
        notes: notes?.trim() || null,
        status: 'PENDING',
        paymentChannel: paymentChannel === 'ECOCASH' ? 'ECOCASH' : 'CASH',
      },
      include: {
        business: { select: { id: true, name: true, type: true } },
        requester: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(
      { success: true, message: 'Petty cash request submitted', data: { request: formatRequest(newRequest as any) } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating petty cash request:', error)
    return NextResponse.json({ error: 'Failed to create petty cash request' }, { status: 500 })
  }
}

function formatRequest(r: any) {
  return {
    id: r.id,
    businessId: r.businessId,
    business: r.business,
    expenseAccountId: r.expenseAccountId,
    expenseAccount: r.expenseAccount,
    requestedBy: r.requestedBy,
    requester: r.requester,
    approvedBy: r.approvedBy,
    approver: r.approver,
    settledBy: r.settledBy,
    settler: r.settler,
    cancelledBy: r.cancelledBy,
    status: r.status,
    requestedAmount: Number(r.requestedAmount),
    approvedAmount: r.approvedAmount != null ? Number(r.approvedAmount) : null,
    returnAmount: r.returnAmount != null ? Number(r.returnAmount) : null,
    purpose: r.purpose,
    notes: r.notes,
    requestedAt: r.requestedAt.toISOString(),
    approvedAt: r.approvedAt?.toISOString() || null,
    settledAt: r.settledAt?.toISOString() || null,
    cancelledAt: r.cancelledAt?.toISOString() || null,
    depositId: r.depositId,
    businessTxId: r.businessTxId,
    returnPaymentId: r.returnPaymentId,
    returnTxId: r.returnTxId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}
