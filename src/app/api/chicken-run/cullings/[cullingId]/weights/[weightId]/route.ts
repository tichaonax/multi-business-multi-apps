import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { cullingId: string; weightId: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const culling = await prisma.chickenCulling.findUnique({
      where: { id: params.cullingId },
    })
    if (!culling) return NextResponse.json({ error: 'Culling session not found' }, { status: 404 })
    if (culling.weighingStatus !== 'OPEN') {
      return NextResponse.json({ error: 'Culling session is not open' }, { status: 400 })
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.chickenBirdWeight.delete({ where: { id: params.weightId } })

      const allWeights = await tx.chickenBirdWeight.findMany({
        where: { cullingId: params.cullingId },
        select: { weightKg: true },
        orderBy: { sequenceNo: 'asc' },
      })

      const count = allWeights.length
      const total = allWeights.reduce((sum: number, w: { weightKg: unknown }) => sum + Number(w.weightKg), 0)
      const avg = count > 0 ? total / count : 0

      await tx.chickenCulling.update({
        where: { id: params.cullingId },
        data: {
          quantityCulled: count,
          totalWeightKg: total,
          avgWeightKg: avg,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/chicken-run/cullings/[cullingId]/weights/[weightId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
