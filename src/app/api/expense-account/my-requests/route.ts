import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

const PAYEE_SELECT = {
  payeeUser: { select: { id: true, name: true } },
  payeeEmployee: { select: { id: true, fullName: true, phone: true } },
  payeePerson: { select: { id: true, fullName: true, phone: true } },
  payeeBusiness: { select: { id: true, name: true } },
  payeeSupplier: { select: { id: true, name: true, phone: true } },
}

function resolvePayeeName(p: any): string | null {
  return p.payeeUser?.name ?? p.payeeEmployee?.fullName ?? p.payeePerson?.fullName ?? p.payeeBusiness?.name ?? p.payeeSupplier?.name ?? null
}

function mapPayment(p: any, rejectorName?: string | null) {
  return {
    id: p.id,
    status: p.status,
    amount: Number(p.amount),
    notes: p.notes,
    paymentChannel: p.paymentChannel ?? 'CASH',
    priority: p.priority ?? 'NORMAL',
    paymentType: p.paymentType ?? 'REGULAR',
    categoryName: p.category ? `${p.category.emoji ?? ''} ${p.category.name}`.trim() : null,
    payeeName: resolvePayeeName(p),
    expenseAccountId: p.expenseAccountId,
    expenseAccountName: p.expenseAccount?.accountName ?? null,
    businessName: p.expenseAccount?.business?.name ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    // Rejection fields
    rejectionReason: p.rejectionReason ?? null,
    rejectedAt: p.rejectedAt?.toISOString() ?? null,
    rejectedByName: rejectorName ?? null,
  }
}

/**
 * GET /api/expense-account/my-requests
 * Returns the current user's own payment requests grouped by lifecycle stage.
 * Used by the "My Payments" page to show active, rejected, and recent requests.
 */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const baseSelect = {
      id: true,
      status: true,
      amount: true,
      notes: true,
      paymentChannel: true,
      priority: true,
      paymentType: true,
      expenseAccountId: true,
      createdAt: true,
      updatedAt: true,
      rejectionReason: true,
      rejectedAt: true,
      rejectedBy: true,
      expenseAccount: { select: { id: true, accountName: true, business: { select: { name: true } } } },
      category: { select: { name: true, emoji: true } },
      ...PAYEE_SELECT,
    }

    const [active, rejected, recentApproved] = await Promise.all([
      // In-flight: submitted, queued, or pending cashier approval
      prisma.expenseAccountPayments.findMany({
        where: {
          createdBy: user.id,
          status: { in: ['SUBMITTED', 'QUEUED', 'PENDING_APPROVAL', 'REQUEST'] },
        },
        select: baseSelect,
        orderBy: { updatedAt: 'desc' },
      }),

      // Rejected: awaiting requester action
      prisma.expenseAccountPayments.findMany({
        where: { createdBy: user.id, status: 'REJECTED' },
        select: baseSelect,
        orderBy: { rejectedAt: 'desc' },
      }),

      // Recently approved (last 14 days)
      prisma.expenseAccountPayments.findMany({
        where: {
          createdBy: user.id,
          status: { in: ['APPROVED', 'PAID'] },
          updatedAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        },
        select: baseSelect,
        orderBy: { updatedAt: 'desc' },
        take: 20,
      }),
    ])

    // Resolve rejector names for rejected payments (rejectedBy is a plain ID, not a relation)
    const rejectorIds = [...new Set(rejected.map((p: any) => p.rejectedBy).filter(Boolean))]
    const rejectors = rejectorIds.length > 0
      ? await prisma.users.findMany({ where: { id: { in: rejectorIds as string[] } }, select: { id: true, name: true } })
      : []
    const rejectorMap = Object.fromEntries(rejectors.map((u: any) => [u.id, u.name]))

    return NextResponse.json({
      success: true,
      data: {
        active: active.map((p: any) => mapPayment(p)),
        rejected: rejected.map((p: any) => mapPayment(p, rejectorMap[p.rejectedBy] ?? null)),
        recentApproved: recentApproved.map((p: any) => mapPayment(p)),
      },
    })
  } catch (error) {
    console.error('Error fetching my requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}
