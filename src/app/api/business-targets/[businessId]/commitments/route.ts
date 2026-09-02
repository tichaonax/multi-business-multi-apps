import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * GET/POST /api/business-targets/[businessId]/commitments
 *
 * MBM-288 §2.2 — the manual-only commitments (loan repayments, other
 * approved obligations) that have no other source of truth in this
 * codebase. Rent/payroll/recurring-auto-deposits are never stored here —
 * they're computed live (see calculate-minimum-target.ts).
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const commitments = await prisma.businessTargetCommitment.findMany({
      where: { businessId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      success: true,
      data: commitments.map((c) => ({ ...c, monthlyAmount: Number(c.monthlyAmount) })),
    })
  } catch (error) {
    console.error('Error fetching business target commitments:', error)
    return NextResponse.json({ error: 'Failed to fetch commitments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId } = await params
    if (!isSystemAdmin(user) && !hasPermission(user, 'canManageBusinessTargets', businessId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const business = await prisma.businesses.findUnique({ where: { id: businessId }, select: { id: true } })
    if (!business) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

    const payload = await request.json()
    const { category, label, monthlyAmount, notes } = payload

    if (!['LOAN_REPAYMENT', 'OTHER'].includes(category)) {
      return NextResponse.json({ error: 'category must be LOAN_REPAYMENT or OTHER' }, { status: 400 })
    }
    if (!label?.trim()) return NextResponse.json({ error: 'label is required' }, { status: 400 })
    const amount = Number(monthlyAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'monthlyAmount must be a positive number' }, { status: 400 })
    }

    const commitment = await prisma.businessTargetCommitment.create({
      data: { businessId, category, label: label.trim(), monthlyAmount: amount, notes: notes?.trim() || null, createdBy: user.id },
    })

    await Promise.all([
      prisma.businessTargetOverrideHistory.create({
        data: { businessId, changeType: 'COMMITMENT_CHANGE', newValue: amount, reason: `Added: ${label.trim()}`, changedBy: user.id },
      }),
      prisma.auditLogs.create({
        data: {
          action: 'BUSINESS_TARGET_COMMITMENT_CHANGED',
          entityType: 'BusinessTargetCommitment',
          entityId: commitment.id,
          userId: user.id,
          details: { businessId, action: 'created', category, label: label.trim(), monthlyAmount: amount },
        } as any,
      }),
    ])

    return NextResponse.json({ success: true, data: { ...commitment, monthlyAmount: Number(commitment.monthlyAmount) } }, { status: 201 })
  } catch (error) {
    console.error('Error creating business target commitment:', error)
    return NextResponse.json({ error: 'Failed to create commitment' }, { status: 500 })
  }
}
