import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canViewFinancials } from '@/lib/vehicle-service/permissions'

// GET /api/vehicle-service/labour-rates?businessId=
// Every "Vehicle Services" domain category/service (same shape as service-catalog),
// each service annotated with its current customer labour rate (null if unconfigured).
// This is the read side of the central labour-cost configuration screen.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user) && !canViewFinancials(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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
      prisma.vehicleServiceLabourRates.findMany({
        where: { businessId, isActive: true },
        select: { subcategoryId: true, customerRate: true },
      }),
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
    console.error('Labour rates list error:', error)
    return NextResponse.json({ error: 'Failed to load labour rates' }, { status: 500 })
  }
}

// POST /api/vehicle-service/labour-rates
// Body: { businessId, subcategoryId, customerRate }
// Sets (or updates) the default customer labour charge for a service at this
// business. This is the write side of the central labour-cost configuration
// screen, and is also called inline from Add Task the first time a service
// with no configured rate is used.
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { businessId, subcategoryId, customerRate } = body as {
      businessId?: string; subcategoryId?: string; customerRate?: number
    }
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    if (!subcategoryId) return NextResponse.json({ error: 'subcategoryId is required' }, { status: 400 })
    if (customerRate === undefined || customerRate === null || isNaN(Number(customerRate)) || Number(customerRate) < 0) {
      return NextResponse.json({ error: 'customerRate must be a non-negative number' }, { status: 400 })
    }

    if (!isSystemAdmin(user) && !canViewFinancials(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const subcategory = await prisma.inventorySubcategories.findUnique({
      where: { id: subcategoryId },
      select: { id: true, name: true, emoji: true },
    })
    if (!subcategory) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const rate = await prisma.vehicleServiceLabourRates.upsert({
      where: { businessId_subcategoryId: { businessId, subcategoryId } },
      create: { businessId, subcategoryId, customerRate: Number(customerRate), createdBy: user.id },
      update: { customerRate: Number(customerRate), isActive: true },
    })

    return NextResponse.json({ success: true, rate: { ...rate, customerRate: Number(rate.customerRate), subcategory } })
  } catch (error) {
    console.error('Set labour rate error:', error)
    return NextResponse.json({ error: 'Failed to set labour rate' }, { status: 500 })
  }
}
