import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

function canManage(user: any, businessId: string) {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canManageEmployees
}

// POST /api/vehicle-service/contractors/[contractorId]/skills
// Body: { name, certification?, issuedDate?, expiryDate? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contractorId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { contractorId } = await params
    const body = await request.json()
    const { name, certification, issuedDate, expiryDate } = body as {
      name?: string; certification?: string; issuedDate?: string; expiryDate?: string
    }
    if (!name || !name.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { id: contractorId },
      select: { businessId: true },
    })
    if (!contractor) return NextResponse.json({ error: 'Contractor not found' }, { status: 404 })
    if (!canManage(user, contractor.businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const skill = await prisma.vehicleServiceContractorSkills.create({
      data: {
        contractorId,
        name: name.trim(),
        certification: certification || null,
        issuedDate: issuedDate ? new Date(issuedDate) : null,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
      },
    })

    return NextResponse.json({ success: true, skill })
  } catch (error) {
    console.error('Add contractor skill error:', error)
    return NextResponse.json({ error: 'Failed to add skill' }, { status: 500 })
  }
}
