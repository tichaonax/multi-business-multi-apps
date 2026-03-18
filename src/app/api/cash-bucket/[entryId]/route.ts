import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

const EDIT_WINDOW_DAYS = 8

function isWithinEditWindow(createdAt: Date): boolean {
  const diffMs = Date.now() - createdAt.getTime()
  return diffMs <= EDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

/**
 * PUT /api/cash-bucket/[entryId]
 * Edit the amount and/or notes of an EOD_RECEIPT entry.
 * Allowed: entry creator or admin, within 8 days of creation.
 * Body: { amount, notes }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { entryId } = await params

    const entry = await prisma.cashBucketEntry.findUnique({
      where: { id: entryId },
      include: { creator: { select: { id: true, name: true } } },
    })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    // Only EOD_RECEIPT entries are editable
    if (entry.entryType !== 'EOD_RECEIPT') {
      return NextResponse.json({ error: 'Only EOD_RECEIPT entries can be edited' }, { status: 400 })
    }

    const isAdmin = user.role === 'admin'
    const isCreator = entry.createdBy === user.id

    // Must be creator or admin
    if (!isCreator && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden — only the creator or an admin can edit this entry' }, { status: 403 })
    }

    // Non-admin creators are limited to the 8-day window
    if (!isAdmin && !isWithinEditWindow(entry.createdAt)) {
      return NextResponse.json({ error: 'Edit window has expired (8 days)' }, { status: 403 })
    }

    // Soft-deleted entries cannot be edited
    if (entry.deletedAt) {
      return NextResponse.json({ error: 'Cannot edit a deleted entry' }, { status: 400 })
    }

    const body = await request.json()
    const { amount, notes } = body

    if (amount !== undefined && Number(amount) <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 })
    }
    if (notes !== undefined && !notes?.trim()) {
      return NextResponse.json({ error: 'Notes cannot be empty' }, { status: 400 })
    }

    const updated = await prisma.cashBucketEntry.update({
      where: { id: entryId },
      data: {
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(notes !== undefined && { notes: notes.trim() }),
        editedAt: new Date(),
        editedBy: user.id,
      },
      include: {
        business: { select: { id: true, name: true, type: true } },
        creator: { select: { id: true, name: true } },
        editor: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Entry updated',
      data: {
        id: updated.id,
        amount: Number(updated.amount),
        notes: updated.notes,
        editedAt: updated.editedAt?.toISOString() ?? null,
        editedBy: updated.editor ?? null,
      },
    })
  } catch (error) {
    console.error('Error editing cash bucket entry:', error)
    return NextResponse.json({ error: 'Failed to edit entry' }, { status: 500 })
  }
}

/**
 * DELETE /api/cash-bucket/[entryId]
 * Soft-delete: sets amount = 0, records deletedAt/By/reason.
 * Allowed: users with canDeleteCashBucketEntry permission, within 8 days.
 * Body: { reason }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const permissions = getEffectivePermissions(user)
    if (!permissions.canDeleteCashBucketEntry && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden — insufficient permissions' }, { status: 403 })
    }

    const { entryId } = await params

    const entry = await prisma.cashBucketEntry.findUnique({ where: { id: entryId } })
    if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    // Only EOD_RECEIPT entries are deletable
    if (entry.entryType !== 'EOD_RECEIPT') {
      return NextResponse.json({ error: 'Only EOD_RECEIPT entries can be deleted' }, { status: 400 })
    }

    // Non-admin users are limited to the 8-day window
    if (user.role !== 'admin' && !isWithinEditWindow(entry.createdAt)) {
      return NextResponse.json({ error: 'Delete window has expired (8 days)' }, { status: 403 })
    }

    // Already deleted
    if (entry.deletedAt) {
      return NextResponse.json({ error: 'Entry is already deleted' }, { status: 400 })
    }

    const body = await request.json()
    const { reason } = body
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'Deletion reason is required' }, { status: 400 })
    }

    await prisma.cashBucketEntry.update({
      where: { id: entryId },
      data: {
        amount: 0,
        deletedAt: new Date(),
        deletedBy: user.id,
        deletionReason: reason.trim(),
      },
    })

    return NextResponse.json({ success: true, message: 'Entry deleted' })
  } catch (error) {
    console.error('Error deleting cash bucket entry:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}
