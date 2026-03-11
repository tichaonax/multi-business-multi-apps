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
    const { date, vaccineName, dosage, scheduleId, notes } = body

    if (!date) return NextResponse.json({ error: 'date is required' }, { status: 400 })
    if (!vaccineName) return NextResponse.json({ error: 'vaccineName is required' }, { status: 400 })

    const record = await prisma.chickenVaccinationLog.create({
      data: {
        batchId: params.batchId,
        date: new Date(date),
        vaccineName,
        dosage: dosage || null,
        scheduleId: scheduleId || null,
        notes: notes || null,
        createdBy: user.id,
      },
    })

    return NextResponse.json({ success: true, data: record })
  } catch (error) {
    console.error('POST /api/chicken-run/batches/[batchId]/vaccination error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
