import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { refreshRestaurantExpenseNotice } from '@/lib/restaurant-expense-notify'
import {
  checkRestaurantAccess, getDefaultExpenseAccount, itemNameKey, nextReference,
  payeeColumns, payeeRef, payeeKey, resolvePayeeInfo, LINE_STATUS, OPEN_LINE_STATUSES,
} from '@/lib/restaurant-expenses'

const MAX_LINES = 50

/**
 * POST /api/restaurant/expenses — MBM-319: record a purchase as an unpaid
 * expense. Body: { businessId, purchasedAt (ISO), payee?: {type,id}, notes?,
 *   lines: [{ itemId? | itemName?, amount }] }
 * Never checks funds and never creates a payment or a cashier request — the
 * lines wait in the unpaid queue until a requester puts them in a combo
 * payment request. Each line takes its item's classification (if any).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, payee, notes } = body
    const denied = await checkRestaurantAccess(user, businessId)
    if (denied) return denied

    const purchasedAt = body.purchasedAt ? new Date(body.purchasedAt) : new Date()
    if (isNaN(purchasedAt.getTime())) return NextResponse.json({ error: 'Invalid purchase date' }, { status: 400 })
    if (purchasedAt.getTime() > Date.now() + 5 * 60 * 1000) {
      return NextResponse.json({ error: 'Purchase date cannot be in the future' }, { status: 400 })
    }

    const rawLines: any[] = Array.isArray(body.lines) ? body.lines : []
    if (rawLines.length === 0) return NextResponse.json({ error: 'Add at least one item' }, { status: 400 })
    if (rawLines.length > MAX_LINES) return NextResponse.json({ error: `At most ${MAX_LINES} items per purchase` }, { status: 400 })
    for (const l of rawLines) {
      const amt = Number(l.amount)
      if (!(amt > 0)) return NextResponse.json({ error: 'Every item needs an amount greater than 0' }, { status: 400 })
      if (!l.itemId && !String(l.itemName || '').trim()) return NextResponse.json({ error: 'Every line needs an item' }, { status: 400 })
    }

    const account = await getDefaultExpenseAccount(businessId)
    if (!account) return NextResponse.json({ error: 'This restaurant has no active expense account' }, { status: 400 })

    // Reference date = the purchase date in the server's timezone (the
    // business's local time in production).
    const purchaseDateStr = purchasedAt.toLocaleDateString('en-CA')

    const create = () => prisma.$transaction(async (tx) => {
      // Resolve every line to a catalogue item (creating new ones by name).
      const resolved: { item: { id: string; name: string; categoryId: string | null; subcategoryId: string | null }; amount: number }[] = []
      for (const l of rawLines) {
        let item = l.itemId
          ? await tx.restaurantExpenseItems.findFirst({ where: { id: l.itemId, businessId } })
          : null
        if (!item) {
          const name = String(l.itemName || '').trim()
          if (!name) throw new Error('ITEM_NOT_FOUND')
          item = await tx.restaurantExpenseItems.upsert({
            where: { businessId_nameKey: { businessId, nameKey: itemNameKey(name) } },
            create: { businessId, name, nameKey: itemNameKey(name), createdBy: user.id },
            update: {},
          })
        }
        resolved.push({ item, amount: Math.round(Number(l.amount) * 100) / 100 })
      }

      const totalAmount = resolved.reduce((s, r) => s + r.amount, 0)
      const txn = await tx.restaurantExpenseTransactions.create({
        data: {
          businessId,
          expenseAccountId: account.id,
          reference: await nextReference(tx, purchaseDateStr),
          purchasedAt,
          ...payeeColumns(payee),
          totalAmount,
          notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
          createdBy: user.id,
          lines: {
            create: resolved.map((r, i) => ({
              itemId: r.item.id,
              description: r.item.name,
              amount: r.amount,
              categoryId: r.item.categoryId,
              subcategoryId: r.item.subcategoryId,
              status: LINE_STATUS.UNPAID,
              sortOrder: i,
            })),
          },
        },
        include: { lines: { orderBy: { sortOrder: 'asc' } } },
      })

      // Usage ranking for the POS dropdown.
      const now = new Date()
      for (const itemId of new Set(resolved.map(r => r.item.id))) {
        await tx.restaurantExpenseItems.update({
          where: { id: itemId },
          data: { useCount: { increment: resolved.filter(r => r.item.id === itemId).length }, lastUsedAt: now },
        })
      }
      return txn
    })

    // The reference sequence is count-based; retry if two saves collide.
    for (let attempt = 0; ; attempt++) {
      try {
        const txn = await create()
        // Flag it to whoever raises payment requests (non-blocking)
        refreshRestaurantExpenseNotice(businessId, true).catch(() => {})
        return NextResponse.json({ success: true, data: txn }, { status: 201 })
      } catch (err: any) {
        if (err?.code === 'P2002' && attempt < 4) continue
        if (err?.message === 'ITEM_NOT_FOUND') return NextResponse.json({ error: 'An item was not found' }, { status: 400 })
        throw err
      }
    }
  } catch (err) {
    console.error('[POST /api/restaurant/expenses]', err)
    return NextResponse.json({ error: 'Failed to record expense' }, { status: 500 })
  }
}

/**
 * GET /api/restaurant/expenses?businessId[&status=open|all][&start&end] —
 * MBM-319: recorded purchases with their lines. status=open (default) keeps
 * only lines still owed (UNPAID / IN_REQUEST / APPROVED) — the unpaid queue
 * and the Unpaid Expenses report. start/end (ISO) filter on the purchase
 * date. Each transaction carries its payee name (or null = not specified);
 * each line its classification, paid/outstanding amounts and the combo
 * request it is in, if any.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const params = request.nextUrl.searchParams
    // ?accountId= (combo request form): the account's business, or an empty
    // list when the account doesn't belong to a restaurant.
    let businessId = params.get('businessId')
    const accountId = params.get('accountId')
    if (accountId) {
      const account = await prisma.expenseAccounts.findUnique({
        where: { id: accountId },
        select: { businessId: true, business: { select: { type: true } } },
      })
      if (account?.business?.type !== 'restaurant') return NextResponse.json({ success: true, restaurant: false, data: [] })
      businessId = account.businessId
    }
    const denied = await checkRestaurantAccess(user, businessId)
    if (denied) return denied

    // open = still owed (queue/report); unpaid = awaiting selection only;
    // paid = fully paid (salesperson's "My purchases"); all
    const status = params.get('status') || 'open'
    // mine=1: only purchases this user recorded (MBM-322)
    const mineOnly = params.get('mine') === '1'
    const start = params.get('start') ? new Date(params.get('start')!) : null
    const end = params.get('end') ? new Date(params.get('end')!) : null
    const lineWhere = status === 'open' ? { status: { in: OPEN_LINE_STATUSES } }
      : status === 'unpaid' ? { status: LINE_STATUS.UNPAID }
      : status === 'paid' ? { status: LINE_STATUS.PAID }
      : {}

    const txns = await prisma.restaurantExpenseTransactions.findMany({
      where: {
        businessId: businessId!,
        voidedAt: null,
        ...(mineOnly ? { createdBy: user.id } : {}),
        ...(start || end ? { purchasedAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) } } : {}),
        lines: { some: lineWhere },
      },
      orderBy: [{ purchasedAt: 'desc' }, { createdAt: 'desc' }],
      take: 1000,
      include: {
        creator: { select: { id: true, name: true } },
        lines: {
          where: lineWhere,
          orderBy: { sortOrder: 'asc' },
          include: {
            category: { select: { id: true, name: true, emoji: true, domain: { select: { id: true, name: true, emoji: true } } } },
            subcategory: { select: { id: true, name: true, emoji: true } },
            comboItem: { select: { id: true, request: { select: { id: true, title: true, status: true, accountId: true, submittedAt: true, approvedAt: true, creator: { select: { name: true } } } } } },
          },
        },
      },
    })

    const refs = txns.map(t => payeeRef(t)).filter(Boolean) as { type: string; id: string }[]
    const payees = await resolvePayeeInfo(refs)

    const data = txns.map(t => {
      const ref = payeeRef(t)
      return {
        id: t.id,
        reference: t.reference,
        purchasedAt: t.purchasedAt,
        expenseAccountId: t.expenseAccountId,
        payee: ref ? { ...ref, name: payees.get(payeeKey(ref))?.name ?? 'Unknown payee', phone: payees.get(payeeKey(ref))?.phone ?? null } : null,
        notes: t.notes,
        totalAmount: Number(t.totalAmount),
        createdBy: t.creator,
        createdAt: t.createdAt,
        lines: t.lines.map(l => ({
          id: l.id,
          itemId: l.itemId,
          description: l.description,
          amount: Number(l.amount),
          paidAmount: Number(l.paidAmount),
          outstanding: Math.max(0, Math.round((Number(l.amount) - Number(l.paidAmount)) * 100) / 100),
          status: l.status,
          categoryId: l.categoryId,
          subcategoryId: l.subcategoryId,
          category: l.category,
          subcategory: l.subcategory,
          paidAt: l.paidAt,
          comboRequest: l.comboItem?.request
            ? { ...l.comboItem.request, creator: undefined, requestedBy: l.comboItem.request.creator?.name ?? null }
            : null,
        })),
      }
    })

    return NextResponse.json({ success: true, restaurant: true, businessId, data })
  } catch (err) {
    console.error('[GET /api/restaurant/expenses]', err)
    return NextResponse.json({ error: 'Failed to load expenses' }, { status: 500 })
  }
}
