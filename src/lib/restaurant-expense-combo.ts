/**
 * MBM-319 — combo payment request hooks for recorded restaurant expenses,
 * plus the line statuses. Kept free of `next/server` on purpose: this module
 * is reached from combo-request-expiry.ts, which server.ts loads at startup
 * (before Next.js is ready) — importing next/server there crashes the
 * service with "AsyncLocalStorage accessed in runtime where it is not
 * available".
 */
import { prisma } from '@/lib/prisma'

/** Line statuses. OPEN = still owed (shown in the queue and the unpaid report). */
export const LINE_STATUS = {
  UNPAID: 'UNPAID',         // recorded, awaiting selection into a payment request
  IN_REQUEST: 'IN_REQUEST', // in a DRAFT/SUBMITTED combo request
  APPROVED: 'APPROVED',     // request approved, awaiting payment confirmation
  PAID: 'PAID',
  VOID: 'VOID',
} as const
export const OPEN_LINE_STATUSES = [LINE_STATUS.UNPAID, LINE_STATUS.IN_REQUEST, LINE_STATUS.APPROVED]

// ── Combo payment request hooks ─────────────────────────────────────────────
// A recorded line is paid through a combo request item (line.comboItemId).
// Every hook below is a no-op for items with no linked line, so combo requests
// on non-restaurant accounts behave exactly as before.

const round2 = (n: number) => Math.round(n * 100) / 100
export const lineOutstanding = (l: { amount: unknown; paidAmount: unknown }) =>
  Math.max(0, round2(Number(l.amount) - Number(l.paidAmount)))

type ComboItemPayload = { expenseLineId?: string | null; estimatedAmount?: unknown }

/**
 * Validate the recorded lines a combo POST / draft PATCH wants to link,
 * before anything is written. `requestId` (draft edit) lets lines already in
 * this same request through. Returns an error message, or null if OK.
 */
export async function validateExpenseLinks(accountId: string, sections: { items?: ComboItemPayload[] }[], requestId?: string) {
  const items = sections.flatMap(s => s.items || []).filter(i => i.expenseLineId)
  if (items.length === 0) return null
  const ids = items.map(i => i.expenseLineId!)
  if (new Set(ids).size !== ids.length) return 'The same recorded expense was added twice'

  const account = await prisma.expenseAccounts.findUnique({ where: { id: accountId }, select: { businessId: true } })
  const lines = await prisma.restaurantExpenseLines.findMany({
    where: { id: { in: ids } },
    include: {
      transaction: { select: { businessId: true, voidedAt: true, payeeType: true, reference: true } },
      comboItem: { select: { requestId: true } },
    },
  })
  const byId = new Map(lines.map(l => [l.id, l]))
  for (const item of items) {
    const line = byId.get(item.expenseLineId!)
    if (!line || !account?.businessId || line.transaction.businessId !== account.businessId) {
      return 'A recorded expense does not belong to this account\'s business'
    }
    const label = `"${line.description}" (${line.transaction.reference})`
    if (line.transaction.voidedAt || line.status === LINE_STATUS.VOID) return `${label} has been voided`
    const inThisRequest = !!requestId && line.comboItem?.requestId === requestId
    if (line.status !== LINE_STATUS.UNPAID && !inThisRequest) return `${label} is already in another payment request`
    if (!line.transaction.payeeType) return `${label} needs a payee before it can be paid`
    if (!line.categoryId) return `${label} needs a category before it can be paid`
    if (Math.abs(Number(item.estimatedAmount ?? 0) - lineOutstanding(line)) > 0.005) {
      return `${label} must be requested for its outstanding amount ($${lineOutstanding(line).toFixed(2)})`
    }
  }
  return null
}

/** Link a recorded line to the combo item just created for it. Guarded, so a
 * line raced into another request fails the whole save. */
