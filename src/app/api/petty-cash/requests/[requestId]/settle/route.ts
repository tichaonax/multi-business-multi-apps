import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { updateExpenseAccountBalanceTx } from '@/lib/expense-account-utils'

async function hasPettyCashApprove(userId: string): Promise<boolean> {
  const record = await prisma.userPermissions.findFirst({
    where: { userId, granted: true, permission: { name: 'petty_cash.approve' } },
  })
  return !!record
}

/**
 * POST /api/petty-cash/requests/[requestId]/settle
 * Cashier settles the request at EOD.
 *
 * Body: { returnAmount, notes? }
 *   returnAmount — unused cash physically returned. Must be >= 0 and <= approvedAmount.
 *                  If 0, request is fully spent, no money moves back.
 *                  If > 0, system creates an ExpenseAccountPayment (PETTY_CASH_RETURN)
 *                  and a BusinessTransaction (CREDIT) to restore the business account.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isSystemAdmin(user) && !(await hasPettyCashApprove(user.id))) {
      return NextResponse.json({ error: 'You do not have permission to settle petty cash requests' }, { status: 403 })
    }

    const { requestId } = await params
    const body = await request.json()
    const returnAmount = Number(body.returnAmount ?? 0)
    const notes = body.notes?.trim() || null

    if (isNaN(returnAmount) || returnAmount < 0) {
      return NextResponse.json({ error: 'returnAmount must be zero or a positive number' }, { status: 400 })
    }

    const pcRequest = await prisma.pettyCashRequests.findUnique({
      where: { id: requestId },
    })
    if (!pcRequest) return NextResponse.json({ error: 'Petty cash request not found' }, { status: 404 })

    if (pcRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: `Only APPROVED requests can be settled. Current status: ${pcRequest.status}` },
        { status: 400 }
      )
    }

    const approvedAmount = Number(pcRequest.approvedAmount)
    if (returnAmount > approvedAmount) {
      return NextResponse.json(
        { error: `returnAmount ($${returnAmount.toFixed(2)}) cannot exceed approvedAmount ($${approvedAmount.toFixed(2)})` },
        { status: 400 }
      )
    }

    const now = new Date()

    const result = await prisma.$transaction(async (tx: any) => {
      let returnPaymentId: string | null = null
      let returnTxId: string | null = null
      let newBusinessBalance: number | null = null

      if (returnAmount > 0) {
        // 1. Create ExpenseAccountPayment: money OUT of expense account back to business
        const returnPayment = await tx.expenseAccountPayments.create({
          data: {
            expenseAccountId: pcRequest.expenseAccountId,
            payeeType: 'NONE',
            amount: returnAmount,
            paymentDate: now,
            notes: notes || `Petty cash return: ${pcRequest.purpose}`,
            status: 'SUBMITTED',
            paymentType: 'PETTY_CASH_RETURN',
            createdBy: user.id,
            submittedBy: user.id,
            submittedAt: now,
          },
        })
        returnPaymentId = returnPayment.id

        // 2. Update expense account balance
        await updateExpenseAccountBalanceTx(tx, pcRequest.expenseAccountId)

        // 3. Credit the business account back
        const businessAccount = await tx.businessAccounts.findUnique({
          where: { businessId: pcRequest.businessId },
        })
        if (!businessAccount) throw new Error('Business account not found')

        newBusinessBalance = Number(businessAccount.balance) + returnAmount
        await tx.businessAccounts.update({
          where: { businessId: pcRequest.businessId },
          data: { balance: newBusinessBalance },
        })

        const businessTx = await tx.businessTransactions.create({
          data: {
            businessId: pcRequest.businessId,
            type: 'CREDIT',
            amount: returnAmount,
            description: `Petty cash return: ${pcRequest.purpose}`,
            balanceAfter: newBusinessBalance,
            createdBy: user.id,
            referenceType: 'PETTY_CASH_RETURN',
            referenceId: requestId,
          },
        })
        returnTxId = businessTx.id
      }

      // 4. Settle the request
      const updated = await tx.pettyCashRequests.update({
        where: { id: requestId },
        data: {
          status: 'SETTLED',
          settledBy: user.id,
          settledAt: now,
          returnAmount,
          returnPaymentId,
          returnTxId,
          notes: notes && !pcRequest.notes ? notes : pcRequest.notes,
        },
        include: {
          business: { select: { id: true, name: true, type: true } },
          expenseAccount: { select: { id: true, accountName: true, accountNumber: true } },
          requester: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          settler: { select: { id: true, name: true, email: true } },
        },
      })

      return { updated, returnPaymentId, returnTxId, newBusinessBalance }
    })

    const approvedAmt = Number(result.updated.approvedAmount)
    const retAmt = Number(result.updated.returnAmount ?? 0)
    const netSpend = approvedAmt - retAmt

    return NextResponse.json({
      success: true,
      message: 'Petty cash request settled',
      data: {
        request: {
          id: result.updated.id,
          status: result.updated.status,
          approvedAmount: approvedAmt,
          returnAmount: retAmt,
          netSpend,
          settledAt: result.updated.settledAt?.toISOString(),
          settler: result.updated.settler,
          returnPaymentId: result.returnPaymentId,
          returnTxId: result.returnTxId,
        },
        businessAccountBalance: result.newBusinessBalance,
      },
    })
  } catch (error) {
    console.error('Error settling petty cash request:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to settle petty cash request' },
      { status: 500 }
    )
  }
}
