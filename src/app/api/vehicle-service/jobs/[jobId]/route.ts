import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

const VALID_JOB_STATUSES = ['open', 'in_progress', 'completed', 'billed', 'cancelled']

// GET /api/vehicle-service/jobs/[jobId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId } = await params
    const job = await prisma.vehicleServiceJobs.findUnique({
      where: { id: jobId },
      include: {
        business_customers: { select: { id: true, name: true, phone: true } },
        tasks: {
          include: {
            subcategory: { select: { id: true, name: true, emoji: true } },
            contractor: { select: { id: true, persons: { select: { fullName: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: job.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    return NextResponse.json({ job })
  } catch (error) {
    console.error('Get vehicle service job error:', error)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

// PATCH /api/vehicle-service/jobs/[jobId]
// Body: { status?, customerId?, vehicleMake?, vehicleModel?, vehiclePlate?, vehicleVin?, notes? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId } = await params
    const body = await request.json()
    const { status, customerId, vehicleMake, vehicleModel, vehiclePlate, vehicleVin, notes } = body as {
      status?: string; customerId?: string; vehicleMake?: string; vehicleModel?: string
      vehiclePlate?: string; vehicleVin?: string; notes?: string
    }

    const existing = await prisma.vehicleServiceJobs.findUnique({ where: { id: jobId }, select: { businessId: true, status: true } })
    if (!existing) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: existing.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    if (status) {
      if (!VALID_JOB_STATUSES.includes(status)) {
        return NextResponse.json({ error: `status must be one of ${VALID_JOB_STATUSES.join(', ')}` }, { status: 400 })
      }
      if (existing.status === 'billed') {
        return NextResponse.json({ error: 'A billed job cannot be changed. Manage the order from Receipt History instead.' }, { status: 409 })
      }
    }

    const job = await prisma.vehicleServiceJobs.update({
      where: { id: jobId },
      data: {
        ...(status ? { status } : {}),
        ...(customerId !== undefined ? { customerId: customerId || null } : {}),
        ...(vehicleMake !== undefined ? { vehicleMake: vehicleMake || null } : {}),
        ...(vehicleModel !== undefined ? { vehicleModel: vehicleModel || null } : {}),
        ...(vehiclePlate !== undefined ? { vehiclePlate: vehiclePlate || null } : {}),
        ...(vehicleVin !== undefined ? { vehicleVin: vehicleVin || null } : {}),
        ...(notes !== undefined ? { notes: notes || null } : {}),
      },
    })

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Update vehicle service job error:', error)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
