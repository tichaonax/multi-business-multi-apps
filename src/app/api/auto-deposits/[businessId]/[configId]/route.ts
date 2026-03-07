import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ businessId: string; configId: string }> }

/**
 * GET /api/auto-deposits/[businessId]/[configId]
 * Fetch a single auto-deposit config.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, configId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const config = await prisma.expenseAccountAutoDeposit.findFirst({
      where: { id: configId, businessId },
      include: {
        expenseAccount: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            balance: true,
            isActive: true,
            businessId: true,
            business: { select: { name: true } },
            depositCap: true,
            depositCapReachedAt: true,
            isAutoDepositFrozen: true,
          },
        },
        creator: { select: { id: true, name: true } },
      },
    })
    if (!config) return NextResponse.json({ error: 'Config not found' }, { status: 404 })

    return NextResponse.json({ success: true, data: { config } })
  } catch (err) {
    console.error('[GET /api/auto-deposits/[configId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/auto-deposits/[businessId]/[configId]
 * Update an existing auto-deposit config.
 * Allowed fields: dailyAmount, displayOrder, isActive, notes
 * (expenseAccountId is immutable after creation)
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, configId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canManageAutoDeposits && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied — auto-deposit management required' }, { status: 403 })
    }

    const existing = await prisma.expenseAccountAutoDeposit.findFirst({
      where: { id: configId, businessId },
    })
    if (!existing) return NextResponse.json({ error: 'Config not found' }, { status: 404 })

    const body = await request.json()
    const { dailyAmount, displayOrder, isActive, notes, startDate, endDate, isPausedByCap } = body

    const updateData: Record<string, unknown> = {}

    if (dailyAmount !== undefined) {
      const num = Number(dailyAmount)
      if (isNaN(num) || num <= 0) {
        return NextResponse.json({ error: 'dailyAmount must be a positive number' }, { status: 400 })
      }
      if (num > 9999999.99) {
        return NextResponse.json({ error: 'dailyAmount exceeds maximum allowed value' }, { status: 400 })
      }
      updateData.dailyAmount = num
    }

    if (displayOrder !== undefined) {
      const ord = Number(displayOrder)
      if (isNaN(ord)) {
        return NextResponse.json({ error: 'displayOrder must be a number' }, { status: 400 })
      }
      updateData.displayOrder = ord
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive)
    }

    // isPausedByCap can only be set to false (manual reactivation) via PATCH;
    // it is only set to true by the process-eod system.
    if (isPausedByCap !== undefined) {
      if (isPausedByCap !== false) {
        return NextResponse.json({ error: 'isPausedByCap can only be manually set to false (reactivation)' }, { status: 400 })
      }
      updateData.isPausedByCap = false
    }

    if (notes !== undefined) {
      updateData.notes = notes?.trim() || null
    }

    if ('startDate' in body) {
      if (startDate === null || startDate === undefined || startDate === '') {
        updateData.startDate = null
      } else {
        const d = new Date(startDate)
        if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 })
        updateData.startDate = d
      }
    }

    if ('endDate' in body) {
      if (endDate === null || endDate === undefined || endDate === '') {
        updateData.endDate = null
      } else {
        const d = new Date(endDate)
        if (isNaN(d.getTime())) return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 })
        updateData.endDate = d
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const config = await prisma.expenseAccountAutoDeposit.update({
      where: { id: configId },
      data: updateData,
      include: {
        expenseAccount: {
          select: {
            id: true,
            accountNumber: true,
            accountName: true,
            balance: true,
            isActive: true,
            businessId: true,
            business: { select: { name: true } },
            depositCap: true,
            depositCapReachedAt: true,
            isAutoDepositFrozen: true,
          },
        },
        creator: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({ success: true, data: { config } })
  } catch (err) {
    console.error('[PATCH /api/auto-deposits/[configId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/auto-deposits/[businessId]/[configId]
 * Permanently delete an auto-deposit config (hard delete — no data loss risk since
 * the config itself holds no transaction history, only ExpenseAccountDeposits does).
 */
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, configId } = await params

    const permissions = getEffectivePermissions(user, businessId)
    if (!permissions.canManageAutoDeposits && user.role !== 'admin') {
      return NextResponse.json({ error: 'Permission denied — auto-deposit management required' }, { status: 403 })
    }

    const existing = await prisma.expenseAccountAutoDeposit.findFirst({
      where: { id: configId, businessId },
      select: { id: true, expenseAccount: { select: { accountName: true } } },
    })
    if (!existing) return NextResponse.json({ error: 'Config not found' }, { status: 404 })

    await prisma.expenseAccountAutoDeposit.delete({ where: { id: configId } })

    return NextResponse.json({
      success: true,
      message: `Auto-deposit config for "${existing.expenseAccount.accountName}" deleted`,
    })
  } catch (err) {
    console.error('[DELETE /api/auto-deposits/[configId]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
