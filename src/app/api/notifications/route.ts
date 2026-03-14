import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export const dynamic = 'force-dynamic'

/** GET /api/notifications — returns recent notifications + unread count for current user */
export async function GET() {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [notifications, unreadCount] = await Promise.all([
      prisma.appNotification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: { id: true, type: true, title: true, message: true, linkUrl: true, isRead: true, createdAt: true },
      }),
      prisma.appNotification.count({ where: { userId: user.id, isRead: false } }),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    console.error('GET /api/notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