export async function linkExpenseLineTx(tx: any, lineId: string, comboItemId: string) {
  const { count } = await tx.restaurantExpenseLines.updateMany({
    where: { id: lineId, status: LINE_STATUS.UNPAID, comboItemId: null },
    data: { comboItemId, status: LINE_STATUS.IN_REQUEST },
  })
  if (count !== 1) throw new ExpenseLinkError('A recorded expense was just added to another payment request — reload and try again')
  // Permanent record on the item (survives a partial-payment release) — see sales-analytics
  await tx.comboPaymentRequestItems.update({ where: { id: comboItemId }, data: { restaurantExpenseLineId: lineId } })
}

export class ExpenseLinkError extends Error {}

/** Back to UNPAID, unlinked — for every line linked to this request's items
 * (cancel, expiry, and before a draft edit re-creates its items), or only to
 * the given items (unfunded on a partial approval). */
export async function releaseExpenseLinesTx(tx: any, where: { requestId: string } | { comboItemIds: string[] }) {
  const comboItem = 'requestId' in where ? { requestId: where.requestId } : { id: { in: where.comboItemIds } }
  if ('comboItemIds' in where && where.comboItemIds.length === 0) return
  await tx.restaurantExpenseLines.updateMany({
    where: { comboItem, status: { in: [LINE_STATUS.IN_REQUEST, LINE_STATUS.APPROVED] } },
    data: { comboItemId: null, status: LINE_STATUS.UNPAID },
  })
}

/** Request approved: its still-linked (funded) lines are APPROVED, awaiting payment. */
export async function approveExpenseLinesTx(tx: any, requestId: string) {
  await tx.restaurantExpenseLines.updateMany({
    where: { comboItem: { requestId }, status: LINE_STATUS.IN_REQUEST },
    data: { status: LINE_STATUS.APPROVED },
  })
}

/**
 * The requester marked a combo item paid: apply it to the linked line. Paid in
 * full → PAID (link kept as the payment record). Paid less than outstanding →
 * the paid part is recorded and the line goes back to UNPAID, unlinked, for
 * the remainder (plan Decision 1).
 */
export async function applyComboItemPaymentTx(tx: any, comboItemId: string, paid: number, now: Date) {
  const line = await tx.restaurantExpenseLines.findUnique({ where: { comboItemId } })
  if (!line) return
  const paidAmount = round2(Number(line.paidAmount) + paid)
  const settled = paidAmount >= Number(line.amount) - 0.005
  await tx.restaurantExpenseLines.update({
    where: { id: line.id },
    data: settled
      ? { paidAmount, paidAt: now, status: LINE_STATUS.PAID }
      : { paidAmount, paidAt: now, status: LINE_STATUS.UNPAID, comboItemId: null },
  })
}

/**
 * How much of a combo payment a linked item accounts for — what the reports
 * subtract so a recorded expense isn't counted on both its purchase date and
 * its payment date. Paid → the amount paid (none entered = approved, else
 * estimated, same as applyComboItemPaymentTx); not yet paid (`includeUnpaid`,
 * for views that count APPROVED payments) → its approved, else estimated, amount.
 */
type ComboItemAmounts = { isPaid: boolean; paidAmount: unknown; approvedAmount: unknown; estimatedAmount: unknown }
export const COMBO_ITEM_AMOUNTS_SELECT = { isPaid: true, paidAmount: true, approvedAmount: true, estimatedAmount: true } as const
export function linkedComboItemAmount(i: ComboItemAmounts, includeUnpaid = false): number {
  const planned = i.approvedAmount !== null && Number(i.approvedAmount) > 0 ? Number(i.approvedAmount) : Number(i.estimatedAmount ?? 0)
  if (i.isPaid) return i.paidAmount !== null && i.paidAmount !== undefined ? Number(i.paidAmount) : planned
  return includeUnpaid && !(i.approvedAmount !== null && Number(i.approvedAmount) === 0) ? planned : 0
}
