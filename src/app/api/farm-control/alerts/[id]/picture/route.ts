import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'

/**
 * MBM-340 — GET /api/farm-control/alerts/[id]/picture
 * The picture MBM kept with the alert (the event's picture, or the camera's
 * picture when it started going on). Only the person's own alerts. No Farm
 * Control token ever reaches the page (alert list guide §4).
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const a = await prisma.farmCameraAlerts.findFirst({
    where: { id, userId: user.id },
    select: { picture: true, pictureFromEvent: true, updatedAt: true },
  })
  if (!a?.picture) return NextResponse.json({ error: 'No picture' }, { status: 404 })
  return new NextResponse(new Uint8Array(a.picture), {
    headers: {
      'Content-Type': 'image/jpeg',
      // The event's picture never changes; a going-on picture is replaced once the event comes
      'Cache-Control': a.pictureFromEvent ? 'private, max-age=2592000, immutable' : 'private, max-age=30',
      ETag: `"${a.updatedAt.getTime()}"`,
    },
  })
}
