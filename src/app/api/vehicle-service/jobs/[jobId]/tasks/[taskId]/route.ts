import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'

const VALID_TASK_STATUSES = ['assigned', 'in_progress', 'completed']

// PATCH /api/vehicle-service/jobs/[jobId]/tasks/[taskId]
// Body: { status?, workDescription? }
// Manager/staff-side task update. The contractor portal (Phase 4) uses a separate,
// more restricted endpoint for the contractor's own "mark complete" action.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; taskId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId, taskId } = await params
    const body = await request.json()
    const { status, workDescription } = body as { status?: string; workDescription?: string }

    const task = await prisma.vehicleServiceTasks.findUnique({
      where: { id: taskId },
      include: { job: { select: { businessId: true, status: true } } },
    })
    if (!task || task.jobId !== jobId) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: task.job.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    if (status && !VALID_TASK_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_TASK_STATUSES.join(', ')}` }, { status: 400 })
    }

    const updated = await prisma.vehicleServiceTasks.update({
      where: { id: taskId },
      data: {
        ...(status ? { status, completedAt: status === 'completed' ? new Date() : null } : {}),
        ...(workDescription !== undefined ? { workDescription: workDescription || null } : {}),
      },
      include: {
        subcategory: { select: { id: true, name: true, emoji: true } },
        contractor: { select: { id: true, persons: { select: { fullName: true } } } },
      },
    })

    return NextResponse.json({ success: true, task: updated })
  } catch (error) {
    console.error('Update vehicle service task error:', error)
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
  }
}

// DELETE /api/vehicle-service/jobs/[jobId]/tasks/[taskId]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; taskId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { jobId, taskId } = await params
    const task = await prisma.vehicleServiceTasks.findUnique({
      where: { id: taskId },
      include: { job: { select: { businessId: true } } },
    })
    if (!task || task.jobId !== jobId) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: task.job.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    if (task.status === 'completed') {
      return NextResponse.json({ error: 'A completed task cannot be removed' }, { status: 409 })
    }

    await prisma.vehicleServiceTasks.delete({ where: { id: taskId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete vehicle service task error:', error)
    return NextResponse.json({ error: 'Failed to remove task' }, { status: 500 })
  }
}
