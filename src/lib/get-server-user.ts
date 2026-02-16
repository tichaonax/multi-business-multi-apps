import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SessionUser } from '@/lib/permission-utils'

/**
 * Get the authenticated user with full business memberships from DB.
 * Returns null if not authenticated.
 *
 * The JWT token only stores userId and role (to keep cookies small).
 * This helper enriches the session with DB-fetched permissions and memberships
 * so that all permission-utils functions work correctly.
 *
 * Replaces the pattern:
 *   const session = await getServerSession(authOptions)
 *   const user = session.user as SessionUser
 *
 * With:
 *   const user = await getServerUser()
 */
export async function getServerUser(): Promise<SessionUser | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null

  const userId = (session.user as any).id as string

  // Fetch user record and active business memberships in parallel
  const [dbUser, memberships] = await Promise.all([
    prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        permissions: true,
      }
    }),
    prisma.businessMemberships.findMany({
      where: { userId, isActive: true },
      include: {
        businesses: {
          select: { id: true, name: true, type: true }
        }
      }
    })
  ])

  if (!dbUser) return null

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    permissions: (dbUser.permissions || {}) as Record<string, any>,
    businessMemberships: memberships.map(m => ({
      businessId: m.businesses.id,
      businessName: m.businesses.name,
      businessType: m.businesses.type,
      role: m.role,
      permissions: (m.permissions || {}) as Record<string, any>,
      isActive: m.isActive,
      joinedAt: m.joinedAt,
      lastAccessedAt: m.lastAccessedAt,
    }))
  }
}
