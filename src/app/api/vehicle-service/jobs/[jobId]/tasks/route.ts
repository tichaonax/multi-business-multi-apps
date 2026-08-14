import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

// POST /api/vehicle-service/jobs/[jobId]/tasks
// Body: { subcategoryId, contractorId, customerPriceOverride?, workDescription? }
// The contractor must be active and specifically authorized for this service —
// their agreed fee for it is snapshotted onto the task so later rate changes
// don't retroactively alter jobs already in progress.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId } = await params
    const body = await request.json()
    const { subcategoryId, contractorId, customerPriceOverride, workDescription } = body as {
      subcategoryId?: string; contractorId?: string; customerPriceOverride?: number; workDescription?: string
    }
    if (!subcategoryId) return NextResponse.json({ error: 'subcategoryId is required' }, { status: 400 })
    if (!contractorId) return NextResponse.json({ error: 'contractorId is required' }, { status: 400 })

    const job = await prisma.vehicleServiceJobs.findUnique({ where: { id: jobId }, select: { businessId: true, status: true } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: job.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    if (job.status === 'billed' || job.status === 'cancelled') {
      return NextResponse.json({ error: `Cannot add tasks to a ${job.status} job` }, { status: 409 })
    }

    // The contractor must be active and specifically authorized (with a fee) for this service.
    const authorization = await prisma.vehicleServiceContractorServices.findUnique({
      where: { contractorId_subcategoryId: { contractorId, subcategoryId } },
      include: { contractor: { select: { businessId: true, status: true } } },
    })

    if (!authorization || !authorization.isActive) {
      return NextResponse.json({ error: 'This contractor is not authorized for the selected service' }, { status: 400 })
    }
    if (authorization.contractor.businessId !== job.businessId) {
      return NextResponse.json({ error: 'Contractor does not belong to this business' }, { status: 400 })
    }
    if (authorization.contractor.status !== 'active') {
      return NextResponse.json({ error: `Contractor is ${authorization.contractor.status} and cannot be assigned to new jobs` }, { status: 409 })
    }

    const task = await prisma.vehicleServiceTasks.create({
      data: {
        jobId,
        subcategoryId,
        contractorId,
        agreedFeeAmount: authorization.feeAmount,
        customerPriceOverride: customerPriceOverride !== undefined && customerPriceOverride !== null
          ? Number(customerPriceOverride)
          : null,
        workDescription: workDescription || null,
      },
      include: {
        subcategory: { select: { id: true, name: true, emoji: true } },
        contractor: { select: { id: true, persons: { select: { fullName: true } } } },
      },
    })

    return NextResponse.json({ success: true, task })
  } catch (error) {
    console.error('Add vehicle service task error:', error)
    return NextResponse.json({ error: 'Failed to add task' }, { status: 500 })
  }
}
