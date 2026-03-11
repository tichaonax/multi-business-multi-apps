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
    const { date, weekAge, sampleSize, avgWeightKg, notes } = body

    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })
    if (weekAge === undefined || weekAge === null) return NextResponse.json({ error: 'weekAge is required' }, { status: 400 })
    if (!sampleSize || Number(sampleSize) <= 0) return NextResponse.json({ error: 'sampleSize must be greater than 0' }, { status: 400 })
    if (!avgWeightKg || Number(avgWeightKg) <= 0) return NextResponse.json({ error: 'avgWeightKg must be greater than 0' }, { status: 400 })

    const record = await prisma.chickenWeightLog.create({
      data: {
        batchId: params.batchId,
        date: new Date(date),
        weekAge: Number(weekAge),
        sampleSize: Number(sampleSize),
        avgWeightKg: parseFloat(avgWeightKg),
        notes: notes || null,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('POST /api/chicken-run/batches/[batchId]/weight error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
