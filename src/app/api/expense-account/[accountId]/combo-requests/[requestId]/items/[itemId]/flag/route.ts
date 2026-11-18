/**
 * MBM-335 — the cashier flags one item of a submitted combo request for the
 * requester to fix (or clears / re-flags it). Same people who may return a
 * request: cashiers (canMakeExpensePayments) or admins, never the requester.
 *
 * PATCH body: { note: string }  → flag (or re-flag: clears any earlier "fixed")
 *             { clear: true }   → remove the flag
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string; requestId: string; itemId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { accountId, requestId, itemId } = await params

    const permissions = getEffectivePermissions(user)
    if (!permissions.canMakeExpensePayments && user.role !== 'admin') {
      return NextResponse.json({ error: 'Only cashiers or admins can flag items' }, { status: 403 })
    }

    const item = await prisma.comboPaymentRequestItems.findFirst({
      where: { id: itemId, requestId, request: { accountId } },
      select: { id: true, request: { select: { status: true, createdBy: true } } },
    })
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    if (item.request.createdBy === user.id) {
      return NextResponse.json({ error: 'You cannot flag items on your own request' }, { status: 403 })
    }
    if (item.request.status !== 'SUBMITTED') {
      return NextResponse.json({ error: 'Items can only be flagged while the request is waiting for approval' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    if (body?.clear === true) {
      const updated = await prisma.comboPaymentRequestItems.update({
        where: { id: itemId },
        data: { flagNote: null, flaggedBy: null, flaggedAt: null, flagResolvedAt: null, flagResponse: null },
      })
      return NextResponse.json({ success: true, data: updated })
    }

    const note = typeof body?.note === 'string' ? body.note.trim() : ''
    if (note.length < 3) {
      return NextResponse.json({ error: 'Say what needs fixing (at least 3 characters)' }, { status: 400 })
    }
    const updated = await prisma.comboPaymentRequestItems.update({
      where: { id: itemId },
      data: { flagNote: note, flaggedBy: user.id, flaggedAt: new Date(), flagResolvedAt: null, flagResponse: null },
    })
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('Error flagging combo item:', error)
    return NextResponse.json({ error: 'Failed to flag item' }, { status: 500 })
  }
}
