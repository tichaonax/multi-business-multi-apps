import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

const PART_DOMAIN_IDS = ['vsdom_parts', 'vsdom_workshop']

// GET /api/vehicle-service/contractor-portal/parts?search=
// Read-only "view available parts" for the logged-in contractor — no pricing
// exposed (contractors never see cost/selling prices, per the requirements
// doc), just enough to know what's in stock before typing a parts request.
// Auth mirrors every other contractor-portal route: a VehicleServiceContractors
// row linked to this user, not a BusinessMemberships row (contractors
// deliberately have none).
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { userId: user.id },
      select: { id: true, businessId: true },
    })
    if (!contractor) return NextResponse.json({ error: 'No contractor profile linked to this account' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || undefined

    const parts = await prisma.businessProducts.findMany({
      where: {
        businessId: contractor.businessId,
        businessType: 'vehicle_service',
        isActive: true,
        business_categories: { domainId: { in: PART_DOMAIN_IDS } },
        ...(search
          ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] }
          : {}),
      },
      select: {
        id: true,
        name: true,
        sku: true,
        business_categories: { select: { name: true, emoji: true } },
        product_variants: { select: { stockQuantity: true } },
        vehicle_part_compatibility: { select: { vehicleMake: true, vehicleModel: true } },
      },
      orderBy: { name: 'asc' },
      take: 25,
    })

    return NextResponse.json({
      parts: parts.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.business_categories ? `${p.business_categories.emoji || ''} ${p.business_categories.name}`.trim() : null,
        inStock: (p.product_variants[0]?.stockQuantity ?? 0) > 0,
        stockQuantity: p.product_variants[0]?.stockQuantity ?? 0,
        compatibility: p.vehicle_part_compatibility.map(c => [c.vehicleMake, c.vehicleModel].filter(Boolean).join(' ')),
      })),
    })
  } catch (error) {
    console.error('Contractor portal parts search error:', error)
    return NextResponse.json({ error: 'Failed to search parts' }, { status: 500 })
  }
}
