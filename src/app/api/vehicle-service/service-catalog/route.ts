import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canViewFinancials } from '@/lib/vehicle-service/permissions'

// GET /api/vehicle-service/service-catalog?businessId=
// Returns only the "Vehicle Services" domain (labour/service subcategories) — not
// the Parts/Care/Fleet domains — since this powers pickers for "what service is
// this?" (contractor authorization, task assignment), not "what part is this?".
// Requires business membership, consistent with every other vehicle-service endpoint —
// contractors (no memberships) are correctly denied.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    // Labour rates are financial data — only fetched (and only ever included in
    // the response) for users authorised to see money, never merely hidden
    // client-side. Everyone else still gets the full category/service tree so
    // task creation itself keeps working for them.
    const showRates = isSystemAdmin(user) || canViewFinancials(user, businessId)

    const [categories, rates] = await Promise.all([
      prisma.businessCategories.findMany({
        where: {
          businessType: 'vehicle_service',
          businessId: null,
          isActive: true,
          domain: { name: 'Vehicle Services' },
        },
        select: {
          id: true,
          name: true,
          emoji: true,
          inventory_subcategories: {
            select: { id: true, name: true, emoji: true },
            orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
          },
        },
        orderBy: { name: 'asc' },
      }),
      showRates
        ? prisma.vehicleServiceLabourRates.findMany({
            where: { businessId, isActive: true },
            select: { subcategoryId: true, customerRate: true },
          })
        : Promise.resolve([]),
    ])

    const rateBySubcategory = new Map(rates.map(r => [r.subcategoryId, Number(r.customerRate)]))

    return NextResponse.json({
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        emoji: c.emoji,
        services: c.inventory_subcategories.map(s => ({
          ...s,
          customerRate: rateBySubcategory.get(s.id) ?? null,
        })),
      })),
    })
  } catch (error) {
    console.error('Vehicle service catalog error:', error)
    return NextResponse.json({ error: 'Failed to load service catalog' }, { status: 500 })
  }
}
