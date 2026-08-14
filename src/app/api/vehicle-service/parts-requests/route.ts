import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions, isSystemAdmin } from '@/lib/permission-utils'

function canManageInventory(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageInventory
}

// GET /api/vehicle-service/parts-requests?businessId=&status=
// Inventory Department queue — reuses the existing canManageInventory permission,
// no new permission flag needed.
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')
    const status = searchParams.get('status') || undefined
    if (!businessId) return NextResponse.json({ error: 'businessId is required' }, { status: 400 })

    if (!isSystemAdmin(user) && !canManageInventory(user, businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const requests = await prisma.vehicleServicePartsRequests.findMany({
      where: { job: { businessId }, ...(status ? { status } : {}) },
      select: {
        id: true,
        description: true,
        quantity: true,
        status: true,
        requestedAt: true,
        rejectionReason: true,
        issuedQuantity: true,
        issuedAt: true,
        contractor: { select: { id: true, persons: { select: { fullName: true } } } },
        job: { select: { id: true, vehicleMake: true, vehicleModel: true, vehiclePlate: true } },
        productVariant: { select: { id: true, sku: true, business_products: { select: { name: true } } } },
      },
      orderBy: { requestedAt: 'asc' },
    })

    return NextResponse.json({
      requests: requests.map(r => ({
        id: r.id,
        description: r.description,
        quantity: r.quantity,
        status: r.status,
        requestedAt: r.requestedAt,
        rejectionReason: r.rejectionReason,
        issuedQuantity: r.issuedQuantity,
        issuedAt: r.issuedAt,
        contractorName: r.contractor.persons.fullName,
        jobId: r.job.id,
        vehicle: [r.job.vehicleMake, r.job.vehicleModel].filter(Boolean).join(' ') || null,
        vehiclePlate: r.job.vehiclePlate,
        issuedProductName: r.productVariant?.business_products?.name ?? null,
      })),
    })
  } catch (error) {
    console.error('List parts requests error:', error)
    return NextResponse.json({ error: 'Failed to list parts requests' }, { status: 500 })
  }
}
