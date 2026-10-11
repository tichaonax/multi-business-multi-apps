import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

export const dynamic = 'force-dynamic'

const DOCUMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/webm']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
const ALLOWED_TYPES = [...DOCUMENT_TYPES, ...AUDIO_TYPES, ...VIDEO_TYPES]

const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024 // 10MB — same limit as the vehicle license document upload
const MAX_AUDIO_SIZE = 15 * 1024 * 1024 // 15MB — a few minutes of mp3 at a reasonable bitrate
const MAX_VIDEO_SIZE = 25 * 1024 * 1024 // 25MB — short clips only, kept well below the document/image volume this table is sized for

function maxSizeFor(mimeType: string): number {
  if (AUDIO_TYPES.includes(mimeType)) return MAX_AUDIO_SIZE
  if (VIDEO_TYPES.includes(mimeType)) return MAX_VIDEO_SIZE
  return MAX_DOCUMENT_SIZE
}

/**
 * POST /api/chat/attachments — pre-upload a PDF/JPEG/PNG/audio/short video
 * and get back an attachment id, the same "upload first, then send"
 * two-step pattern as the existing vehicle-license DocumentUpload flow. The
 * row is created with messageId: null ("pending"); POST /api/chat/messages
 * claims it by id when the message is actually sent. Stored as bytea in
 * Postgres (not the filesystem) so it's covered by the existing
 * backup/restore pipeline — video rows are excluded from backup specifically
 * (see backup-clean.ts) to keep that pipeline's size bounded; audio and
 * images stay included.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Only PDF, image, audio, or video files are allowed' }, { status: 400 })
    }
    const maxSize = maxSizeFor(file.type)
    if (file.size > maxSize) {
      return NextResponse.json({ error: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB` }, { status: 400 })
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
