import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import { comboRequestApproverIds } from '@/lib/expense-account/combo-request-approvers'
import { loanComboProblems, comboSubmittedNotice } from '@/lib/expense-account/combo-business-loan'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { accountId, requestId } = await params

    const comboRequest = await prisma.comboPaymentRequests.findFirst({
      where: { id: requestId, accountId },
      include: { sections: { include: { items: true } } },
    })
    if (!comboRequest) return NextResponse.json({ error: 'Combo request not found' }, { status: 404 })
    if (comboRequest.status !== 'DRAFT') {
      return NextResponse.json({ error: 'Only DRAFT requests can be submitted' }, { status: 400 })
    }
    if (comboRequest.createdBy !== user.id && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only the creator can submit this request' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const overrideAmountRaw = body?.overrideAmount
    const overrideAmount = overrideAmountRaw !== undefined && overrideAmountRaw !== null && String(overrideAmountRaw).trim() !== ''
      ? Number(overrideAmountRaw)
      : undefined

    // MBM-333: every item needs an amount before it can be submitted
    const items = comboRequest.sections.flatMap(s => s.items)
    if (items.length === 0) {
      return NextResponse.json({ error: 'Add at least one item before submitting' }, { status: 400 })
    }
    const unpriced = items.filter(i => !(Number(i.estimatedAmount ?? 0) > 0))
    if (unpriced.length > 0) {
      return NextResponse.json({ error: `Add an amount for ${unpriced.map(i => `"${i.description}"`).join(', ')} before submitting` }, { status: 400 })
    }

    // MBM-335: every item the cashier flagged must be marked fixed first
    const openFlags = items.filter(i => i.flagNote && !i.flagResolvedAt)
    if (openFlags.length > 0) {
      return NextResponse.json({ error: `Fix the flagged item${openFlags.length === 1 ? '' : 's'} first: ${openFlags.map(i => `"${i.description}"`).join(', ')}` }, { status: 400 })
    }

    // MBM-333: a business-loan request needs every item priced with a payee
    // (each becomes its own payment at the target business)
    if (comboRequest.isBusinessLoan) {
      const problems = loanComboProblems(comboRequest)
      if (problems.length > 0) {
        return NextResponse.json({ error: `This is a business loan — ${problems.join('; ')}.` }, { status: 400 })
      }
    }

    const now = new Date()
    const [updated] = await prisma.$transaction([
      prisma.comboPaymentRequests.update({
        where: { id: requestId },
        data: {
          status: 'SUBMITTED',
          submittedAt: now,
          // A loan is lent in full: the items' total, no override (MBM-333 Q1)
          ...(comboRequest.isBusinessLoan ? { overrideAmount: null } : overrideAmount !== undefined ? { overrideAmount } : {}),
        },
      }),
      // MBM-333: answers the latest return for changes
      prisma.comboPaymentRequestReturns.updateMany({
        where: { requestId, resubmittedAt: null },
        data: { resubmittedAt: now },
      }),
    ])

    // Notify cashiers/managers (non-blocking)
    try {
      const cashierIds = await comboRequestApproverIds(accountId, user.id) // MBM-326: admin fallback
      if (cashierIds.length > 0) {
        // MBM-333: loans lead with the amount; resubmissions are their own type with a count
        const [resubmitCount, loanBusiness] = await Promise.all([
          prisma.comboPaymentRequestReturns.count({ where: { requestId, resubmittedAt: { not: null } } }),
          comboRequest.isBusinessLoan && comboRequest.loanBusinessId
            ? prisma.businesses.findUnique({ where: { id: comboRequest.loanBusinessId }, select: { name: true } })
            : null,
        ])
        const notice = comboSubmittedNotice({
          title: comboRequest.title,
          submitterName: user.name ?? 'Someone',
          amount: comboRequest.isBusinessLoan ? Number(comboRequest.requestedAmount) : (overrideAmount ?? Number(comboRequest.requestedAmount)),
          loanBusinessName: comboRequest.isBusinessLoan ? (loanBusiness?.name ?? 'a business') : null,
          resubmitCount,
        })
        await emitNotification({
          userIds: cashierIds,
          ...notice,
          linkUrl: `/expense-accounts/${accountId}/combo-requests/${requestId}`,
        })
      }
    } catch (notifErr) {
      console.error('Notification error (non-blocking):', notifErr)
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error submitting combo request:', error)
    return NextResponse.json({ error: 'Failed to submit combo request' }, { status: 500 })
  }
}
