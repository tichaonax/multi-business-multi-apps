import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { getFarmControlIntegration, getUserCameraAccess, isIntegrationReady } from '@/lib/farm-control/server'
import { farmServerFetch } from '@/lib/farm-control/server-api'

/**
 * MBM-339 — GET /api/farm-control/picture?camera=<id>[&event=<id>]
 * The picture for a camera-alert notification, fetched by MBM's server as the
 * signed-in user (guide §7.12): the event's picture when `event` is given,
 * else the camera's picture now. Only for cameras MBM allows this user;
 * Farm Control applies its own permissions on top.
 */
export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const camera = request.nextUrl.searchParams.get('camera') || ''
  const event = request.nextUrl.searchParams.get('event') || ''
  if (!/^[\w-]{1,64}$/.test(camera) || (event && !/^[\w-]{1,64}$/.test(event))) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  const integration = await getFarmControlIntegration()
  if (!isIntegrationReady(integration)) return NextResponse.json({ error: 'Farm cameras are off' }, { status: 404 })
  const access = await getUserCameraAccess(user)
  if (!access.cameraIds.includes(camera)) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const path = event ? `/camera-events/${encodeURIComponent(event)}/picture` : `/cameras/${encodeURIComponent(camera)}/picture`
    const r = await farmServerFetch(integration, { id: user.id, name: user.name }, path)
    return new NextResponse(await r.arrayBuffer(), {
      headers: {
        'Content-Type': r.headers.get('Content-Type') || 'image/jpeg',
        // An event's picture never changes; the camera's "now" picture does
        'Cache-Control': event ? 'private, max-age=86400' : 'private, max-age=10',
      },
    })
  } catch {
    return NextResponse.json({ error: 'No picture' }, { status: 404 })
  }
}
