import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

// GET /api/vehicle-service/customers?businessId=
// Customers who have at least one vehicle-service job at this business —
// the "service customers" view for the Vehicle Service home page (see MBM-264).
//
// A customer's own BusinessCustomers row belongs to whichever business first
// registered them (its "home" business) — phone numbers uniquely identify a
// customer system-wide, so the SAME row is reused (not copied) when they're
// selected for a job at a different business. That means a service customer
// here may have a home record that lives at another business entirely, so this
// filters through the job's own businessId rather than the customer row's.
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

    const customers = await prisma.businessCustomers.findMany({
      where: { vehicle_service_jobs: { some: { businessId } } },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        customerNumber: true,
        businessId: true,
        totalSpent: true,
        loyaltyPoints: true,
        createdAt: true,
        businesses: { select: { id: true, name: true, type: true } },
        _count: { select: { business_orders: true } },
        vehicle_service_jobs: {
          where: { businessId },
          select: {
            id: true,
            vehicleMake: true,
            vehicleModel: true,
            vehiclePlate: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      customers: customers.map(c => {
        const vehicles = Array.from(
          new Map(
            c.vehicle_service_jobs
              .filter(j => j.vehicleMake || j.vehicleModel || j.vehiclePlate)
              .map(j => [j.vehiclePlate || `${j.vehicleMake}-${j.vehicleModel}`, { make: j.vehicleMake, model: j.vehicleModel, plate: j.vehiclePlate }])
          ).values()
        )
        const isFromOtherBusiness = c.businessId !== businessId
        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          customerNumber: c.customerNumber,
          vehicles,
          jobCount: c.vehicle_service_jobs.length,
          lastVisit: c.vehicle_service_jobs[0]?.createdAt ?? null,
          isFromOtherBusiness,
          homeBusinessId: isFromOtherBusiness ? c.businesses.id : null,
          homeBusinessName: isFromOtherBusiness ? c.businesses.name : null,
          homeBusinessType: isFromOtherBusiness ? c.businesses.type : null,
          customerSince: c.createdAt,
          totalOrders: c._count.business_orders,
          totalSpent: Number(c.totalSpent),
          loyaltyPoints: c.loyaltyPoints,
        }
      }),
    })
  } catch (error) {
    console.error('List vehicle service customers error:', error)
    return NextResponse.json({ error: 'Failed to list customers' }, { status: 500 })
  }
}
