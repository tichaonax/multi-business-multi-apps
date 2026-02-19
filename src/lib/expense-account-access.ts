import { prisma } from '@/lib/prisma'

export type GrantPermissionLevel = 'VIEW' | 'FULL'

/**
 * Returns the explicit grant level for a user on a specific account, or null if no grant exists.
 * Does NOT factor in business membership — use this to check cross-business grants only.
 *
 * 'VIEW' = view + reports only
 * 'FULL' = view + payments + deposits
 */
export async function getUserGrantLevel(
  userId: string,
  accountId: string
): Promise<GrantPermissionLevel | null> {
  const grant = await prisma.expenseAccountGrants.findUnique({
    where: {
      expenseAccountId_userId: { expenseAccountId: accountId, userId },
    },
    select: { permissionLevel: true },
  })
  return grant ? (grant.permissionLevel as GrantPermissionLevel) : null
}

/**
 * Returns true if the user can view this account at all.
 * Grants VIEW access for users with either VIEW or FULL grant.
 * Also returns true for admins and business members (via existing permission checks in routes).
 *
 * Use this to supplement the existing canAccessExpenseAccount permission check:
 *   if (!permissions.canAccessExpenseAccount && user.role !== 'admin') {
 *     const ok = await canUserViewAccount(user.id, accountId)
 *     if (!ok) return 403
 *   }
 */
export async function canUserViewAccount(userId: string, accountId: string): Promise<boolean> {
  const level = await getUserGrantLevel(userId, accountId)
  return level !== null
}

/**
 * Returns true if the user has FULL grant (can make payments/deposits via cross-business grant).
 *
 * Use this to supplement canMakeExpensePayments / canMakeExpenseDeposits:
 *   if (!permissions.canMakeExpensePayments && user.role !== 'admin') {
 *     const ok = await canUserWriteAccount(user.id, accountId)
 *     if (!ok) return 403
 *   }
 */
export async function canUserWriteAccount(userId: string, accountId: string): Promise<boolean> {
  const level = await getUserGrantLevel(userId, accountId)
  return level === 'FULL'
}

/**
 * Full access check used by the account detail route (GET /api/expense-account/[accountId]).
 * Checks admin → business membership → explicit grant (any level).
 */
export async function canUserAccessAccount(
  user: { id: string; role?: string | null; businessMemberships?: { businessId: string }[] },
  accountId: string
): Promise<boolean> {
  if (user.role === 'admin') return true

  const account = await prisma.expenseAccounts.findUnique({
    where: { id: accountId },
    select: { businessId: true },
  })
  if (!account) return false

  if (account.businessId) {
    const userBusinessIds = (user.businessMemberships || []).map(m => m.businessId)
    if (userBusinessIds.includes(account.businessId)) return true
  }

  return canUserViewAccount(user.id, accountId)
}
