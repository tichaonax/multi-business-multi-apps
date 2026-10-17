/**
 * MBM-326 — who is told a combo request was submitted for approval: users
 * with a FULL grant on the account (the cashiers), never the submitter. If
 * that leaves nobody, fall back to active admins (other than the submitter)
 * so a request is never submitted to no one.
 */
import { prisma } from '@/lib/prisma'

export async function comboRequestApproverIds(accountId: string, submitterId: string): Promise<string[]> {
  const grants = await prisma.expenseAccountGrants.findMany({
    where: { expenseAccountId: accountId, permissionLevel: 'FULL' },
    select: { userId: true },
  })
  const cashierIds = grants.map(g => g.userId).filter(id => id !== submitterId)
  if (cashierIds.length > 0) return cashierIds

  const admins = await prisma.users.findMany({
    where: { role: 'admin', isActive: true, id: { not: submitterId } },
    select: { id: true },
  })
  return admins.map(a => a.id)
}
