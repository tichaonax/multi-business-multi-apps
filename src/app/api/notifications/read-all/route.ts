import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export const dynamic = 'force-dynamic'

/** PUT /api/notifications/read-all — mark all notifications as read for current user */
export async function PUT() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.appNotification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PUT /api/notifications/read-all error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
