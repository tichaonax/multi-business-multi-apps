import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/petty-cash/requests/[requestId]
 * Returns the request detail plus expense account payments made after approval (context panel).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { requestId } = await params

    const pcRequest = await prisma.pettyCashRequests.findUnique({
      where: { id: requestId },
      include: {
        business: { select: { id: true, name: true, type: true } },
        expenseAccount: { select: { id: true, accountName: true, accountNumber: true, balance: true } },
        requester: { select: { id: true, name: true, email: true } },
        approver: { select: { id: true, name: true, email: true } },
        settler: { select: { id: true, name: true, email: true } },
        canceller: { select: { id: true, name: true, email: true } },
        returnPayment: { select: { id: true, amount: true, paymentDate: true, notes: true } },
      },
    })

    if (!pcRequest) return NextResponse.json({ error: 'Petty cash request not found' }, { status: 404 })

    // Fetch expense account payments made after approval as context (read-only reference)
    let recentPayments: any[] = []
    if (pcRequest.approvedAt && pcRequest.expenseAccountId) {
      recentPayments = await prisma.expenseAccountPayments.findMany({
        where: {
          expenseAccountId: pcRequest.expenseAccountId,
          paymentDate: { gte: pcRequest.approvedAt },
          // Exclude the return payment itself so it doesn't appear twice
          id: pcRequest.returnPaymentId ? { not: pcRequest.returnPaymentId } : undefined,
        },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          notes: true,
          paymentType: true,
          payeeType: true,
          payeeBusiness: { select: { id: true, name: true } },
          payeeUser: { select: { id: true, name: true } },
          payeeEmployee: { select: { id: true, fullName: true } },
          category: { select: { id: true, name: true, emoji: true } },
        },
        orderBy: { paymentDate: 'asc' },
        take: 50,
      })
    }

    const totalSpent = recentPayments
      .filter(p => p.paymentType !== 'PETTY_CASH_RETURN')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    return NextResponse.json({
      success: true,
      data: {
        request: {
          id: pcRequest.id,
          businessId: pcRequest.businessId,
          business: pcRequest.business,
          expenseAccountId: pcRequest.expenseAccountId,
          expenseAccount: {
            ...pcRequest.expenseAccount,
            balance: pcRequest.expenseAccount ? Number(pcRequest.expenseAccount.balance) : null,
          },
          requestedBy: pcRequest.requestedBy,
          requester: pcRequest.requester,
          approvedBy: pcRequest.approvedBy,
          approver: pcRequest.approver,
          settledBy: pcRequest.settledBy,
          settler: pcRequest.settler,
          cancelledBy: pcRequest.cancelledBy,
          canceller: pcRequest.canceller,
          status: pcRequest.status,
          requestedAmount: Number(pcRequest.requestedAmount),
          approvedAmount: pcRequest.approvedAmount != null ? Number(pcRequest.approvedAmount) : null,
          returnAmount: pcRequest.returnAmount != null ? Number(pcRequest.returnAmount) : null,
          purpose: pcRequest.purpose,
          notes: pcRequest.notes,
          requestedAt: pcRequest.requestedAt.toISOString(),
          approvedAt: pcRequest.approvedAt?.toISOString() || null,
          settledAt: pcRequest.settledAt?.toISOString() || null,
          cancelledAt: pcRequest.cancelledAt?.toISOString() || null,
          depositId: pcRequest.depositId,
          businessTxId: pcRequest.businessTxId,
          returnPaymentId: pcRequest.returnPaymentId,
          returnTxId: pcRequest.returnTxId,
          signatureData: pcRequest.signatureData ?? null,
          returnPayment: pcRequest.returnPayment
            ? { ...pcRequest.returnPayment, amount: Number(pcRequest.returnPayment.amount) }
            : null,
          paymentChannel: (pcRequest as any).paymentChannel ?? 'CASH',
          createdAt: pcRequest.createdAt.toISOString(),
          updatedAt: pcRequest.updatedAt.toISOString(),
        },
        // Expense account payments made after approval — read-only context for cashier
        recentPayments: recentPayments.map(p => ({
          id: p.id,
          amount: Number(p.amount),
          paymentDate: p.paymentDate.toISOString(),
          notes: p.notes,
          paymentType: p.paymentType,
          payeeType: p.payeeType,
          payee: p.payeeBusiness || p.payeeUser || p.payeeEmployee || null,
          category: p.category,
        })),
        summary: {
          approvedAmount: pcRequest.approvedAmount != null ? Number(pcRequest.approvedAmount) : null,
          totalSpentFromAccount: totalSpent,
          returnAmount: pcRequest.returnAmount != null ? Number(pcRequest.returnAmount) : null,
        },
      },
    })
  } catch (error) {
    console.error('Error fetching petty cash request:', error)
    return NextResponse.json({ error: 'Failed to fetch petty cash request' }, { status: 500 })
  }
}
