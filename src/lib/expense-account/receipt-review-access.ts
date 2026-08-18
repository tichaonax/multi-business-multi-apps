import { prisma } from '@/lib/prisma'

// "Cashier" for the receipt submit/review/approve workflow (MBM-271) — same
// definition already used for combo-request settle notifications and cancel
// authorization: admins, or a FULL permission grant on the specific account.
export async function isAccountCashier(userId: string, isAdmin: boolean, accountId: string): Promise<boolean> {
  if (isAdmin) return true
  const grant = await prisma.expenseAccountGrants.findFirst({
    where: { expenseAccountId: accountId, userId, permissionLevel: 'FULL' },
    select: { id: true },
  })
  return !!grant
}

// All cashiers for an account — used as the notification recipient list for
// both the "submitted, please review" nudge and the 7-day escalation.
export async function getAccountCashierIds(accountId: string): Promise<string[]> {
  const [grants, admins] = await Promise.all([
    prisma.expenseAccountGrants.findMany({
      where: { expenseAccountId: accountId, permissionLevel: 'FULL' },
      select: { userId: true },
    }),
    prisma.users.findMany({ where: { role: 'admin', isActive: true }, select: { id: true } }),
  ])
  return [...new Set([...grants.map(g => g.userId), ...admins.map(a => a.id)])]
}
