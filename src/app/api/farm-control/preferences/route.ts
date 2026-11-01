import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getCameraPreferences, getUserCameraAccess } from '@/lib/farm-control/server'

/**
 * MBM-331 — PUT /api/farm-control/preferences
 * The user's own camera preferences. Only the fields sent change. Strip
 * cameras are limited to cameras MBM allows this user, at most 4, in order.
 * Preferences never change access.
 */
const MODES = ['live', 'pictures']

export async function PUT(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const data: Record<string, unknown> = {}

  if (Array.isArray(body.stripCameraIds)) {
    const allowed = new Set((await getUserCameraAccess(user)).cameraIds)
    const ids = [...new Set<string>(body.stripCameraIds.map(String))].filter(id => allowed.has(id))
    if (ids.length > 4) return NextResponse.json({ error: 'At most 4 cameras in the strip' }, { status: 400 })
    data.stripCameraIds = ids
  }
  for (const k of ['stripVisible', 'showNamesOnStrip', 'showStripOnPos', 'alertsBell', 'alertsChat']) {
    if (typeof body[k] === 'boolean') data[k] = body[k]
  }
  for (const k of ['stripMode', 'posStripMode']) {
    if (MODES.includes(body[k])) data[k] = body[k]
  }
  if (body.cameraLabels && typeof body.cameraLabels === 'object' && !Array.isArray(body.cameraLabels)) {
    // { cameraId: { name, showName } } — names are plain text, at most 40 characters (Farm Control's label limit)
    const labels: Record<string, { name: string; showName: boolean }> = {}
    for (const [id, v] of Object.entries(body.cameraLabels as Record<string, any>)) {
      if (!v || typeof v !== 'object') continue
      const name = typeof v.name === 'string' ? v.name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 40) : ''
      const showName = v.showName !== false
      if (name || !showName) labels[String(id).slice(0, 64)] = { name, showName }
    }
    data.cameraLabels = labels
  }

  await prisma.farmCameraUserPreferences.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...data },
    update: data,
  })
  return NextResponse.json({ success: true, data: await getCameraPreferences(user.id) })
}
