import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export const dynamic = 'force-dynamic'

/** PUT /api/notifications/[id]/read — mark a single notification as read */
export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.appNotification.updateMany({
      where: { id: params.id, userId: user.id },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/notifications/[id]/read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
