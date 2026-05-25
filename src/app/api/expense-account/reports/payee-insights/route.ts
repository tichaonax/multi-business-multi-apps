import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/expense-account/reports/payee-insights
 *
 * Two payee groups:
 *   CONTRACTOR = all PERSON type payments (individuals + contractors, same DB table)
 *   SUPPLIER   = all SUPPLIER type payments (businessSuppliers)
 *
 * Query params:
 * - startDate, endDate (optional ISO date strings)
 * - group: CONTRACTOR | SUPPLIER (default: CONTRACTOR)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canViewExpenseReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const group = (searchParams.get('group') || 'CONTRACTOR') as 'CONTRACTOR' | 'SUPPLIER'

    // Build date filter
    const dateFilter: any = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) {
      const end = new Date(endDate)
      end.setDate(end.getDate() + 1)
      dateFilter.lt = end
    }
    const baseWhere: any = { status: { not: 'REJECTED' } }
    if (Object.keys(dateFilter).length > 0) baseWhere.paymentDate = dateFilter

    // Fetch PERSON payments (all persons — individuals and contractors use same table)
    const personPayments = await prisma.expenseAccountPayments.findMany({
      where: { ...baseWhere, payeeType: 'PERSON' },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        payeePersonId: true,
        payeePerson: { select: { id: true, fullName: true, emoji: true, serviceType: true } },
        category: { select: { id: true, name: true, emoji: true } },
      },
    })

    // Fetch SUPPLIER payments
    const supplierPayments = await prisma.expenseAccountPayments.findMany({
      where: { ...baseWhere, payeeType: 'SUPPLIER' },
      select: {
        id: true,
        amount: true,
        paymentDate: true,
        payeeSupplierId: true,
        payeeSupplier: { select: { id: true, name: true, emoji: true, businessId: true } },
        category: { select: { id: true, name: true, emoji: true } },
      },
    })

    type NormPayment = {
      id: string
      amount: any
      paymentDate: Date
      category: { id: string; name: string; emoji: string } | null
      payeeId: string | null
      payeeName: string | null
      payeeEmoji: string | null
      payeeServiceType: string | null
      payeeBusinessId: string | null
    }

    function aggregate(payments: NormPayment[]) {
      let totalPaid = 0
      const payeeMap = new Map<string, { payeeId: string; payeeName: string; payeeEmoji: string | null; serviceType: string | null; businessId: string | null; totalPaid: number; paymentCount: number; lastPayment: string }>()
      const monthMap = new Map<string, { month: string; label: string; totalPaid: number; paymentCount: number }>()
      const catMap = new Map<string, { categoryId: string; categoryName: string; emoji: string; totalPaid: number; paymentCount: number }>()

      for (const p of payments) {
        const amount = Number(p.amount)
        totalPaid += amount

        const pid = p.payeeId || 'unknown'
        if (!payeeMap.has(pid)) payeeMap.set(pid, { payeeId: pid, payeeName: p.payeeName || 'Unknown', payeeEmoji: p.payeeEmoji || null, serviceType: p.payeeServiceType || null, businessId: p.payeeBusinessId || null, totalPaid: 0, paymentCount: 0, lastPayment: '' })
        const pe = payeeMap.get(pid)!
        pe.totalPaid += amount
        pe.paymentCount++
        const ds = p.paymentDate.toISOString()
        if (!pe.lastPayment || ds > pe.lastPayment) pe.lastPayment = ds

        const d = p.paymentDate
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!monthMap.has(monthKey)) monthMap.set(monthKey, { month: monthKey, label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), totalPaid: 0, paymentCount: 0 })
        const me = monthMap.get(monthKey)!
        me.totalPaid += amount
        me.paymentCount++

        const catId = p.category?.id || 'uncategorized'
        if (!catMap.has(catId)) catMap.set(catId, { categoryId: catId, categoryName: p.category?.name || 'Uncategorized', emoji: p.category?.emoji || '📁', totalPaid: 0, paymentCount: 0 })
        const ce = catMap.get(catId)!
        ce.totalPaid += amount
        ce.paymentCount++
      }

      const allPayees = Array.from(payeeMap.values()).sort((a, b) => b.totalPaid - a.totalPaid)
      return {
        totalPaid,
        paymentCount: payments.length,
        uniquePayees: allPayees.length,
        allPayees,
        topPayees: allPayees.slice(0, 10),
        monthlyTrend: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
        categoryBreakdown: Array.from(catMap.values()).sort((a, b) => b.totalPaid - a.totalPaid).slice(0, 10),
      }
    }

    const contractorNorm: NormPayment[] = personPayments.map((p) => ({
      id: p.id, amount: p.amount, paymentDate: p.paymentDate, category: p.category,
      payeeId: p.payeePerson?.id || null, payeeName: p.payeePerson?.fullName || null,
      payeeEmoji: (p.payeePerson as any)?.emoji || null,
      payeeServiceType: (p.payeePerson as any)?.serviceType || null,
      payeeBusinessId: null,
    }))

    const supplierNorm: NormPayment[] = supplierPayments.map((p) => ({
      id: p.id, amount: p.amount, paymentDate: p.paymentDate, category: p.category,
      payeeId: p.payeeSupplier?.id || null, payeeName: p.payeeSupplier?.name || null,
      payeeEmoji: (p.payeeSupplier as any)?.emoji || null,
      payeeServiceType: null,
      payeeBusinessId: (p.payeeSupplier as any)?.businessId || null,
    }))

    const conAgg = aggregate(contractorNorm)
    const supAgg = aggregate(supplierNorm)

    const groupTotals = [
      { group: 'CONTRACTOR', totalPaid: conAgg.totalPaid, paymentCount: conAgg.paymentCount, uniquePayees: conAgg.uniquePayees },
      { group: 'SUPPLIER',   totalPaid: supAgg.totalPaid, paymentCount: supAgg.paymentCount, uniquePayees: supAgg.uniquePayees },
    ]

    const activeAgg = group === 'SUPPLIER' ? supAgg : conAgg

    return NextResponse.json({
      success: true,
      data: {
        groupTotals,
        topPayees: activeAgg.topPayees,
        monthlyTrend: activeAgg.monthlyTrend,
        categoryBreakdown: activeAgg.categoryBreakdown,
        allPayees: activeAgg.allPayees,
      },
    })
  } catch (error) {
    console.error('Error generating payee insights report:', error)
    return NextResponse.json({ error: 'Failed to generate payee insights report' }, { status: 500 })
  }
}
