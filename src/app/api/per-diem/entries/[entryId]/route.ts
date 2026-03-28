import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { isSystemAdmin, hasPermission } from '@/lib/permission-utils'

/**
 * PATCH /api/per-diem/entries/[entryId]
 * Update approvalStatus for a single per diem entry.
 * Requires canAccessPayroll or canManageEmployees.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!hasPermission(user, 'canAccessPayroll') && !hasPermission(user, 'canManageEmployees') && !isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { entryId } = await params
    const body = await request.json()
    const { approvalStatus } = body

    if (!['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      return NextResponse.json({ error: 'Invalid approvalStatus' }, { status: 400 })
    }

    const entry = await prisma.perDiemEntries.findUnique({ where: { id: entryId } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    const updated = await prisma.perDiemEntries.update({
      where: { id: entryId },
      data: {
        approvalStatus,
        approvedBy: approvalStatus === 'approved' ? user.id : (approvalStatus === 'rejected' ? user.id : null),
        approvedAt: approvalStatus === 'approved' || approvalStatus === 'rejected' ? new Date() : null,
      },
    })

    return NextResponse.json({ data: { id: updated.id, approvalStatus: updated.approvalStatus } })
  } catch (err) {
    console.error('[per-diem entries PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/per-diem/entries/[entryId]
 * Delete a single per diem entry. Admin only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!isSystemAdmin(user)) {
      return NextResponse.json({ error: 'Only admins can delete per diem entries' }, { status: 403 })
    }

    const { entryId } = await params

    const entry = await prisma.perDiemEntries.findUnique({ where: { id: entryId } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    await prisma.perDiemEntries.delete({ where: { id: entryId } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (err) {
    console.error('[per-diem entries DELETE]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
