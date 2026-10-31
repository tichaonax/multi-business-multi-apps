import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerUser } from '@/lib/get-server-user'
import { hasUserPermission } from '@/lib/permission-utils'
import { getFarmControlIntegration, hasFarmId, isIntegrationReady, signAssertion } from '@/lib/farm-control/server'

/**
 * MBM-331 — POST /api/farm-control/assertion
 * A one-minute, single-use assertion for the signed-in user (guide §4.2),
 * answered as text/plain with no-store. Signed only when the integration is
 * on and the user is active and may see at least one camera on the MBM side;
 * withdrawing that stops the user at their next Farm Control renewal.
 * A Farm Control admin (canManageFarmControl) may also sign in, to list the
 * cameras for the camera ↔ business mapping; Farm Control still decides what
 * their linked identity can see.
 * Assertions are never logged or cached.
 */
const noStore = { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' }

export async function POST() {
  const user = await getServerUser()
  if (!user) return new NextResponse('Not signed in', { status: 401, headers: noStore })

  const integration = await getFarmControlIntegration()
  if (!isIntegrationReady(integration)) return new NextResponse('Farm cameras are not switched on', { status: 403, headers: noStore })

  const dbUser = await prisma.users.findUnique({ where: { id: user.id }, select: { isActive: true, name: true } })
  if (!dbUser?.isActive) return new NextResponse('Account not active', { status: 403, headers: noStore })

  // A Farm Control id is MBM's grant (it lets Farm Control confirm the link
  // even before any camera is allowed); camera admins may sign in to map cameras
  const link = await prisma.farmControlUserLinks.findUnique({ where: { userId: user.id }, select: { status: true } })
  if (!hasFarmId(link?.status) && !hasUserPermission(user, 'canManageFarmControl')) return new NextResponse('No Farm Control id for this user', { status: 403, headers: noStore })

  try {
    const assertion = await signAssertion(integration, { id: user.id, name: dbUser.name })
    return new NextResponse(assertion, { status: 200, headers: noStore })
  } catch {
    return new NextResponse('The signing key is missing on this server', { status: 500, headers: noStore })
  }
}
