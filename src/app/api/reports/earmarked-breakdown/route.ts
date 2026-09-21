import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'
import { calculateSetAsideBreakdown } from '@/lib/cash-position/calculate-set-aside-breakdown'

/**
 * GET /api/reports/earmarked-breakdown?businessType=grocery
 *
 * Backs the "Earmarked" badge's drill-down — same unbounded, per-purpose
 * breakdown calculateSetAsideBreakdown() already produces for the Cash
 * Position card and its waterfall modal, filtered to whichever business
 * type the user clicked through from (or every accessible business when
 * omitted), and split out per-business so the report can be searched.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const businessTypeFilter = request.nextUrl.searchParams.get('businessType')

    let accessibleBusinesses: { id: string; name: string; type: string }[] = []
    if (isSystemAdmin(user)) {
      accessibleBusinesses = await prisma.businesses.findMany({
        where: { isActive: true, ...(businessTypeFilter ? { type: businessTypeFilter } : {}) },
        select: { id: true, name: true, type: true },
      })
    } else {
      const userBusinessIds = user.businessMemberships?.map(m => m.businessId) || []
      const all = userBusinessIds.length > 0
        ? await prisma.businesses.findMany({
            where: { id: { in: userBusinessIds }, isActive: true, ...(businessTypeFilter ? { type: businessTypeFilter } : {}) },
            select: { id: true, name: true, type: true },
          })
        : []
      accessibleBusinesses = all.filter(b => hasPermission(user, 'canAccessFinancialData', b.id))
    }

    const businessIds = accessibleBusinesses.map(b => b.id)
    const periodEnd = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Per-business breakdown so the report can show which business each
    // earmark belongs to — calculateSetAsideBreakdown groups by purpose
    // only, so it's called once per business and the business identity is
    // attached here.
    const perBusiness = await Promise.all(
      accessibleBusinesses.map(async (b) => {
        const rows = await calculateSetAsideBreakdown({ businessIds: [b.id], periodStart: new Date(0), periodEnd })
        return rows
          .filter(r => r.stillAvailable > 0.009)
          .map(r => ({
            businessId: b.id,
            businessName: b.name,
            businessType: b.type,
            purpose: r.purpose,
            entryType: r.entryType,
            lifetimeContributed: r.lifetimeContributed,
            lifetimeDisbursed: r.lifetimeDisbursed,
            stillAvailable: r.stillAvailable,
          }))
      })
    )

    const rows = perBusiness.flat().sort((a, b) => b.stillAvailable - a.stillAvailable)
    const total = rows.reduce((s, r) => s + r.stillAvailable, 0)

    return NextResponse.json({ success: true, businessType: businessTypeFilter, total, data: rows })
  } catch (error) {
    console.error('Error building earmarked breakdown:', error)
    return NextResponse.json({ success: false, error: 'Failed to load report' }, { status: 500 })
  }
}
