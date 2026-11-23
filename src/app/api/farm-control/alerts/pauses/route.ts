import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getUserCameraAccess } from '@/lib/farm-control/server'

/**
 * MBM-340 — POST / DELETE /api/farm-control/alerts/pauses  { cameraId }
 * 🔕 Pause (or resume) a camera's alerts for this person, on MBM's side only
 * (decision C2, alert list guide §3.5). The camera keeps recording and
 * alerting everyone else; Farm Control's own alerts are untouched.
 */
async function read(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const body = await request.json().catch(() => ({}))
  const cameraId = typeof body.cameraId === 'string' || typeof body.cameraId === 'number' ? String(body.cameraId).slice(0, 64) : ''
  if (!cameraId) return { error: NextResponse.json({ error: 'cameraId needed' }, { status: 400 }) }
  return { user, cameraId }
}

export async function POST(request: NextRequest) {
  const r = await read(request)
  if ('error' in r) return r.error
  if (!(await getUserCameraAccess(r.user)).cameraIds.includes(r.cameraId)) return NextResponse.json({ error: 'Not your camera' }, { status: 404 })
  await prisma.farmCameraAlertPauses.upsert({
    where: { userId_cameraId: { userId: r.user.id, cameraId: r.cameraId } },
    create: { userId: r.user.id, cameraId: r.cameraId },
    update: {},
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  const r = await read(request)
  if ('error' in r) return r.error
  await prisma.farmCameraAlertPauses.deleteMany({ where: { userId: r.user.id, cameraId: r.cameraId } })
  return NextResponse.json({ success: true })
}
