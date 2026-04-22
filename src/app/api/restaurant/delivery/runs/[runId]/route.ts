import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

// PATCH — update a run (odometer end, assign orders, dispatch, complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { runId } = params
    const body = await request.json()
    const { odometerStart, odometerEnd, vehicleId, vehiclePlate, notes, dispatchedAt, completedAt, orderIds } = body

    // Look up run to get businessId for permission check
    const runForPerms = await prisma.deliveryRuns.findUnique({ where: { id: runId }, select: { businessId: true } })
    const perms = getEffectivePermissions(user, runForPerms?.businessId ?? undefined)

    // Odometer-only updates require canUpdateOdometer; anything else requires canManageDeliveryRuns
    const isOdometerOnly = (odometerStart != null || odometerEnd != null) &&
      vehicleId === undefined && vehiclePlate === undefined && notes === undefined &&
      dispatchedAt === undefined && completedAt === undefined && !orderIds?.length
    if (isOdometerOnly) {
      if (!perms.canUpdateOdometer) {
        return NextResponse.json({ error: 'Forbidden: canUpdateOdometer required' }, { status: 403 })
      }
    } else if (!perms.canManageDeliveryRuns) {
      return NextResponse.json({ error: 'Forbidden: canManageDeliveryRuns required' }, { status: 403 })
    }

    const updateData: any = { updatedAt: new Date() }
    if (odometerStart != null) updateData.odometerStart = Number(odometerStart)
    if (odometerEnd != null) updateData.odometerEnd = Number(odometerEnd)
    if (vehicleId !== undefined) updateData.vehicleId = vehicleId
    if (vehiclePlate !== undefined) updateData.vehiclePlate = vehiclePlate
    if (notes !== undefined) updateData.notes = notes
    if (dispatchedAt !== undefined) updateData.dispatchedAt = dispatchedAt ? new Date(dispatchedAt) : null
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null

    await prisma.$transaction(async (tx) => {
      await tx.deliveryRuns.update({ where: { id: runId }, data: updateData })

      // Assign orders to this run if provided
      if (Array.isArray(orderIds) && orderIds.length > 0) {
        await tx.deliveryOrderMeta.updateMany({
          where: { orderId: { in: orderIds } },
          data: { runId, updatedAt: new Date() },
        })
      }
    })

    const run = await prisma.deliveryRuns.findUnique({
      where: { id: runId },
      include: {
        driver: { select: { id: true, fullName: true } },
        orders: { select: { id: true, orderId: true, status: true } },
      },
    })

    return NextResponse.json({ success: true, run })
  } catch (error) {
    console.error('Error updating delivery run:', error)
    return NextResponse.json({ error: 'Failed to update run' }, { status: 500 })
  }
}
