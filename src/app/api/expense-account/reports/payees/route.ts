import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

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

    const where: any = { status: 'SUBMITTED' }
    if (payeeType !== 'ALL') where.payeeType = payeeType
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

    const payments = await prisma.expenseAccountPayments.findMany({
      where,
      select: {
        id: true,
        amount: true,
        payeeType: true,
        payeeUserId: true,
        payeeEmployeeId: true,
        payeePersonId: true,
        payeeBusinessId: true,
        payeeUser: { select: { id: true, name: true } },
        payeeEmployee: { select: { id: true, fullName: true } },
        payeePerson: { select: { id: true, fullName: true } },
        payeeBusiness: { select: { id: true, name: true } },
      },
    })

    // Aggregate by payee
    const payeeMap = new Map<string, any>()
    const typeMap = new Map<string, { payeeType: string; totalAmount: number; paymentCount: number }>()

    let totalPaid = 0

    payments.forEach((p) => {
      let payeeId: string | null = null
      let payeeName: string = 'Unknown'

      if (p.payeeType === 'USER' && p.payeeUser) {
        payeeId = p.payeeUser.id
        payeeName = p.payeeUser.name
      } else if (p.payeeType === 'EMPLOYEE' && p.payeeEmployee) {
        payeeId = p.payeeEmployee.id
        payeeName = p.payeeEmployee.fullName
      } else if (p.payeeType === 'PERSON' && p.payeePerson) {
        payeeId = p.payeePerson.id
        payeeName = p.payeePerson.fullName
      } else if (p.payeeType === 'BUSINESS' && p.payeeBusiness) {
        payeeId = p.payeeBusiness.id
        payeeName = p.payeeBusiness.name
      } else {
        return
      }

      const amount = Number(p.amount)
      totalPaid += amount

      // Per-payee
      const key = `${p.payeeType}-${payeeId}`
      if (!payeeMap.has(key)) {
        payeeMap.set(key, { payeeType: p.payeeType, payeeId, payeeName, totalAmount: 0, paymentCount: 0 })
      }
      const entry = payeeMap.get(key)!
      entry.totalAmount += amount
      entry.paymentCount++

      // Per-type
      if (!typeMap.has(p.payeeType)) {
        typeMap.set(p.payeeType, { payeeType: p.payeeType, totalAmount: 0, paymentCount: 0 })
      }
      const typeEntry = typeMap.get(p.payeeType)!
      typeEntry.totalAmount += amount
      typeEntry.paymentCount++
    })

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
