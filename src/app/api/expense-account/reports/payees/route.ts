import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { getPayeeAttributedAmounts } from '@/lib/expense-account/receipt-payee-attribution'

/**
 * GET /api/expense-account/reports/payees
 * System-wide payee analysis across all expense accounts
 *
 * Query params:
 * - startDate, endDate (optional)
 * - payeeType: EMPLOYEE | PERSON | BUSINESS | USER | ALL (default: ALL)
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
    const payeeType = searchParams.get('payeeType') || 'ALL'

    const where: any = { status: { not: 'REJECTED' } }
    // Not filtered by payeeType here anymore — a COMBO payment's own
    // receipts can resolve to any payee type, so every payment in range
    // must be fetched and attribution filtered afterward (see below).
    if (startDate || endDate) {
      where.paymentDate = {}
      if (startDate) where.paymentDate.gte = new Date(startDate)
      if (endDate) {
        // Use start of next day so the full endDate day is included
        const end = new Date(endDate)
        end.setDate(end.getDate() + 1)
        where.paymentDate.lt = end
      }
    }

    const payments = await prisma.expenseAccountPayments.findMany({ where, select: { id: true } })
    const attributed = await getPayeeAttributedAmounts(payments.map((p) => p.id))

    // Aggregate by payee — from each payment's receipt-level attribution
    // (falls back to the payment's own payee when it has no itemized
    // receipts yet), not the payment's single payee field.
    const payeeMap = new Map<string, any>()
    const typeMap = new Map<string, { payeeType: string; totalAmount: number; paymentCount: number }>()

    let totalPaid = 0

    for (const payees of attributed.values()) {
      for (const payee of payees) {
        if (!payee.payeeType) continue
        if (payeeType !== 'ALL' && payee.payeeType !== payeeType) continue

        const amount = payee.amount
        totalPaid += amount

        // FREEFORM payees have no stable id — key by name instead so repeat
        // receipts to the same one-off vendor still group together.
        const key = payee.payeeId ? `${payee.payeeType}-${payee.payeeId}` : `${payee.payeeType}-${payee.payeeName}`
        if (!payeeMap.has(key)) {
          payeeMap.set(key, { payeeType: payee.payeeType, payeeId: payee.payeeId, payeeName: payee.payeeName || 'Unknown', totalAmount: 0, paymentCount: 0 })
        }
        const entry = payeeMap.get(key)!
        entry.totalAmount += amount
        entry.paymentCount++

        if (!typeMap.has(payee.payeeType)) {
          typeMap.set(payee.payeeType, { payeeType: payee.payeeType, totalAmount: 0, paymentCount: 0 })
        }
        const typeEntry = typeMap.get(payee.payeeType)!
        typeEntry.totalAmount += amount
        typeEntry.paymentCount++
      }
    }

    const byPayee = Array.from(payeeMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)
    const byPayeeType = Array.from(typeMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)

    return NextResponse.json({
      success: true,
      data: {
        byPayee,
        byPayeeType,
        systemTotals: {
          totalPaid,
          uniquePayees: byPayee.length,
          topPayee: byPayee[0]?.payeeName || null,
        },
      },
    })
  } catch (error) {
    console.error('Error generating payee report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
