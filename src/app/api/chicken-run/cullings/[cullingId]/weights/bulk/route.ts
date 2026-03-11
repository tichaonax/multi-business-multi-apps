import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function POST(request: NextRequest, { params }: { params: { cullingId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { mode, totalWeightKg, weightList, quantityCulled } = body

    const culling = await prisma.chickenCulling.findUnique({
      where: { id: params.cullingId },
    })
    if (!culling) return NextResponse.json({ error: 'Culling session not found' }, { status: 404 })
    if (culling.weighingStatus !== 'OPEN') {
      return NextResponse.json({ error: 'Culling session is not open' }, { status: 400 })
    }

    if (mode === 'BULK_TOTAL') {
      if (!quantityCulled || Number(quantityCulled) <= 0) {
        return NextResponse.json({ error: 'quantityCulled must be greater than 0' }, { status: 400 })
      }
      if (!totalWeightKg || Number(totalWeightKg) <= 0) {
        return NextResponse.json({ error: 'totalWeightKg must be greater than 0' }, { status: 400 })
      }

      const count = Number(quantityCulled)
      const total = Number(totalWeightKg)
      const avg = total / count

      const updatedCulling = await prisma.chickenCulling.update({
        where: { id: params.cullingId },
        data: {
          quantityCulled: count,
          totalWeightKg: total,
          avgWeightKg: avg,
        },
      })

      return NextResponse.json({ success: true, data: updatedCulling })
    }

    if (mode === 'BULK_LIST') {
      if (!weightList || !Array.isArray(weightList) || weightList.length === 0) {
        return NextResponse.json({ error: 'weightList must be a non-empty array' }, { status: 400 })
      }

      const updatedCulling = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Delete existing birdWeights for this culling before inserting new ones
        await tx.chickenBirdWeight.deleteMany({ where: { cullingId: params.cullingId } })

        const weightData = (weightList as number[]).map((w: number, i: number) => ({
          cullingId: params.cullingId,
          weightKg: Number(w),
          sequenceNo: i + 1,
        }))

        await tx.chickenBirdWeight.createMany({ data: weightData })

        const count = weightData.length
        const total = weightData.reduce((sum: number, w: { weightKg: number }) => sum + w.weightKg, 0)
        const avg = count > 0 ? total / count : 0

        return tx.chickenCulling.update({
          where: { id: params.cullingId },
          data: {
            quantityCulled: count,
            totalWeightKg: total,
            avgWeightKg: avg,
          },
        })
      })

      return NextResponse.json({ success: true, data: updatedCulling })
    }

    return NextResponse.json({ error: 'Invalid mode. Use BULK_TOTAL or BULK_LIST' }, { status: 400 })
  } catch (error) {
    console.error('POST /api/chicken-run/cullings/[cullingId]/weights/bulk error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
