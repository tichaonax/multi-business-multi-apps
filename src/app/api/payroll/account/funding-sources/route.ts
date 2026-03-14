import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

/**
 * GET /api/payroll/account/funding-sources
 * Returns all businesses with their current cash box balance (INFLOW - OUTFLOW).
 * Only businesses with balance > 0 are returned.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canMakeExpensePayments && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // Get all non-umbrella businesses
    const businesses = await prisma.businesses.findMany({
      where: { isUmbrellaBusiness: false },
      select: { id: true, name: true, type: true },
    })

    // Compute cashbox balance per business from CashBucketEntry ledger
    const bucketTotals = await prisma.cashBucketEntry.groupBy({
      by: ['businessId', 'direction'],
      _sum: { amount: true },
    })

    const accounts = businesses
      .map((b) => {
        const inflow = Number(
          bucketTotals.find((r) => r.businessId === b.id && r.direction === 'INFLOW')?._sum.amount ?? 0
        )
        const outflow = Number(
          bucketTotals.find((r) => r.businessId === b.id && r.direction === 'OUTFLOW')?._sum.amount ?? 0
        )
        const balance = Math.round((inflow - outflow) * 100) / 100
        return {
          id: b.id,
          accountName: `${b.name} Cash Box`,
          accountNumber: b.id,
          balance,
          businessId: b.id,
          business: { id: b.id, name: b.name, type: b.type ?? '' },
        }
      })
      .filter((a) => a.balance > 0)
      .sort((a, b) => b.balance - a.balance)

    return NextResponse.json({ success: true, data: { accounts } })
  } catch (error) {
    console.error('Error fetching payroll funding sources:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
