import { NextResponse } from 'next/server'
import { getServerUser } from '@/lib/get-server-user'
import { hasUserPermission } from '@/lib/permission-utils'
import { prisma } from '@/lib/prisma'
import { getCameraPreferences, getFarmControlIntegration, getUserCameraAccess, hasFarmId, isIntegrationReady } from '@/lib/farm-control/server'

/**
 * MBM-331 — GET /api/farm-control/me
 * What the signed-in user's browser needs to show farm cameras: the Farm
 * Control address and integration id, the cameras MBM allows (Farm Control
 * narrows them further), which of those may be captured, and the user's own
 * preferences. `enabled: false` means show nothing. A user with a Farm
 * Control id, or a camera admin (`canManage`), is `enabled` even with no
 * cameras yet, so the sign-in confirms the link and the admin screen can list
 * cameras for mapping; the strip still needs cameraIds.
 */
export async function GET() {
  const user = await getServerUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const integration = await getFarmControlIntegration()
  if (!isIntegrationReady(integration)) return NextResponse.json({ success: true, data: { enabled: false } })

  const access = await getUserCameraAccess(user)
  const canManage = hasUserPermission(user, 'canManageFarmControl')
  // With a Farm Control id but no cameras yet, still sign in: that is how MBM
  // learns the link is active (the strip needs cameraIds, so nothing shows)
  const link = await prisma.farmControlUserLinks.findUnique({ where: { userId: user.id }, select: { status: true } })
  if (!hasFarmId(link?.status) && !canManage) return NextResponse.json({ success: true, data: { enabled: false } })

  return NextResponse.json(
    {
      success: true,
      data: {
        enabled: true,
        baseUrl: integration.baseUrl,
        integrationId: integration.integrationId,
        maxLargeViews: integration.maxLargeViews,
        canManage,
        ...access,
        preferences: await getCameraPreferences(user.id),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
