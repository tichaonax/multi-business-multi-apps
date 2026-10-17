import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { refreshRestaurantExpenseNotice } from '@/lib/restaurant-expense-notify'
import { checkRestaurantAccess, payeeColumns, LINE_STATUS } from '@/lib/restaurant-expenses'

/**
 * PATCH /api/restaurant/expenses/[transactionId] — MBM-319.
 *   { payee: {type,id} | null }  set/clear the payee — only while none of the
 *                                purchase's lines is in a payment request.
 *   { void: true, reason }       void a mistaken purchase — only while every
 *                                line is still UNPAID; by its recorder or an admin.
 *   { classify: [{lineId, categoryId, subcategoryId}] }
 *                                classify UNPAID lines (asked when they're picked
 *                                for payment); also saved on the catalogue item so
 *                                it's asked only once per item.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ transactionId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { transactionId } = await params
    const txn = await prisma.restaurantExpenseTransactions.findUnique({
      where: { id: transactionId },
      include: { lines: { select: { id: true, status: true } } },
    })
    if (!txn) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    const denied = await checkRestaurantAccess(user, txn.businessId)
    if (denied) return denied
    if (txn.voidedAt) return NextResponse.json({ error: 'This expense has been voided' }, { status: 400 })

    const body = await request.json()
    const allUnpaid = txn.lines.every(l => l.status === LINE_STATUS.UNPAID)

    if (body.void) {
      const reason = String(body.reason || '').trim()
      if (reason.length < 3) return NextResponse.json({ error: 'A reason is required to void an expense' }, { status: 400 })
      if (txn.createdBy !== user.id && user.role !== 'admin') {
        return NextResponse.json({ error: 'Only the person who recorded it or an admin can void this expense' }, { status: 403 })
      }
      if (!allUnpaid) return NextResponse.json({ error: 'Items already in a payment request cannot be voided' }, { status: 400 })
      const updated = await prisma.$transaction(async (tx) => {
        await tx.restaurantExpenseLines.updateMany({ where: { transactionId }, data: { status: LINE_STATUS.VOID } })
        return tx.restaurantExpenseTransactions.update({
          where: { id: transactionId },
          data: { voidedAt: new Date(), voidedBy: user.id, voidReason: reason },
        })
      })
      refreshRestaurantExpenseNotice(txn.businessId).catch(() => {})
      return NextResponse.json({ success: true, data: updated })
    }

    if ('payee' in body) {
      if (!allUnpaid) return NextResponse.json({ error: 'The payee cannot change while items are in a payment request' }, { status: 400 })
      const updated = await prisma.restaurantExpenseTransactions.update({
        where: { id: transactionId },
        data: payeeColumns(body.payee),
      })
      return NextResponse.json({ success: true, data: updated })
    }

    if (Array.isArray(body.classify)) {
      const lineIds = new Set(txn.lines.filter(l => l.status === LINE_STATUS.UNPAID).map(l => l.id))
      const entries = body.classify.filter((c: any) => lineIds.has(c.lineId) && c.categoryId)
      if (entries.length !== body.classify.length) {
        return NextResponse.json({ error: 'Only unpaid items of this expense can be classified, and a category is required' }, { status: 400 })
      }
      await prisma.$transaction(async (tx) => {
        for (const c of entries) {
          const data = { categoryId: c.categoryId, subcategoryId: c.subcategoryId || null }
          const line = await tx.restaurantExpenseLines.update({ where: { id: c.lineId }, data })
          await tx.restaurantExpenseItems.update({ where: { id: line.itemId }, data })
        }
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  } catch (err) {
    console.error('[PATCH /api/restaurant/expenses/[transactionId]]', err)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}
