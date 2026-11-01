import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { getBusinessesWithPermission, getMembershipPermissions, hasUserPermission, isSystemAdmin } from '@/lib/permission-utils'

/**
 * MBM-331 — GET/PUT /api/admin/farm-control/users
 * GET: active users with their Farm Control id (their MBM user id, sent as
 *      `sub`), the businesses where they may view / capture farm cameras, and
 *      their link status. The linking itself is done by FarmNet in Farm Control.
 *      ?userId=… returns just that user (also for user managers, read-only,
 *      for the Farm Cameras block in User Management).
 * PUT: { userId, status?: 'REQUESTED' | 'NOT_REQUESTED', viewAllBusinesses?, captureAllBusinesses? }
 *      status REQUESTED creates the Farm Control id, NOT_REQUESTED removes it
 *      (and with it all camera access). LINKED / REFUSED come from the user's
 *      own sign-ins. The two switches give camera access in every business
 *      with camera access on (capture needs view; turning on needs LINKED).
 */
async function guard() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasUserPermission(user, 'canManageFarmControl')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export async function GET(request: NextRequest) {
  const onlyUserId = request.nextUrl.searchParams.get('userId')
  if (onlyUserId) {
    // Read-only for user managers too
    const viewer = await getServerUser()
    if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const mayRead = hasUserPermission(viewer, 'canManageFarmControl') || isSystemAdmin(viewer) || getBusinessesWithPermission(viewer, 'canManageBusinessUsers').length > 0
    if (!mayRead) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  } else {
    const denied = await guard()
    if (denied) return denied
  }

  const users = await prisma.users.findMany({
    where: onlyUserId ? { id: onlyUserId } : { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      farm_control_user_link: true,
      business_memberships: {
        where: { isActive: true },
        select: { role: true, permissions: true, businesses: { select: { id: true, name: true, type: true, isUmbrellaBusiness: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })

  const viewer = await getServerUser()
  const canEdit = !!viewer && hasUserPermission(viewer, 'canManageFarmControl')
  const rows = users.map(u => {
      const perms = u.business_memberships.map(m => ({
        business: m.businesses,
        p: getMembershipPermissions({ role: m.role, permissions: m.permissions, businessType: m.businesses.type }),
      }))
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        viewBusinesses: perms.filter(x => (x.p as any).canViewFarmCameras === true).map(x => ({ id: x.business.id, name: x.business.isUmbrellaBusiness ? 'All' : x.business.name })),
        captureBusinesses: perms.filter(x => (x.p as any).canCaptureFarmCameras === true).map(x => ({ id: x.business.id, name: x.business.isUmbrellaBusiness ? 'All' : x.business.name })),
        link: u.farm_control_user_link
          ? {
              status: u.farm_control_user_link.status,
              farmControlName: u.farm_control_user_link.farmControlName,
              requestedAt: u.farm_control_user_link.requestedAt,
              lastSessionAt: u.farm_control_user_link.lastSessionAt,
              lastRefusedAt: u.farm_control_user_link.lastRefusedAt,
              alertsCheckedAt: u.farm_control_user_link.alertsCheckedAt, // MBM-332
              alertsError: u.farm_control_user_link.alertsError,
            }
          : { status: 'NOT_REQUESTED', farmControlName: null, requestedAt: null, lastSessionAt: null, lastRefusedAt: null, alertsCheckedAt: null, alertsError: null },
        viewAllBusinesses: !!u.farm_control_user_link?.viewAllBusinesses,
        captureAllBusinesses: !!u.farm_control_user_link?.viewAllBusinesses && !!u.farm_control_user_link?.captureAllBusinesses,
      }
    })
  if (onlyUserId) {
    if (!rows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: { ...rows[0], canEdit } })
  }
  return NextResponse.json({ success: true, data: rows })
}

export async function PUT(request: NextRequest) {
  const denied = await guard()
  if (denied) return denied
  const body = await request.json().catch(() => ({}))
  if (typeof body.userId !== 'string') return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  const data: { status?: string; requestedAt?: Date | null; viewAllBusinesses?: boolean; captureAllBusinesses?: boolean } = {}
  if (body.status !== undefined) {
    if (!['REQUESTED', 'NOT_REQUESTED'].includes(body.status)) return NextResponse.json({ error: 'status must be REQUESTED or NOT_REQUESTED' }, { status: 400 })
    data.status = body.status
    data.requestedAt = body.status === 'REQUESTED' ? new Date() : null
    // Removing the id withdraws everything; LINKED comes back only from a sign-in
    if (body.status === 'NOT_REQUESTED') { data.viewAllBusinesses = false; data.captureAllBusinesses = false }
  }
  if (typeof body.viewAllBusinesses === 'boolean') {
    data.viewAllBusinesses = body.viewAllBusinesses
    if (!body.viewAllBusinesses) data.captureAllBusinesses = false
  }
  if (typeof body.captureAllBusinesses === 'boolean' && data.captureAllBusinesses === undefined) {
    data.captureAllBusinesses = body.captureAllBusinesses
    if (body.captureAllBusinesses) data.viewAllBusinesses = true
  }
  if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Nothing to change' }, { status: 400 })
  const exists = await prisma.users.findUnique({ where: { id: body.userId }, select: { id: true, farm_control_user_link: { select: { status: true } } } })
  if (!exists) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  if ((data.viewAllBusinesses || data.captureAllBusinesses) && data.status === undefined && exists.farm_control_user_link?.status !== 'LINKED') {
    return NextResponse.json({ error: 'Camera access can be given once the Farm Control link is active (Linked)' }, { status: 400 })
  }
  await prisma.farmControlUserLinks.upsert({
    where: { userId: body.userId },
    create: { userId: body.userId, ...data },
    update: data,
  })
  return NextResponse.json({ success: true })
}
