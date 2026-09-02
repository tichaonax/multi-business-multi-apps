import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'
import { calculateSalesPeriodComparison } from '@/lib/sales-performance/calculate-sales-period-comparison'

/**
 * GET /api/dashboard/sales-period-comparison?businessIds=a,b,c&timezone=Africa/Harare
 *
 * Today/yesterday/day-before-yesterday sales totals + % deltas for a list of
 * businesses in one call — backs the Dashboard's "Today's Performance" cards
 * (see calculate-sales-period-comparison.ts for why this replaced 3N raw
 * per-business fetches) and is written to be reused by anything else that
 * needs the same comparison (the business-target feature's progress math).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const requestedIds = (searchParams.get('businessIds') || '').split(',').map((s) => s.trim()).filter(Boolean)
    const timezone = searchParams.get('timezone') || undefined

    if (requestedIds.length === 0) {
      return NextResponse.json({ error: 'businessIds is required' }, { status: 400 })
    }

    // Same eligibility rule the Dashboard already applies client-side before
    // requesting a business's figures — enforced here too so this endpoint
    // can't be used to read another business's sales by just passing its id.
    const admin = isSystemAdmin(user)
    const businessIds = requestedIds.filter(
      (id) => admin || hasPermission(user, 'canEnterManualOrders', id) || hasPermission(user, 'canAccessFinancialData', id)
    )

    if (businessIds.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const data = await calculateSalesPeriodComparison({ businessIds, timezone })
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Error computing sales period comparison:', error)
    return NextResponse.json({ error: 'Failed to compute sales period comparison' }, { status: 500 })
  }
}
