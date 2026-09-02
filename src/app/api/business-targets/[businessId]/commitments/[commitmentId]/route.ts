import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/** PUT/DELETE /api/business-targets/[businessId]/commitments/[commitmentId] — MBM-288 §2.2 */

export async function PUT(request: NextRequest, { params }: { params: Promise<{ businessId: string; commitmentId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, commitmentId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.businessTargetCommitment.findUnique({ where: { id: commitmentId } })
    if (!existing || existing.businessId !== businessId) {
      return NextResponse.json({ error: 'Commitment not found' }, { status: 404 })
    }

    const payload = await request.json()
    const updateData: any = { updatedBy: user.id }
    if (payload.hasOwnProperty('label')) {
      if (!payload.label?.trim()) return NextResponse.json({ error: 'label cannot be empty' }, { status: 400 })
      updateData.label = payload.label.trim()
    }
    if (payload.hasOwnProperty('monthlyAmount')) {
      const amount = Number(payload.monthlyAmount)
      if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ error: 'monthlyAmount must be a positive number' }, { status: 400 })
      updateData.monthlyAmount = amount
    }
    if (payload.hasOwnProperty('notes')) updateData.notes = payload.notes?.trim() || null
    if (payload.hasOwnProperty('isActive')) updateData.isActive = !!payload.isActive

    const updated = await prisma.businessTargetCommitment.update({ where: { id: commitmentId }, data: updateData })

    await Promise.all([
      prisma.businessTargetOverrideHistory.create({
        data: {
          businessId,
          changeType: 'COMMITMENT_CHANGE',
          previousValue: Number(existing.monthlyAmount),
          newValue: Number(updated.monthlyAmount),
          reason: `Updated: ${updated.label}`,
          changedBy: user.id,
        },
      }),
      prisma.auditLogs.create({
        data: {
          action: 'BUSINESS_TARGET_COMMITMENT_CHANGED',
          entityType: 'BusinessTargetCommitment',
          entityId: updated.id,
          userId: user.id,
          details: { businessId, action: 'updated', before: { label: existing.label, monthlyAmount: Number(existing.monthlyAmount) }, after: { label: updated.label, monthlyAmount: Number(updated.monthlyAmount) } },
        } as any,
      }),
    ])

    return NextResponse.json({ success: true, data: { ...updated, monthlyAmount: Number(updated.monthlyAmount) } })
  } catch (error) {
    console.error('Error updating business target commitment:', error)
    return NextResponse.json({ error: 'Failed to update commitment' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ businessId: string; commitmentId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, commitmentId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existing = await prisma.businessTargetCommitment.findUnique({ where: { id: commitmentId } })
    if (!existing || existing.businessId !== businessId) {
      return NextResponse.json({ error: 'Commitment not found' }, { status: 404 })
    }

    // Soft delete (isActive: false) — matches this app's general preference
    // for deactivation over hard deletes on financial-adjacent records, and
    // keeps the commitment's history intact in BusinessTargetOverrideHistory.
    await prisma.businessTargetCommitment.update({ where: { id: commitmentId }, data: { isActive: false, updatedBy: user.id } })

    await Promise.all([
      prisma.businessTargetOverrideHistory.create({
        data: { businessId, changeType: 'COMMITMENT_CHANGE', previousValue: Number(existing.monthlyAmount), newValue: 0, reason: `Removed: ${existing.label}`, changedBy: user.id },
      }),
      prisma.auditLogs.create({
        data: {
          action: 'BUSINESS_TARGET_COMMITMENT_CHANGED',
          entityType: 'BusinessTargetCommitment',
          entityId: existing.id,
          userId: user.id,
          details: { businessId, action: 'removed', label: existing.label, monthlyAmount: Number(existing.monthlyAmount) },
        } as any,
      }),
    ])

    return NextResponse.json({ success: true, message: 'Commitment removed' })
  } catch (error) {
    console.error('Error deleting business target commitment:', error)
    return NextResponse.json({ error: 'Failed to remove commitment' }, { status: 500 })
  }
}
