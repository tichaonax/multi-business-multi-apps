import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { calculateCashPosition } from '@/lib/cash-position/calculate-cash-position'

/**
 * GET /api/business/[businessId]/daily-detail?date=YYYY-MM-DD
 * Returns sales orders, expense payments, and cash set-aside activity for a
 * specific calendar day. `businessId` accepts a comma-separated list so the
 * homepage's per-business-type summary cards can drill into a combined view
 * across every business of that type, not just a single one.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId: businessIdParam } = await params
    const businessIds = businessIdParam.split(',').map(s => s.trim()).filter(Boolean)
    const businessId = businessIds[0]
    const date = request.nextUrl.searchParams.get('date') // YYYY-MM-DD

    if (!date) {
      return NextResponse.json({ error: 'date param required (YYYY-MM-DD)' }, { status: 400 })
    }

    // Use a wide UTC window (±1 day) and then filter by local date string,
    // matching exactly how the sales-analytics API assigns expenses to days.
    const timezone = request.nextUrl.searchParams.get('timezone') ||
      Intl.DateTimeFormat().resolvedOptions().timeZone

    const [y, m, d] = date.split('-').map(Number)
    // Widen the fetch window by ±1 day to capture any timezone offset,
    // then post-filter by local date string exactly like the chart does.
    const fetchStart = new Date(Date.UTC(y, m - 1, d - 1, 0, 0, 0, 0))
    const fetchEnd   = new Date(Date.UTC(y, m - 1, d + 1, 23, 59, 59, 999))

    // ── Sales orders ─────────────────────────────────────────────────────────
    const orders = await prisma.businessOrders.findMany({
      where: {
        businessId: { in: businessIds },
        status: 'COMPLETED',
        paymentMethod: { not: 'EXPENSE_ACCOUNT' },
        createdAt: { gte: fetchStart, lte: fetchEnd },
      },
      include: {
        employees: { select: { fullName: true } },
        creator: { select: { name: true } },
        businesses: { select: { name: true } },
        business_order_items: {
          include: {
            product_variants: {
              include: {
                business_products: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Post-filter to exactly the requested local date (mirrors sales-analytics grouping)
    const filteredOrders = orders.filter(o =>
      new Date(o.createdAt).toLocaleDateString('en-CA', { timeZone: timezone }) === date
    )

    const salesRows = filteredOrders.map(o => ({
      id: o.id,
      orderNumber: o.orderNumber,
      time: o.createdAt.toISOString(),
      amount: Number(o.totalAmount || 0),
      paymentMethod: o.paymentMethod ?? 'CASH',
      servedBy: o.employees?.fullName ?? o.creator?.name ?? null,
      businessName: businessIds.length > 1 ? (o as any).businesses?.name ?? null : null,
      items: o.business_order_items.map(i => {
        const attrs = i.attributes as Record<string, string> | null
        const productName = i.product_variants?.business_products?.name
          ?? attrs?.productName
          ?? 'Unknown'
        const variantName = i.product_variants?.name
        const label = variantName && variantName !== productName
          ? `${productName} – ${variantName}`
          : productName
        return { label, qty: i.quantity, unitPrice: Number(i.unitPrice || 0) }
      }),
    }))

    // ── Expense payments ──────────────────────────────────────────────────────
    const businessAccounts = await prisma.expenseAccounts.findMany({
      where: { businessId: { in: businessIds } },
      select: { id: true, businessId: true },
    })
    const accountIds = businessAccounts.map(a => a.id)
    const accountToBusinessName = new Map<string, string>()
    if (businessIds.length > 1) {
      const bizRows = await prisma.businesses.findMany({ where: { id: { in: businessIds } }, select: { id: true, name: true } })
      const bizNameMap = new Map(bizRows.map(b => [b.id, b.name]))
      for (const acc of businessAccounts) {
        if (acc.businessId) accountToBusinessName.set(acc.id, bizNameMap.get(acc.businessId) ?? '')
      }
    }

    const rawExpenses = accountIds.length > 0
      ? await prisma.expenseAccountPayments.findMany({
          where: {
            expenseAccountId: { in: accountIds },
            paymentDate: { gte: fetchStart, lte: fetchEnd },
            // Any genuinely-recorded expense, not just fully disbursed (PAID)
            // ones — matches /api/dashboard/daily-business-summary so the
            // dashboard badge and this drill-down never disagree. Excludes
            // only statuses meaning the expense didn't actually happen.
            status: { notIn: ['CANCELLED', 'REJECTED', 'REVERSED'] },
          },
          include: {
            category: { select: { name: true, emoji: true } },
            subcategory: { select: { name: true, emoji: true } },
            payeeEmployee: { select: { fullName: true } },
            payeeUser: { select: { name: true } },
            payeePerson: { select: { fullName: true } },
            payeeSupplier: { select: { name: true } },
            payeeBusiness: { select: { name: true } },
            creator: { select: { name: true } },
          },
          orderBy: { paymentDate: 'asc' },
        })
      : []

    // Post-filter expenses to exactly the requested local date
    const filteredExpenses = rawExpenses.filter(e =>
      new Date(e.paymentDate).toLocaleDateString('en-CA', { timeZone: timezone }) === date
    )

    const expenses = filteredExpenses.map(e => {
      const payeeName =
        e.payeeEmployee?.fullName ??
        e.payeeUser?.name ??
        e.payeePerson?.fullName ??
        e.payeeSupplier?.name ??
        e.payeeBusiness?.name ??
        null

      return {
        id: e.id,
        time: e.paymentDate.toISOString(),
        amount: Number(e.amount),
        payee: payeeName,
        description: e.notes || e.receiptReason || null,
        paymentChannel: e.paymentChannel ?? null,
        category: e.category ? `${e.category.emoji} ${e.category.name}`.trim() : null,
        subcategory: e.subcategory ? `${e.subcategory.emoji} ${e.subcategory.name}`.trim() : null,
        status: e.status ?? null,
        createdBy: e.creator?.name ?? null,
        businessName: businessIds.length > 1 ? (accountToBusinessName.get(e.expenseAccountId) ?? null) : null,
      }
    })

    // ── Set Aside (cash box allocations) ─────────────────────────────────────
    // Same CASH_ALLOCATION/PAYROLL_FUNDING definition calculateCashPosition
    // uses for its `setAside` figure, at the individual-entry level so this
    // report can show what those allocations actually were, not just a total.
    const setAsideEntries = await prisma.cashBucketEntry.findMany({
      where: {
        businessId: { in: businessIds },
        direction: 'OUTFLOW',
        entryType: { in: ['CASH_ALLOCATION', 'PAYROLL_FUNDING'] },
        paymentChannel: 'CASH',
        deletedAt: null,
        entryDate: { gte: fetchStart, lte: fetchEnd },
      },
      include: {
        business: { select: { name: true } },
        creator: { select: { name: true } },
      },
      orderBy: { entryDate: 'asc' },
    })
    const filteredSetAside = setAsideEntries.filter(e =>
      new Date(e.entryDate).toLocaleDateString('en-CA', { timeZone: timezone }) === date
    )
    const setAside = filteredSetAside.map(e => ({
      id: e.id,
      time: e.entryDate.toISOString(),
      amount: Number(e.amount),
      purpose: e.entryType === 'PAYROLL_FUNDING' ? 'Payroll' : (e.notes || 'Unspecified'),
      entryType: e.entryType,
      createdBy: (e as any).creator?.name ?? null,
      businessName: businessIds.length > 1 ? (e as any).business?.name ?? null : null,
    }))

    const totalSales = salesRows.reduce((s, o) => s + o.amount, 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
    const totalSetAside = setAside.reduce((s, e) => s + e.amount, 0)

    return NextResponse.json({
      success: true,
      date,
      summary: {
        totalSales,
        totalExpenses,
        totalSetAside,
        orderCount: salesRows.length,
        expenseCount: expenses.length,
        setAsideCount: setAside.length,
      },
      sales: salesRows,
      expenses,
      setAside,
    })
  } catch (error) {
    console.error('Error fetching daily detail:', error)
    return NextResponse.json({ error: 'Failed to fetch daily detail' }, { status: 500 })
  }
}
