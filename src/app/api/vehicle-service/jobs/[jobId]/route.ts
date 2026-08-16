import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canViewFinancials } from '@/lib/vehicle-service/permissions'

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
        primaryContractor: { select: { id: true, persons: { select: { fullName: true, phone: true } } } },
        vehicleReleasedBy: { select: { id: true, name: true } },
        business_orders: { select: { orderNumber: true, paymentStatus: true, totalAmount: true } },
        tasks: {
          include: {
            subcategory: { select: { id: true, name: true, emoji: true } },
            contractor: { select: { id: true, persons: { select: { fullName: true } } } },
          },
          orderBy: { createdAt: 'asc' },
        },
        jobParts: {
          include: { productVariant: { select: { id: true, business_products: { select: { name: true } } } } },
        },
        partsRequests: {
          include: {
            contractor: { select: { id: true, persons: { select: { fullName: true } } } },
          },
          orderBy: { requestedAt: 'desc' },
        },
      },
    })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: job.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    const canSeeMoney = isSystemAdmin(user) || canViewFinancials(user, job.businessId)

    if (!canSeeMoney) {
      // Financial fields are stripped server-side, not merely hidden in the
      // UI — a user without canAccessFinancialData never receives labour
      // pricing, contractor pay, parts cost, or a total estimate (MBM-265).
      return NextResponse.json({
        job: {
          ...job,
          tasks: job.tasks.map(t => ({ ...t, agreedFeeAmount: undefined, customerLabourRate: undefined, customerPriceOverride: undefined })),
          jobParts: job.jobParts.map(jp => ({ ...jp, unitPrice: undefined })),
        },
      })
    }

    // Legacy tasks created before MBM-265 have no customerLabourRate snapshot —
    // fall back to the contractor fee they were originally billed at so an
    // in-progress job's total doesn't silently change underneath it.
    const labourTotal = job.tasks.reduce((sum, t) => sum + Number(t.customerPriceOverride ?? t.customerLabourRate ?? t.agreedFeeAmount), 0)
    const partsTotal = job.jobParts.reduce((sum, jp) => sum + Number(jp.unitPrice) * jp.quantity, 0)

    return NextResponse.json({
      job: { ...job, financials: { totalEstimatedCost: labourTotal + partsTotal } },
    })
  } catch (error) {
    console.error('Get vehicle service job error:', error)
    return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 })
  }
}

// PATCH /api/vehicle-service/jobs/[jobId]
// Body: { status?, customerId?, vehicleMake?, vehicleModel?, vehiclePlate?, vehicleVin?, notes?, primaryContractorId?, markPrinted?, markCardReturned?, releaseVehicle? }
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId } = await params
    const body = await request.json()
    const { status, customerId, vehicleMake, vehicleModel, vehiclePlate, vehicleVin, notes, primaryContractorId, markPrinted, markCardReturned, releaseVehicle } = body as {
      status?: string; customerId?: string; vehicleMake?: string; vehicleModel?: string
      vehiclePlate?: string; vehicleVin?: string; notes?: string; primaryContractorId?: string; markPrinted?: boolean; markCardReturned?: boolean; releaseVehicle?: boolean
    }

    const existing = await prisma.vehicleServiceJobs.findUnique({
      where: { id: jobId },
      select: {
        businessId: true, status: true, vehicleReleasedAt: true,
        business_orders: { select: { paymentStatus: true } },
      },
    })
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
      // "Billed" is a consequence of actually billing the job (see POST .../bill),
      // never a status a user picks directly — otherwise a job could show as
      // Billed with no invoice/order behind it at all.
      if (status === 'billed') {
        return NextResponse.json({ error: 'Billed is set automatically when the job is billed — use Bill This Job.' }, { status: 400 })
      }
      // Enforce the intended sequence: a job can't jump to Completed while
      // work is still outstanding, and can't be marked In Progress before any
      // task exists to actually be in progress.
      if (status === 'completed' || status === 'in_progress') {
        const tasks = await prisma.vehicleServiceTasks.findMany({ where: { jobId }, select: { status: true } })
        if (tasks.length === 0) {
          return NextResponse.json({ error: `Assign at least one task before marking the job ${status === 'completed' ? 'Completed' : 'In Progress'}` }, { status: 409 })
        }
        if (status === 'completed' && !tasks.every(t => t.status === 'completed')) {
          return NextResponse.json({ error: 'All tasks must be completed before marking the job Completed' }, { status: 409 })
        }
      }
    }

    if (releaseVehicle) {
      if (existing.status !== 'billed' || existing.business_orders?.paymentStatus !== 'PAID') {
        return NextResponse.json({ error: 'The vehicle can only be released once the job is billed and paid' }, { status: 409 })
      }
      if (existing.vehicleReleasedAt) {
        return NextResponse.json({ error: 'This vehicle has already been released' }, { status: 409 })
      }
    }

    if (primaryContractorId) {
      const contractor = await prisma.vehicleServiceContractors.findUnique({
        where: { id: primaryContractorId },
        select: { businessId: true, status: true },
      })
      if (!contractor || contractor.businessId !== existing.businessId) {
        return NextResponse.json({ error: 'Primary contractor not found for this business' }, { status: 400 })
      }
      if (contractor.status !== 'active') {
        return NextResponse.json({ error: `Selected primary contractor is ${contractor.status} and cannot take new jobs` }, { status: 400 })
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
        ...(primaryContractorId ? { primaryContractorId } : {}),
        ...(markPrinted ? { jobCardPrintedAt: new Date() } : {}),
        ...(markCardReturned ? { jobCardReturnedAt: new Date() } : {}),
        ...(releaseVehicle ? { vehicleReleasedAt: new Date(), vehicleReleasedById: user.id } : {}),
      },
    })

    return NextResponse.json({ success: true, job })
  } catch (error) {
    console.error('Update vehicle service job error:', error)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
