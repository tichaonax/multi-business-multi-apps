import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function POST(request: NextRequest, { params }: { params: { batchId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const { cullingDate, weightEntryMode, notes } = body

    if (!cullingDate) return NextResponse.json({ error: 'cullingDate is required' }, { status: 400 })
    if (!weightEntryMode) return NextResponse.json({ error: 'weightEntryMode is required' }, { status: 400 })

    const batch = await prisma.chickenBatch.findUnique({
      where: { id: params.batchId },
      select: { id: true },
    })
    if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 })

    // Check for existing OPEN culling session
    const existingOpen = await prisma.chickenCulling.findFirst({
      where: { batchId: params.batchId, weighingStatus: 'OPEN' },
    })
    if (existingOpen) {
      return NextResponse.json({ error: 'An open culling session already exists for this batch' }, { status: 409 })
    }

    const culling = await prisma.chickenCulling.create({
      data: {
        batchId: params.batchId,
        cullingDate: new Date(cullingDate),
        weightEntryMode,
        weighingStatus: 'OPEN',
        quantityCulled: 0,
        totalWeightKg: 0,
        avgWeightKg: 0,
        notes: notes || null,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true, data: culling })
  } catch (error) {
    console.error('POST /api/chicken-run/batches/[batchId]/cull error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
