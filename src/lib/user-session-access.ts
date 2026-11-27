/**
 * MBM-351 — who may see and act on whose sessions (Signed-in Users screen).
 *
 *  - System admins: every user. They can sign out other admins but not suspend them.
 *  - Managers (an active `business-owner` / `business-manager` membership): only
 *    users who belong to one of those businesses, and never admins or anyone
 *    who is an owner/manager there themselves.
 *  - Nobody acts on themselves.
 */
import { prisma } from './prisma'
import type { SessionUser } from './permission-utils'

const MANAGER_ROLES = ['business-owner', 'business-manager']

export interface SessionScope {
  isAdmin: boolean
  /** Businesses the caller manages (empty for admins — they see everyone) */
  businessIds: string[]
}

export function getSessionScope(user: SessionUser | null): SessionScope | null {
  if (!user) return null
  if (user.role === 'admin') return { isAdmin: true, businessIds: [] }
  const businessIds = (user.businessMemberships ?? [])
    .filter(m => m.isActive && MANAGER_ROLES.includes(m.role))
    .map(m => m.businessId)
  return businessIds.length > 0 ? { isAdmin: false, businessIds } : null
}

/**
 * Of the given user ids, the ones the caller may act on.
 * `forSuspend`: admins can't suspend other admins.
 */
export async function filterManageableUsers(
  actor: SessionUser,
  scope: SessionScope,
  userIds: string[],
  opts: { forSuspend?: boolean } = {}
): Promise<string[]> {
  const ids = [...new Set(userIds)].filter(id => id !== actor.id)
  if (ids.length === 0) return []
  const users = await prisma.users.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      role: true,
      business_memberships: { where: { isActive: true }, select: { businessId: true, role: true } },
    },
  })
  return users.filter(u => {
    if (scope.isAdmin) return !(opts.forSuspend && u.role === 'admin')
    if (u.role === 'admin') return false
    const shared = u.business_memberships.filter(m => scope.businessIds.includes(m.businessId))
    if (shared.length === 0) return false
    return !shared.some(m => MANAGER_ROLES.includes(m.role))
  }).map(u => u.id)
}

/** Prisma `where` on Users limiting a list to the caller's reach (before the per-user rules above). */
export function usersInScopeWhere(scope: SessionScope) {
  if (scope.isAdmin) return {}
  return { business_memberships: { some: { isActive: true, businessId: { in: scope.businessIds } } } }
}
