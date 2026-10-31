import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasUserPermission } from '@/lib/permission-utils'

/**
 * MBM-331 — GET/PUT /api/admin/farm-control/camera-businesses
 * GET: businesses (with "camera access available") and the saved
 *      camera ↔ business assignments.
 * PUT: { cameras?: [{cameraId, siteId, cameraName, siteName, businessIds[]}] }
 *      replaces the assignments of the cameras listed (the ones the admin's
 *      Farm Control session can see; others are left alone), and/or
 *      { business: { businessId, enabled } } switches camera access for one
 *      business (Businesses.settings.farmCamerasEnabled, merged).
 */
async function guard() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasUserPermission(user, 'canManageFarmControl')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

async function view() {
  const [businesses, assignments] = await Promise.all([
    prisma.businesses.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true, isUmbrellaBusiness: true, settings: true },
      orderBy: { name: 'asc' },
    }),
    prisma.farmControlCameraBusinesses.findMany({ orderBy: [{ siteName: 'asc' }, { cameraName: 'asc' }] }),
  ])
  return {
    success: true,
    data: {
      businesses: businesses.map(b => ({
        id: b.id,
        name: b.name,
        type: b.type,
        isUmbrellaBusiness: b.isUmbrellaBusiness,
        camerasEnabled: !!b.settings && typeof b.settings === 'object' && (b.settings as Record<string, unknown>).farmCamerasEnabled === true,
      })),
      assignments,
    },
  }
}

export async function GET() {
  const denied = await guard()
  if (denied) return denied
  return NextResponse.json(await view())
}

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function PUT(request: NextRequest) {
  const denied = await guard()
  if (denied) return denied
  const body = await request.json().catch(() => ({}))

  if (body.business && typeof body.business.businessId === 'string') {
    const b = await prisma.businesses.findUnique({ where: { id: body.business.businessId }, select: { id: true, settings: true } })
    if (!b) return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    const settings = (b.settings && typeof b.settings === 'object' ? b.settings : {}) as Record<string, unknown>
    await prisma.businesses.update({ where: { id: b.id }, data: { settings: { ...settings, farmCamerasEnabled: body.business.enabled === true } } })
  }

  if (Array.isArray(body.cameras)) {
    const businessIds = new Set((await prisma.businesses.findMany({ select: { id: true } })).map(b => b.id))
    const cameras = body.cameras
      .map((c: any) => ({
        cameraId: str(c?.cameraId, 64),
        siteId: str(c?.siteId, 64),
        cameraName: str(c?.cameraName),
        siteName: str(c?.siteName),
        businessIds: (Array.isArray(c?.businessIds) ? c.businessIds : []).filter((id: unknown) => typeof id === 'string' && businessIds.has(id)),
      }))
      .filter((c: { cameraId: string }) => c.cameraId)
    await prisma.$transaction([
      prisma.farmControlCameraBusinesses.deleteMany({ where: { cameraId: { in: cameras.map((c: { cameraId: string }) => c.cameraId) } } }),
      prisma.farmControlCameraBusinesses.createMany({
        data: cameras.flatMap((c: { cameraId: string; siteId: string; cameraName: string; siteName: string; businessIds: string[] }) =>
          c.businessIds.map(businessId => ({ cameraId: c.cameraId, siteId: c.siteId, cameraName: c.cameraName, siteName: c.siteName, businessId }))),
      }),
    ])
  }

  return NextResponse.json(await view())
}
