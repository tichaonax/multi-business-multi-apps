/**
 * MBM-312: resolves every user who can approve a lending request —
 * "canManageLending" is a business-membership-role permission (admins
 * always qualify; everyone else inherits it from their role's preset,
 * merged with any explicit per-membership override), not a flat key
 * reliably stored on users.permissions. A direct Prisma JSON-path query
 * against users.permissions (`permissions: { path: ['canManageLending'],
 * equals: true } }`) only catches users with an explicit override and
 * misses anyone relying on their role's preset default — which is most
 * people — so loan/repayment-request notifications silently reached
 * almost nobody. This replicates the same preset+override merge
 * getEffectivePermissions() uses, via the shared getMembershipPermissions
 * helper, across every active user instead of just the one requesting.
 */
import { prisma } from '@/lib/prisma'
import { getMembershipPermissions } from '@/lib/permission-utils'

export async function getLendingCashierUserIds(): Promise<string[]> {
  const [admins, memberships] = await Promise.all([
    prisma.users.findMany({ where: { isActive: true, role: 'admin' }, select: { id: true } }),
    prisma.businessMemberships.findMany({
      where: { isActive: true, users: { isActive: true, role: { not: 'admin' } } },
      select: {
        userId: true,
        role: true,
        permissions: true,
        businesses: { select: { type: true } },
      },
    }),
  ])

  const ids = new Set(admins.map(a => a.id))
  for (const m of memberships) {
    const effective = getMembershipPermissions({ role: m.role, permissions: m.permissions, businessType: m.businesses?.type })
    if (effective.canManageLending) ids.add(m.userId)
  }
  return Array.from(ids)
}
