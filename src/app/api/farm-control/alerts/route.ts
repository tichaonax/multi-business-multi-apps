import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getUserCameraAccess } from '@/lib/farm-control/server'
import { buildWhere, filterOn, readFilter } from '@/lib/farm-control/alert-filter'
import { ALERT_SELECT, newAlertCount } from '@/lib/farm-control/alert-store'

/**
 * MBM-340 — GET /api/farm-control/alerts
 * The person's own camera alerts for the 📹 panel and History:
 * view=new|later|paused|history, state (History), q (camera, site or a time),
 * site, kind, day, hour, tz, since, page. `countOnly=1` answers just the new count.
 * Rows carry no picture bytes (GET …/alerts/[id]/picture), and say whether
 * MBM still lets the person watch that camera.
 */
const PAGE = 50

export async function GET(request: NextRequest) {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const params = Object.fromEntries(request.nextUrl.searchParams.entries())

  const newCount = await newAlertCount(user.id)
  if (params.countOnly === '1') {
    const ever = newCount > 0 || (await prisma.farmCameraAlerts.count({ where: { userId: user.id }, take: 1 })) > 0
    return NextResponse.json({ success: true, data: { newCount, ever } }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const f = readFilter(params)
  const page = Math.max(0, Number(params.page) || 0)
  const [laterCount, pauses, access] = await Promise.all([
    prisma.farmCameraAlerts.count({ where: { userId: user.id, laterAt: { not: null } } }),
    prisma.farmCameraAlertPauses.findMany({ where: { userId: user.id }, orderBy: { pausedAt: 'desc' }, select: { cameraId: true, pausedAt: true } }),
    getUserCameraAccess(user),
  ])
  const allowed = new Set(access.cameraIds)

  // Sites with new alerts, each with its count (offered when more than one)
  const siteRows = await prisma.farmCameraAlerts.groupBy({
    by: ['siteId', 'siteName'],
    where: { userId: user.id, seenAt: null, dismissedAt: null, siteId: { not: null } },
    _count: { _all: true },
  })
  const sites = siteRows.map(s => ({ id: s.siteId as string, name: s.siteName || 'Site', newCount: s._count._all }))

  if (f.view === 'paused') {
    // Paused cameras, with the name from their latest alert
    const names = await prisma.farmCameraAlerts.findMany({
      where: { userId: user.id, cameraId: { in: pauses.map(p => p.cameraId) } },
      distinct: ['cameraId'],
      orderBy: { start: 'desc' },
      select: { cameraId: true, cameraName: true, siteName: true },
    })
    const byId = new Map(names.map(n => [n.cameraId, n]))
    return NextResponse.json({
      success: true,
      data: {
        paused: pauses.map(p => ({ cameraId: p.cameraId, pausedAt: p.pausedAt, cameraName: byId.get(p.cameraId)?.cameraName || `Camera ${p.cameraId}`, siteName: byId.get(p.cameraId)?.siteName || null })),
        counts: { new: newCount, later: laterCount, paused: pauses.length }, sites,
      },
    }, { headers: { 'Cache-Control': 'no-store' } })
  }

  const { where, timeNote } = buildWhere(user.id, f)
  const [rows, total, newMatching] = await Promise.all([
    prisma.farmCameraAlerts.findMany({
      where,
      orderBy: f.view === 'later' ? { laterAt: 'desc' } : { start: 'desc' },
      skip: page * PAGE,
      take: PAGE,
      select: ALERT_SELECT,
    }),
    prisma.farmCameraAlerts.count({ where }),
    filterOn(f) ? prisma.farmCameraAlerts.count({ where: { AND: [where, { seenAt: null, dismissedAt: null }] } }) : Promise.resolve(null),
  ])
  // Which of these rows have a picture (only this page's ids)
  const withPicture = new Set((await prisma.farmCameraAlerts.findMany({
    where: { id: { in: rows.map(r => r.id) }, picture: { not: null } },
    select: { id: true },
  })).map(r => r.id))

  return NextResponse.json({
    success: true,
    data: {
      alerts: rows.map(a => ({ ...a, hasPicture: withPicture.has(a.id), allowed: allowed.has(a.cameraId), paused: pauses.some(p => p.cameraId === a.cameraId) })),
      total,
      page,
      pageSize: PAGE,
      more: Math.max(0, total - (page + 1) * PAGE),
      counts: { new: newCount, later: laterCount, paused: pauses.length, newMatching },
      sites,
      timeNote,
    },
  }, { headers: { 'Cache-Control': 'no-store' } })
}
