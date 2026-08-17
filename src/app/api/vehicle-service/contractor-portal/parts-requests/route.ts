import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

// GET /api/vehicle-service/contractor-portal/parts-requests
// The logged-in contractor's own parts requests, any status — so they can see
// what's pending, issued, or rejected (with the reason).
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (!contractor) return NextResponse.json({ error: 'No contractor profile linked to this account' }, { status: 403 })

    const requests = await prisma.vehicleServicePartsRequests.findMany({
      where: { contractorId: contractor.id },
      select: {
        id: true,
        description: true,
        quantity: true,
        status: true,
        requestedAt: true,
        rejectionReason: true,
        issuedQuantity: true,
        issuedAt: true,
        job: { select: { id: true, vehicleMake: true, vehicleModel: true, vehiclePlate: true } },
      },
      orderBy: { requestedAt: 'desc' },
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
        vehicle: [r.job.vehicleMake, r.job.vehicleModel].filter(Boolean).join(' ') || null,
        vehiclePlate: r.job.vehiclePlate,
      })),
    })
  } catch (error) {
    console.error('Contractor portal parts requests list error:', error)
    return NextResponse.json({ error: 'Failed to load parts requests' }, { status: 500 })
  }
}

// POST /api/vehicle-service/contractor-portal/parts-requests
// Body: { jobId, taskId?, description, quantity }
// Contractor describes what they need in free text — Inventory Department matches
// it to real stock and issues or rejects it. No pricing/financial data involved.
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { userId: user.id },
      select: { id: true },
    })
    if (!contractor) return NextResponse.json({ error: 'No contractor profile linked to this account' }, { status: 403 })

    const body = await request.json()
    const { jobId, taskId, description, quantity } = body as {
      jobId?: string; taskId?: string; description?: string; quantity?: number
    }
    if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    if (!description || !description.trim()) return NextResponse.json({ error: 'description is required' }, { status: 400 })
    if (!quantity || quantity < 1) return NextResponse.json({ error: 'quantity must be at least 1' }, { status: 400 })

    // Ownership: the contractor must actually have a task on this job.
    const hasTask = await prisma.vehicleServiceTasks.findFirst({
      where: { jobId, contractorId: contractor.id },
      select: { id: true },
    })
    if (!hasTask) return NextResponse.json({ error: 'You have no task on this job' }, { status: 403 })

    if (taskId) {
      const task = await prisma.vehicleServiceTasks.findUnique({ where: { id: taskId }, select: { jobId: true, contractorId: true } })
      if (!task || task.jobId !== jobId || task.contractorId !== contractor.id) {
        return NextResponse.json({ error: 'Task not found for this contractor on this job' }, { status: 400 })
      }
    }

    const partsRequest = await prisma.vehicleServicePartsRequests.create({
      data: {
        jobId,
        taskId: taskId || null,
        contractorId: contractor.id,
        description: description.trim(),
        quantity,
      },
    })

    return NextResponse.json({ success: true, request: partsRequest })
  } catch (error) {
    console.error('Create parts request error:', error)
    return NextResponse.json({ error: 'Failed to request part' }, { status: 500 })
  }
}
