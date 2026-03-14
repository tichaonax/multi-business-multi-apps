import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { emitToRoom } from '@/lib/customer-display/socket-server'

/** DELETE /api/chat/messages/[id] — soft-delete own message */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const message = await prisma.chatMessages.findUnique({ where: { id: params.id } })
    if (!message) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (message.userId !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await prisma.chatMessages.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    })

    // Notify all chat clients to show the deleted placeholder
    try { emitToRoom('chat:general', 'chat:message:deleted', { id: params.id }) } catch { /* non-critical */ }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[DELETE /api/chat/messages/[id]]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
