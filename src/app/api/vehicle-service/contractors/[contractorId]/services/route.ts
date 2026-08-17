import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function canManage(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageEmployees
}

// POST /api/vehicle-service/contractors/[contractorId]/services
// Body: { subcategoryId, feeAmount }
// Authorizes the contractor to perform a specific service (a vehicle_service subcategory)
// at the given fee. Re-posting the same subcategoryId updates the fee.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const body = await request.json()
    const { subcategoryId, feeAmount } = body as { subcategoryId?: string; feeAmount?: number }

    if (!subcategoryId) return NextResponse.json({ error: 'subcategoryId is required' }, { status: 400 })
    if (feeAmount === undefined || feeAmount === null || isNaN(Number(feeAmount)) || Number(feeAmount) < 0) {
      return NextResponse.json({ error: 'feeAmount must be a non-negative number' }, { status: 400 })
    }

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      select: { businessId: true },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    if (!canManage(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const subcategory = await prisma.inventorySubcategories.findUnique({
      where: { id: subcategoryId },
      select: { id: true, name: true },
    })
    if (!subcategory) return NextResponse.json({ error: 'Service not found' }, { status: 404 })

    const service = await prisma.vehicleServiceContractorServices.upsert({
      where: { contractorId_subcategoryId: { contractorId, subcategoryId } },
      create: { contractorId, subcategoryId, feeAmount: Number(feeAmount), isActive: true },
      update: { feeAmount: Number(feeAmount), isActive: true },
      include: { subcategory: { select: { id: true, name: true, emoji: true } } },
    })

    return NextResponse.json({ success: true, service })
  } catch (error) {
    console.error('Add contractor service error:', error)
    return NextResponse.json({ error: 'Failed to authorize service' }, { status: 500 })
  }
}
