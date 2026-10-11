import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getGeneralRoom } from '@/lib/chat/rooms'

export const dynamic = 'force-dynamic'

/**
 * GET /api/chat/attachments/[id][?download=1] — serves the attachment's
 * binary from the database (mirrors GET /api/images/[id]). Without
 * `download`, serves inline so an image renders directly and a PDF opens in
 * the browser's own viewer ("view"); with `download=1`, forces a
 * Content-Disposition: attachment so the browser saves it instead
 * ("download") — same file, two actions, matching both halves of the
 * request.
 *
 * Access follows the exact same visibility rule as GET /api/chat/messages:
 * an unclaimed (messageId: null) attachment is visible only to the person
 * who uploaded it (mid-compose, before sending); once attached to a
 * message, visibility is the message's own — General-room recipient
 * targeting, or room participancy for a DM/group/system room. A deleted
 * message's attachment is treated as gone, same as its text.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const attachment = await prisma.chatAttachments.findUnique({
      where: { id },
      include: {
        chat_messages: {
          select: {
            id: true, roomId: true, userId: true, deletedAt: true,
            chat_message_recipients: { select: { userId: true } },
          },
        },
      },
    })
    if (!attachment) return new NextResponse(null, { status: 404 })

    const message = attachment.chat_messages
    if (!message) {
      // Still mid-compose — only the uploader can preview it before sending.
      if (attachment.uploadedBy !== user.id) return new NextResponse(null, { status: 404 })
    } else {
      if (message.deletedAt) return new NextResponse(null, { status: 404 })

      const generalRoom = await getGeneralRoom()
      let visible: boolean
      if (message.roomId === generalRoom.id) {
        const recipients = message.chat_message_recipients
        visible = recipients.length === 0 || message.userId === user.id || recipients.some(r => r.userId === user.id)
      } else if (message.roomId) {
        const membership = await prisma.chatParticipants.findFirst({ where: { roomId: message.roomId, userId: user.id } })
        visible = !!membership
      } else {
        visible = false
      }
      if (!visible) return new NextResponse(null, { status: 404 })
    }

    const forceDownload = request.nextUrl.searchParams.get('download') === '1'
    const safeName = attachment.fileName.replace(/"/g, '')

    return new NextResponse(attachment.data, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `${forceDownload ? 'attachment' : 'inline'}; filename="${safeName}"`,
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch (err) {
    console.error('[GET /api/chat/attachments/[id]]', err)
    return new NextResponse(null, { status: 500 })
  }
}
