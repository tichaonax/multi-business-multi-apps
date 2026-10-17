/**
 * MBM-319 — flagged "restaurant expenses awaiting a payment request" notice.
 *
 * Salespeople record purchases on the POS; whoever raises payment requests
 * for that restaurant must keep seeing a flagged (🚨) notification until every
 * recorded expense has been put into a combo request (or voided). One grouped
 * notification per recipient per restaurant (emitGroupedNotification), so
 * repeats refresh one row instead of piling up:
 *   - raised immediately when a purchase is recorded or voided;
 *   - re-raised (back to unread) by the sweep whenever the pending set
 *     changes, or every REMIND_HOURS while it is still pending;
 *   - cleared for everyone once nothing is pending.
 * The sweep runs hourly (restaurant-expense-reminder-scheduler.ts) and lazily
 * (throttled) from GET /api/notifications, like the receipt reminders.
 */
import { prisma } from '@/lib/prisma'
import { emitGroupedNotification, clearGroupedNotifications } from '@/lib/notifications/notification-emitter'

const REMIND_HOURS = 4

export const restaurantExpenseGroupKey = (businessId: string) => `restaurant-expenses-pending:${businessId}`

/**
 * Who is expected to turn recorded expenses into payment requests: anyone
 * with a grant or request access on the restaurant's expense accounts, plus
 * the restaurant's active owners/managers (production restaurants often have
 * no explicit grants — the owner raises the requests).
 */
async function recipientsFor(businessId: string): Promise<string[]> {
  const [grants, access, members] = await Promise.all([
    prisma.expenseAccountGrants.findMany({
      where: { expenseAccount: { businessId, isActive: true } },
      select: { userId: true },
    }),
    prisma.expenseAccountUserAccess.findMany({
      where: { expenseAccount: { businessId, isActive: true }, isActive: true, canCreateRequests: true },
      select: { userId: true },
    }),
    prisma.businessMemberships.findMany({
      where: { businessId, isActive: true, role: { in: ['business-owner', 'business-manager'] } },
      select: { userId: true },
    }),
  ])
  const ids = Array.from(new Set([...grants, ...access, ...members].map(r => r.userId)))
  if (ids.length === 0) return []
  const active = await prisma.users.findMany({ where: { id: { in: ids }, isActive: true }, select: { id: true } })
  return active.map(u => u.id)
}

/** Raise / refresh / clear the notice for one restaurant. `force` re-raises even if nothing changed. */
export async function refreshRestaurantExpenseNotice(businessId: string, force = false): Promise<void> {
  try {
    const groupKey = restaurantExpenseGroupKey(businessId)
    const lines = await prisma.restaurantExpenseLines.findMany({
      where: { status: 'UNPAID', transaction: { businessId, voidedAt: null } },
      select: { amount: true, paidAmount: true, transaction: { select: { purchasedAt: true, expenseAccountId: true } } },
    })
    if (lines.length === 0) {
      await clearGroupedNotifications(groupKey)
      return
    }

    const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { name: true } })
    const total = lines.reduce((s, l) => s + Number(l.amount) - Number(l.paidAmount), 0)
    const oldest = lines.reduce((d, l) => (l.transaction.purchasedAt < d ? l.transaction.purchasedAt : d), lines[0].transaction.purchasedAt)
    const ageDays = Math.floor((Date.now() - oldest.getTime()) / (24 * 60 * 60 * 1000))
    const accountId = lines[0].transaction.expenseAccountId
    const signature = `${lines.length}:${total.toFixed(2)}`

    const title = `Restaurant expenses awaiting payment request — ${business?.name ?? 'Restaurant'}`
    const message =
      `🚨 ${lines.length} recorded item${lines.length === 1 ? '' : 's'} totalling $${total.toFixed(2)} ` +
      `${lines.length === 1 ? 'has' : 'have'} not been put into a payment request` +
      (ageDays > 0 ? ` (oldest ${ageDays} day${ageDays === 1 ? '' : 's'} ago)` : '') +
      `. Open a combo request and use "Add recorded expenses".`
    const linkUrl = `/expense-accounts/${accountId}/combo-requests/new`

    const recipients = await recipientsFor(businessId)
    const existing = await prisma.appNotification.findMany({
      where: { groupKey, userId: { in: recipients } },
      select: { userId: true, lastOccurredAt: true, metadata: true },
    })
    const byUser = new Map(existing.map(n => [n.userId, n]))
    const dueBefore = Date.now() - REMIND_HOURS * 60 * 60 * 1000

    for (const userId of recipients) {
      const prev = byUser.get(userId)
      const unchanged = (prev?.metadata as { signature?: string } | null)?.signature === signature
      const recent = !!prev?.lastOccurredAt && prev.lastOccurredAt.getTime() > dueBefore
      if (!force && prev && unchanged && recent) continue
      await emitGroupedNotification({
        userId,
        type: 'RESTAURANT_EXPENSES_PENDING',
        title,
        message,
        linkUrl,
        groupKey,
        metadata: { businessId, accountId, count: lines.length, total, signature },
      })
    }
  } catch (err) {
    // Non-critical — never break the caller
    console.error('[restaurant-expense-notify] refresh failed:', err)
  }
}

/** Every restaurant with recorded expenses, plus any with a stale notice to clear. */
export async function sweepRestaurantExpenseNotices(): Promise<number> {
  const [pending, notified] = await Promise.all([
    prisma.restaurantExpenseTransactions.findMany({
      where: { voidedAt: null, lines: { some: { status: 'UNPAID' } } },
      select: { businessId: true },
      distinct: ['businessId'],
    }),
    prisma.appNotification.findMany({
      where: { type: 'RESTAURANT_EXPENSES_PENDING' },
      select: { metadata: true },
    }),
  ])
  const ids = new Set(pending.map(p => p.businessId))
  for (const n of notified) {
    const id = (n.metadata as { businessId?: string } | null)?.businessId
    if (id) ids.add(id)
  }
  for (const businessId of ids) await refreshRestaurantExpenseNotice(businessId)
  return ids.size
}

let lastLazySweepAt = 0
const MIN_LAZY_SWEEP_INTERVAL_MS = 5 * 60 * 1000

/** Lazy trigger for GET /api/notifications — throttled, so a notice clears soon after the expenses are requested. */
export async function sweepRestaurantExpenseNoticesThrottled(): Promise<void> {
  if (Date.now() - lastLazySweepAt < MIN_LAZY_SWEEP_INTERVAL_MS) return
  lastLazySweepAt = Date.now()
  await sweepRestaurantExpenseNotices()
}

/** After recorded expenses are linked into (or released from) a combo request on this account. */
export async function refreshRestaurantExpenseNoticeForAccount(accountId: string): Promise<void> {
  const account = await prisma.expenseAccounts.findUnique({ where: { id: accountId }, select: { businessId: true } }).catch(() => null)
  if (account?.businessId) await refreshRestaurantExpenseNotice(account.businessId)
}
