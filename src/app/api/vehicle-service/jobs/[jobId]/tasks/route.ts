import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canViewFinancials } from '@/lib/vehicle-service/permissions'

// POST /api/vehicle-service/jobs/[jobId]/tasks
// Body: { subcategoryId, contractorId, customerPriceOverride?, customerRate?, workDescription?, contractorFeeOverride? }
// The contractor must be active and specifically authorized for this service —
// their agreed fee for it is snapshotted onto the task so later rate changes
// don't retroactively alter jobs already in progress. Separately, the customer
// labour charge is snapshotted from the central VehicleServiceLabourRates config
// for this business+service — a genuinely different amount from the contractor's
// fee (see MBM-265). If no rate is configured yet, a financially-authorised
// caller must supply `customerRate`, which both prices this task and becomes
// the new default for the service going forward.
// If the job is flagged `waiveLabor` (a rework job — MBM-267), the customer
// charge is forced to $0 regardless of any configured/submitted rate — no
// rate lookup/require-a-rate step needed in that case. `contractorFeeOverride`
// is independent of that — it's what the contractor themselves is paid for
// this task (e.g. $0 or a reduced rate when the same contractor is redoing
// their own earlier work), and applies to any job, not just rework ones.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId } = await params
    const body = await request.json()
    const { subcategoryId, contractorId, customerPriceOverride, customerRate, workDescription, contractorFeeOverride } = body as {
      subcategoryId?: string; contractorId?: string; customerPriceOverride?: number; customerRate?: number; workDescription?: string
      contractorFeeOverride?: number
    }
    if (!subcategoryId) return NextResponse.json({ error: 'subcategoryId is required' }, { status: 400 })
    if (!contractorId) return NextResponse.json({ error: 'contractorId is required' }, { status: 400 })

    const job = await prisma.vehicleServiceJobs.findUnique({ where: { id: jobId }, select: { businessId: true, status: true, waiveLabor: true } })
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: job.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }
    const canSeeMoney = isSystemAdmin(user) || canViewFinancials(user, job.businessId)

    if (job.status === 'billed' || job.status === 'cancelled') {
      return NextResponse.json({ error: `Cannot add tasks to a ${job.status} job` }, { status: 409 })
    }

    // Setting a per-task fixed price, a brand-new default labour rate, or a
    // contractor-pay override are all financial actions — only for
    // authorised callers. The Add Task UI never sends these fields for
    // anyone else, this is a backstop.
    if ((
      customerPriceOverride !== undefined && customerPriceOverride !== null ||
      customerRate !== undefined && customerRate !== null ||
      contractorFeeOverride !== undefined && contractorFeeOverride !== null
    ) && !canSeeMoney) {
      return NextResponse.json({ error: 'Only authorised users can set labour pricing' }, { status: 403 })
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

    // Customer labour charge — completely independent of the contractor's fee above.
    // A waived-labor rework job (MBM-267) skips the rate lookup/require-a-rate
    // step entirely — it's always billed at $0 to the customer.
    let customerLabourRate: number
    if (job.waiveLabor) {
      customerLabourRate = 0
    } else {
      const existingRate = await prisma.vehicleServiceLabourRates.findUnique({
        where: { businessId_subcategoryId: { businessId: job.businessId, subcategoryId } },
      })
      if (existingRate && existingRate.isActive) {
        customerLabourRate = Number(existingRate.customerRate)
      } else if (customerRate !== undefined && customerRate !== null && !isNaN(Number(customerRate)) && Number(customerRate) >= 0) {
        const created = await prisma.vehicleServiceLabourRates.upsert({
          where: { businessId_subcategoryId: { businessId: job.businessId, subcategoryId } },
          create: { businessId: job.businessId, subcategoryId, customerRate: Number(customerRate), createdBy: user.id },
          update: { customerRate: Number(customerRate), isActive: true },
        })
        customerLabourRate = Number(created.customerRate)
      } else {
        return NextResponse.json({
          error: 'No labour rate configured for this service yet',
          needsLabourRate: true,
        }, { status: 400 })
      }
    }

    const task = await prisma.vehicleServiceTasks.create({
      data: {
        jobId,
        subcategoryId,
        contractorId,
        agreedFeeAmount: authorization.feeAmount,
        contractorFeeOverride: contractorFeeOverride !== undefined && contractorFeeOverride !== null && !isNaN(Number(contractorFeeOverride))
          ? Number(contractorFeeOverride)
          : null,
        customerLabourRate,
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

    // Financial fields are stripped for callers without permission — a real
    // server-side gate, not just a UI hide, per MBM-265.
    const responseTask = canSeeMoney
      ? task
      : { ...task, agreedFeeAmount: undefined, contractorFeeOverride: undefined, customerLabourRate: undefined, customerPriceOverride: undefined }

    return NextResponse.json({ success: true, task: responseTask })
  } catch (error) {
    console.error('Add vehicle service task error:', error)
    return NextResponse.json({ error: 'Failed to add task' }, { status: 500 })
  }
}
