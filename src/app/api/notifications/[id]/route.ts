import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export const dynamic = 'force-dynamic'

/** DELETE /api/notifications/[id] — dismiss (permanently remove) a single
 * notification, distinct from marking it read: a read notification still
 * sits in the list for up to 30 days, this removes it immediately so a
 * reviewed alert stops showing up at all. */
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await prisma.appNotification.deleteMany({
      where: { id: params.id, userId: user.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/notifications/[id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
