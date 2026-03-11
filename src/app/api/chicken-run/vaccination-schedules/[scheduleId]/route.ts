import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getEffectivePermissions } from '@/lib/permission-utils'

export async function DELETE(request: NextRequest, { params }: { params: { scheduleId: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const permissions = getEffectivePermissions(user)
    if (!permissions.canManageChickenRun) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const schedule = await prisma.chickenVaccinationSchedule.update({
      where: { id: params.scheduleId },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, data: schedule })
  } catch (error) {
    console.error('DELETE /api/chicken-run/vaccination-schedules/[scheduleId] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
