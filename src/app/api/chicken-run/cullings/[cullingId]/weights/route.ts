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
    const { weightKg, notes } = body

    if (!weightKg || Number(weightKg) <= 0) {
      return NextResponse.json({ error: 'weightKg must be greater than 0' }, { status: 400 })
    }

    const culling = await prisma.chickenCulling.findUnique({
      where: { id: params.cullingId },
    })
    if (!culling) return NextResponse.json({ error: 'Culling session not found' }, { status: 404 })
    if (culling.weighingStatus !== 'OPEN') {
      return NextResponse.json({ error: 'Culling session is not open' }, { status: 400 })
    }

    const existingCount = await prisma.chickenBirdWeight.count({
      where: { cullingId: params.cullingId },
    })
    const sequenceNo = existingCount + 1

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const weight = await tx.chickenBirdWeight.create({
        data: {
          cullingId: params.cullingId,
          weightKg: parseFloat(String(weightKg)),
          sequenceNo,
          notes: notes || null,
        },
      })

      const allWeights = await tx.chickenBirdWeight.findMany({
        where: { cullingId: params.cullingId },
        select: { weightKg: true },
      })

      const count = allWeights.length
      const totalWeight = allWeights.reduce((sum: number, w: { weightKg: unknown }) => sum + Number(w.weightKg), 0)
      const avgWeight = count > 0 ? totalWeight / count : 0

      const updatedCulling = await tx.chickenCulling.update({
        where: { id: params.cullingId },
        data: {
          quantityCulled: count,
          totalWeightKg: totalWeight,
          avgWeightKg: avgWeight,
        },
      })

      return { weight, culling: updatedCulling }
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('POST /api/chicken-run/cullings/[cullingId]/weights error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
