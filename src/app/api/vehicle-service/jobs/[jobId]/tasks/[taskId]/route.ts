import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin } from '@/lib/permission-utils'
import { canViewFinancials } from '@/lib/vehicle-service/permissions'
import { autoAdvanceJobIfOpen } from '@/lib/vehicle-service/job-status'

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
    const canSeeMoney = isSystemAdmin(user) || canViewFinancials(user, task.job.businessId)

    if (status && !VALID_TASK_STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID_TASK_STATUSES.join(', ')}` }, { status: 400 })
    }
    // A billed job is a locked, receipted record — its tasks (which the
    // invoice was generated from) can't retroactively change underneath it.
    // Same rule the job's own status PATCH and the Known-Parts-attach route
    // already enforce; this endpoint had no such guard at all.
    if ((status || workDescription !== undefined) && (task.job.status === 'billed' || task.job.status === 'cancelled')) {
      return NextResponse.json({ error: `Cannot change a task on a ${task.job.status} job` }, { status: 409 })
    }

    const updated = await prisma.vehicleServiceTasks.update({
      where: { id: taskId },
      data: {
        ...(status ? { status, completedAt: status === 'completed' ? new Date() : null } : {}),
        // Stamped once — the first time work actually begins. Re-toggling
        // status later never overwrites the original start time. Actual
        // duration (startedAt → completedAt) is informational only (see
        // MBM-265) — nothing here recalculates the labour charge from it.
        ...(status === 'in_progress' && !task.startedAt ? { startedAt: new Date() } : {}),
        ...(workDescription !== undefined ? { workDescription: workDescription || null } : {}),
      },
      include: {
        subcategory: { select: { id: true, name: true, emoji: true } },
        contractor: { select: { id: true, persons: { select: { fullName: true } } } },
      },
    })

    if (status === 'in_progress') {
      await autoAdvanceJobIfOpen(jobId, task.job.status)
    }

    const responseTask = canSeeMoney
      ? updated
      : { ...updated, agreedFeeAmount: undefined, customerLabourRate: undefined, customerPriceOverride: undefined }

    return NextResponse.json({ success: true, task: responseTask })
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
      include: { job: { select: { businessId: true, status: true } } },
    })
    if (!task || task.jobId !== jobId) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

    if (!isSystemAdmin(user)) {
      const membership = await prisma.businessMemberships.findFirst({ where: { userId: user.id, businessId: task.job.businessId } })
      if (!membership) return NextResponse.json({ error: 'Access denied to this business' }, { status: 403 })
    }

    if (task.status === 'completed') {
      return NextResponse.json({ error: 'A completed task cannot be removed' }, { status: 409 })
    }
    if (task.job.status === 'billed' || task.job.status === 'cancelled') {
      return NextResponse.json({ error: `Cannot remove a task on a ${task.job.status} job` }, { status: 409 })
    }

    await prisma.vehicleServiceTasks.delete({ where: { id: taskId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete vehicle service task error:', error)
    return NextResponse.json({ error: 'Failed to remove task' }, { status: 500 })
  }
}
