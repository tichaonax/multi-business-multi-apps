import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getPayeeAttributedAmounts } from '@/lib/expense-account/receipt-payee-attribution'

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

    // Fetch every non-rejected payment in range, any payeeType — a payment's
    // money may have gone to several real payees via its own receipts (see
    // getPayeeAttributedAmounts), not just whichever single payee sits on
    // the payment row itself (e.g. a COMBO payment split across vendors).
    const allPayments = await prisma.expenseAccountPayments.findMany({
      where: baseWhere,
      select: { id: true, paymentDate: true, category: { select: { id: true, name: true, emoji: true } } },
    })
    const paymentMeta = new Map(allPayments.map((p) => [p.id, p]))
    const attributed = await getPayeeAttributedAmounts(allPayments.map((p) => p.id))

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

    const contractorNorm: NormPayment[] = []
    const supplierNorm: NormPayment[] = []
    const personIds = new Set<string>()
    const supplierIds = new Set<string>()
    for (const [paymentId, payees] of attributed) {
      const meta = paymentMeta.get(paymentId)
      if (!meta) continue
      for (const payee of payees) {
        const norm: NormPayment = {
          id: paymentId, amount: payee.amount, paymentDate: meta.paymentDate, category: meta.category,
          payeeId: payee.payeeId, payeeName: payee.payeeName, payeeEmoji: null, payeeServiceType: null, payeeBusinessId: null,
        }
        if (payee.payeeType === 'PERSON' && payee.payeeId) {
          personIds.add(payee.payeeId)
          contractorNorm.push(norm)
        } else if (payee.payeeType === 'SUPPLIER' && payee.payeeId) {
          supplierIds.add(payee.payeeId)
          supplierNorm.push(norm)
        }
      }
    }

    // Enrich with the emoji/serviceType/businessId metadata the aggregate()
    // payee cards display — not part of the generic attribution helper.
    const [personMetaRows, supplierMetaRows] = await Promise.all([
      personIds.size > 0 ? prisma.persons.findMany({ where: { id: { in: [...personIds] } }, select: { id: true, emoji: true, serviceType: true } }) : Promise.resolve([]),
      supplierIds.size > 0 ? prisma.businessSuppliers.findMany({ where: { id: { in: [...supplierIds] } }, select: { id: true, emoji: true, businessId: true } }) : Promise.resolve([]),
    ])
    const personMetaMap = new Map(personMetaRows.map((p) => [p.id, p]))
    const supplierMetaMap = new Map(supplierMetaRows.map((s) => [s.id, s]))
    for (const n of contractorNorm) {
      const m = n.payeeId ? personMetaMap.get(n.payeeId) : null
      if (m) { n.payeeEmoji = m.emoji; n.payeeServiceType = m.serviceType }
    }
    for (const n of supplierNorm) {
      const m = n.payeeId ? supplierMetaMap.get(n.payeeId) : null
      if (m) { n.payeeEmoji = m.emoji; n.payeeBusinessId = m.businessId }
    }

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
