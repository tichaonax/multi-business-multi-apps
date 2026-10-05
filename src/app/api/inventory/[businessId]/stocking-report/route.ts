import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

type RouteContext = { params: Promise<{ businessId: string }> }

/**
 * GET /api/inventory/[businessId]/stocking-report
 *
 * Answers "what was stocked in this date range, what did it cost, and
 * what other expenses (transport, tolls, meals, etc.) landed in the same
 * window" — correlated by date range only, not a hard link, since no
 * single stocking-trip record exists to attach expenses to.
 *
 * Query params:
 *   from  YYYY-MM-DD  required
 *   to    YYYY-MM-DD  required
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    const { searchParams } = new URL(request.url)
    const fromStr = searchParams.get('from')
    const toStr = searchParams.get('to')

    if (!fromStr || !toStr) {
      return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
    }

    const fromDate = new Date(fromStr + 'T00:00:00.000Z')
    const toDate = new Date(toStr + 'T23:59:59.999Z')
    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }

    if (user.role?.toLowerCase() !== 'admin') {
      const membership = await prisma.businessMemberships.findFirst({
        where: { businessId, userId: user.id, isActive: true },
      })
      if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. Stocking events — real per-receipt history (date + quantity +
    // unit cost), not just the current stock-on-hand snapshot.
    const movements = await prisma.businessStockMovements.findMany({
      where: {
        businessId,
        movementType: 'PURCHASE_RECEIVED',
        createdAt: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        createdAt: true,
        quantity: true,
        unitCost: true,
        barcode_inventory_items: { select: { name: true, sku: true } },
        product_variants: {
          select: { name: true, sku: true, business_products: { select: { name: true } } },
        },
        business_products: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const stockingEvents = movements.map(m => {
      const productName =
        m.barcode_inventory_items?.name ??
        m.product_variants?.business_products?.name ??
        m.product_variants?.name ??
        m.business_products?.name ??
        'Unknown item'
      const sku = m.barcode_inventory_items?.sku ?? m.product_variants?.sku ?? null
      const unitCost = Number(m.unitCost ?? 0)
      const totalCost = unitCost * m.quantity
      return {
        id: m.id,
        date: m.createdAt.toISOString(),
        productName,
        sku,
        quantity: m.quantity,
        unitCost,
        totalCost,
      }
    })

    const stockingTotal = stockingEvents.reduce((sum, e) => sum + e.totalCost, 0)

    // Aggregate by product for the "how much was spent and on what" view.
    const byProductMap = new Map<string, { productName: string; sku: string | null; totalQuantity: number; totalCost: number }>()
    for (const e of stockingEvents) {
      const key = e.sku || e.productName
      const existing = byProductMap.get(key)
      if (existing) {
        existing.totalQuantity += e.quantity
        existing.totalCost += e.totalCost
      } else {
        byProductMap.set(key, { productName: e.productName, sku: e.sku, totalQuantity: e.quantity, totalCost: e.totalCost })
      }
    }
    const byProduct = Array.from(byProductMap.values()).sort((a, b) => b.totalCost - a.totalCost)

    // 2. Related expenses — all payments on this business's expense
    // account(s) in the same window, correlated by date only.
    const expenseAccounts = await prisma.expenseAccounts.findMany({
      where: { businessId },
      select: { id: true },
    })
    const expenseAccountIds = expenseAccounts.map(a => a.id)

    const payments = expenseAccountIds.length > 0
      ? await prisma.expenseAccountPayments.findMany({
          where: {
            expenseAccountId: { in: expenseAccountIds },
            status: { in: ['PAID', 'SUBMITTED', 'APPROVED'] },
            OR: [
              { paidAt: { gte: fromDate, lte: toDate } },
              { paidAt: null, paymentDate: { gte: fromDate, lte: toDate } },
            ],
          },
          select: {
            id: true,
            paymentDate: true,
            paidAt: true,
            amount: true,
            notes: true,
            category: { select: { name: true } },
            subcategory: { select: { name: true } },
            payeeUser: { select: { name: true } },
            payeeEmployee: { select: { fullName: true } },
            payeePerson: { select: { fullName: true } },
            payeeBusiness: { select: { name: true } },
            payeeSupplier: { select: { name: true } },
          },
          orderBy: { paymentDate: 'desc' },
        })
      : []

    const expenses = payments.map(p => {
      const payeeName =
        p.payeeUser?.name ??
        p.payeeEmployee?.fullName ??
        p.payeePerson?.fullName ??
        p.payeeBusiness?.name ??
        p.payeeSupplier?.name ??
        null
      return {
        id: p.id,
        date: (p.paidAt ?? p.paymentDate).toISOString(),
        category: p.category?.name ?? null,
        subcategory: p.subcategory?.name ?? null,
        payeeName,
        amount: Number(p.amount),
        notes: p.notes,
      }
    })

    const expensesTotal = expenses.reduce((sum, e) => sum + e.amount, 0)

    return NextResponse.json({
      success: true,
      period: { from: fromStr, to: toStr },
      stockingEvents,
      stockingTotal,
      byProduct,
      expenses,
      expensesTotal,
    })
  } catch (error: any) {
    console.error('[stocking-report GET]', error)
    return NextResponse.json({ error: 'Failed to generate stocking report' }, { status: 500 })
  }
}
