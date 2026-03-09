import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

type Params = { params: Promise<{ businessId: string; itemId: string }> }

/**
 * PATCH /api/cash-allocation/[businessId]/items/[itemId]
 * Body: { isChecked: boolean, actualAmount: number | null, notes?: string }
 *
 * Updates a single line item's checked state and actual amount.
 * Blocked if the parent report is LOCKED.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { businessId, itemId } = await params
    const permissions = getEffectivePermissions(user, businessId)

    if (user.role !== 'admin' && !permissions.canRunCashAllocationReport) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Load item + parent report
    const item = await prisma.cashAllocationLineItem.findUnique({
      where: { id: itemId },
      include: { report: { select: { id: true, status: true, businessId: true } } },
    })

    if (!item) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }
    if (item.report.businessId !== businessId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (item.report.status === 'LOCKED') {
      return NextResponse.json({ error: 'Report is locked and cannot be modified' }, { status: 409 })
    }

    const body = await request.json()
    const { isChecked, actualAmount, notes } = body

    if (typeof isChecked !== 'boolean') {
      return NextResponse.json({ error: 'isChecked (boolean) is required' }, { status: 400 })
    }

    const updatedItem = await prisma.cashAllocationLineItem.update({
      where: { id: itemId },
      data: {
        isChecked,
        actualAmount: actualAmount !== undefined
          ? (actualAmount === null ? null : actualAmount)
          : undefined,
        notes: notes !== undefined ? notes : undefined,
        checkedAt: isChecked ? new Date() : null,
        checkedBy: isChecked ? user.id : null,
      },
    })

    // Check if all items in the report are now done
    const allItems = await prisma.cashAllocationLineItem.findMany({
      where: { reportId: item.report.id },
      select: { isChecked: true, actualAmount: true, sourceType: true },
    })
    const nonRentItems = allItems.filter(i => i.sourceType !== 'EOD_RENT_TRANSFER')
    const allChecked = nonRentItems.length > 0 &&
      nonRentItems.every(i => i.isChecked && i.actualAmount !== null)

    return NextResponse.json({ item: updatedItem, allChecked })
  } catch (err) {
    console.error('[PATCH /api/cash-allocation/items]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
