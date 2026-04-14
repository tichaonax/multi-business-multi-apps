import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * GET /api/business/[businessId]/daily-detail?date=YYYY-MM-DD
 * Returns sales orders and expense payments for a specific calendar day.
 * Used by the daily-detail drill-down from the Daily Sales chart.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
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
        businessId,
        status: 'COMPLETED',
        paymentMethod: { not: 'EXPENSE_ACCOUNT' },
        createdAt: { gte: fetchStart, lte: fetchEnd },
      },
      include: {
        employees: { select: { fullName: true } },
        creator: { select: { name: true } },
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
      items: o.business_order_items.map(i => {
        const productName = i.product_variants?.business_products?.name ?? 'Unknown'
        const variantName = i.product_variants?.name
        const label = variantName && variantName !== productName
          ? `${productName} – ${variantName}`
          : productName
        return { label, qty: i.quantity, unitPrice: Number(i.unitPrice || 0) }
      }),
    }))

    // ── Expense payments ──────────────────────────────────────────────────────
    const businessAccounts = await prisma.expenseAccounts.findMany({
      where: { businessId },
      select: { id: true },
    })
    const accountIds = businessAccounts.map(a => a.id)

    const rawExpenses = accountIds.length > 0
      ? await prisma.expenseAccountPayments.findMany({
          where: {
            expenseAccountId: { in: accountIds },
            paymentDate: { gte: fetchStart, lte: fetchEnd },
            status: 'PAID',
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
      }
    })

    const totalSales = salesRows.reduce((s, o) => s + o.amount, 0)
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

    return NextResponse.json({
      success: true,
      date,
      summary: {
        totalSales,
        totalExpenses,
        orderCount: salesRows.length,
        expenseCount: expenses.length,
      },
      sales: salesRows,
      expenses,
    })
  } catch (error) {
    console.error('Error fetching daily detail:', error)
    return NextResponse.json({ error: 'Failed to fetch daily detail' }, { status: 500 })
  }
}
