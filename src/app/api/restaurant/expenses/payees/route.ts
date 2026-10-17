import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { checkRestaurantAccess, payeeRef, payeeKey, resolvePayeeNames } from '@/lib/restaurant-expenses'

const PAYEE_FIELDS = {
  payeeType: true, payeePersonId: true, payeeUserId: true,
  payeeEmployeeId: true, payeeBusinessId: true, payeeSupplierId: true,
} as const

/** GET /api/restaurant/expenses/payees?businessId — MBM-319: payees this
 * restaurant has used before, most-used first. Counts recorded expenses,
 * expense-account payments and combo request items/sections. */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const businessId = request.nextUrl.searchParams.get('businessId')
    const denied = await checkRestaurantAccess(user, businessId)
    if (denied) return denied

    const accounts = await prisma.expenseAccounts.findMany({ where: { businessId: businessId! }, select: { id: true } })
    const accountIds = accounts.map(a => a.id)

    const [recorded, payments, comboItems, comboSections] = await Promise.all([
      prisma.restaurantExpenseTransactions.findMany({
        where: { businessId: businessId!, voidedAt: null, payeeType: { not: null } },
        select: { ...PAYEE_FIELDS, createdAt: true },
      }),
      accountIds.length ? prisma.expenseAccountPayments.findMany({
        where: { expenseAccountId: { in: accountIds }, payeeType: { in: ['PERSON', 'USER', 'EMPLOYEE', 'BUSINESS', 'SUPPLIER'] } },
        select: { ...PAYEE_FIELDS, createdAt: true },
      }) : [],
      accountIds.length ? prisma.comboPaymentRequestItems.findMany({
        where: { request: { accountId: { in: accountIds } }, payeeType: { not: null } },
        select: { ...PAYEE_FIELDS, createdAt: true },
      }) : [],
      accountIds.length ? prisma.comboPaymentRequestSections.findMany({
        where: { request: { accountId: { in: accountIds } }, payeeType: { not: null } },
        select: { ...PAYEE_FIELDS, createdAt: true },
      }) : [],
    ])

    const usage = new Map<string, { type: string; id: string; count: number; lastUsedAt: Date }>()
    for (const r of [...recorded, ...payments, ...comboItems, ...comboSections]) {
      const ref = payeeRef(r)
      if (!ref) continue
      const key = payeeKey(ref)
      const u = usage.get(key)
      if (u) { u.count++; if (r.createdAt > u.lastUsedAt) u.lastUsedAt = r.createdAt }
      else usage.set(key, { ...ref, count: 1, lastUsedAt: r.createdAt })
    }

    const ranked = Array.from(usage.values())
      .sort((a, b) => b.count - a.count || b.lastUsedAt.getTime() - a.lastUsedAt.getTime())
      .slice(0, 200)
    const names = await resolvePayeeNames(ranked)
    const data = ranked
      .filter(p => names.has(payeeKey(p)))
      .map(p => ({ type: p.type, id: p.id, name: names.get(payeeKey(p))!, useCount: p.count }))

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('[GET /api/restaurant/expenses/payees]', err)
    return NextResponse.json({ error: 'Failed to load payees' }, { status: 500 })
  }
}
