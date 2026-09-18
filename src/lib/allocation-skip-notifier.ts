/**
 * Allocation-Skip Notifier
 *
 * A skipped EOD allocation (rent, an expense/loan auto-deposit, or payroll)
 * used to just sit silently in EodAllocationSkips until someone thought to
 * check the allocation-backlog screen. That's not good enough for something
 * that means "we couldn't pay this" — alert the same "responsible party"
 * audience the price-change and low-stock notifiers use (this business's
 * managers/admins, plus every system admin) the moment it happens.
 */

import { prisma } from '@/lib/prisma'
import { emitNotification } from '@/lib/notifications/notification-emitter'

export interface AllocationSkipNotifyParams {
  businessId: string
  businessName: string
  allocationType: 'RENT' | 'AUTO_DEPOSIT' | 'PAYROLL'
  accountName: string
  eodDate: string
  amountSkipped: number
  reason: string
}

export async function notifyManagersOfAllocationSkip(params: AllocationSkipNotifyParams): Promise<void> {
  try {
    const { businessId, businessName, allocationType, accountName, eodDate, amountSkipped, reason } = params

    const memberships = await prisma.businessMemberships.findMany({
      where: { businessId, isActive: true },
      select: { userId: true },
    })
    const memberIds = memberships.map((m) => m.userId)

    const managers = memberIds.length > 0
      ? await prisma.users.findMany({
          where: { id: { in: memberIds }, isActive: true, role: { in: ['admin', 'manager'] } },
          select: { id: true },
        })
      : []

    const systemAdmins = await prisma.users.findMany({
      where: { role: 'admin', isActive: true },
      select: { id: true },
    })

    const userIds = [...new Set([...managers.map((m) => m.id), ...systemAdmins.map((a) => a.id)])]
    if (userIds.length === 0) return

    const typeLabel = allocationType === 'RENT' ? 'Rent transfer' : allocationType === 'PAYROLL' ? 'Payroll contribution' : 'Auto-deposit'

    await emitNotification({
      userIds,
      type: 'ALLOCATION_SKIPPED',
      title: `${typeLabel} skipped — insufficient cash`,
      message: `${businessName}: ${typeLabel.toLowerCase()} of $${amountSkipped.toFixed(2)} to ${accountName} on ${eodDate} was blocked — ${reason}. It's recorded as a backlog item to catch up once cash is available.`,
      linkUrl: `/business/manage/allocation-backlog?businessId=${businessId}`,
      metadata: { businessId, allocationType, accountName, eodDate, amountSkipped },
    })
  } catch (err) {
    // Non-critical — never let a notification failure affect the EOD close itself
    console.error('[allocation-skip-notifier] Failed to notify managers:', err)
  }
}
