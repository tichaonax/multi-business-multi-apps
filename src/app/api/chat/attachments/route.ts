import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB — same limit as the vehicle license document upload

/**
 * POST /api/chat/attachments — pre-upload a PDF/JPEG/PNG and get back an
 * attachment id, the same "upload first, then send" two-step pattern as the
 * existing vehicle-license DocumentUpload flow. The row is created with
 * messageId: null ("pending"); POST /api/chat/messages claims it by id when
 * the message is actually sent. Stored as bytea in Postgres (not the
 * filesystem) so it's covered by the existing backup/restore pipeline.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, JPEG, and PNG files are allowed' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const attachment = await prisma.chatAttachments.create({
      data: {
        uploadedBy: user.id,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        data: bytes,
      },
      select: { id: true, fileName: true, mimeType: true, size: true },
    })

    // Opportunistic cleanup: an attachment someone uploaded but then closed
    // the composer without sending sits here forever otherwise (messageId
    // stays null, nothing else ever claims or deletes it). Same
    // fire-and-forget prune-while-fetching pattern already used for
    // General's 7-day message cutoff — no separate cron job needed.
    prisma.chatAttachments.deleteMany({
      where: { messageId: null, createdAt: { lt: new Date(Date.now() - 2 * 60 * 60 * 1000) } },
    }).catch(() => {})

    return NextResponse.json({ success: true, attachment })
  } catch (err) {
    console.error('[POST /api/chat/attachments]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
