import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

const VALID_STATUSES = ['in_progress', 'completed']

// PATCH /api/vehicle-service/contractor-portal/tasks/[taskId]
// Body: { status?, workDescription? }
// Contractor-only self-service update — ownership is enforced via the contractor's
// own userId, not any business permission. Cannot edit a task already completed.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const contractor = await prisma.vehicleServiceContractors.findUnique({
      where: { userId: user.id },
      select: { id: true, status: true },
    })
    if (!contractor) {
      return NextResponse.json({ error: 'No contractor profile linked to this account' }, { status: 403 })
    }

    const { taskId } = await params
    const body = await request.json()
    const { status, workDescription } = body as { status?: string; workDescription?: string }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_STATUSES.join(', ')}` }, { status: 400 })
    }

    const task = await prisma.vehicleServiceTasks.findUnique({
      where: { id: taskId },
      select: { contractorId: true, status: true },
    })
    if (!task || task.contractorId !== contractor.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }
    if (task.status === 'completed') {
      return NextResponse.json({ error: 'This task is already marked complete' }, { status: 409 })
    }

    const updated = await prisma.vehicleServiceTasks.update({
      where: { id: taskId },
      data: {
        ...(status ? { status, completedAt: status === 'completed' ? new Date() : null } : {}),
        ...(workDescription !== undefined ? { workDescription: workDescription || null } : {}),
      },
      select: { id: true, status: true, workDescription: true },
    })

    return NextResponse.json({ success: true, task: updated })
  } catch (error) {
    console.error('Contractor portal task update error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}
