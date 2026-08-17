import { prisma } from '@/lib/prisma'
import { getEffectivePermissions } from '@/lib/permission-utils'
import { emitNotification } from '@/lib/notifications/notification-emitter'
import type { BusinessPermissions } from '@/types/permissions'

// Active business members whose EFFECTIVE permission resolves true — reuses
// the exact same role-preset/override resolution every permission check in
// the app already uses (getEffectivePermissions), just run once per member
// instead of once for "the current logged-in user". Mirrors the recipient-
// selection pattern already established in src/lib/inventory/low-stock-notifier.ts.
async function getBusinessUserIdsWithPermission(
  businessId: string,
  permission: keyof BusinessPermissions
): Promise<string[]> {
  const memberships = await prisma.businessMemberships.findMany({
    where: { businessId, isActive: true },
    select: { userId: true, role: true, permissions: true, users: { select: { role: true } } },
  })

  const memberUserIds = memberships
    .filter(m => {
      if (m.users.role === 'admin') return true
      const perms = getEffectivePermissions(
        {
          id: m.userId,
          role: m.users.role,
          businessMemberships: [{ businessId, businessName: '', role: m.role, permissions: m.permissions, isActive: true }],
        },
        businessId
      )
      return perms[permission] === true
    })
    .map(m => m.userId)

  // System admins get full permissions everywhere (see isSystemAdmin/
  // getEffectivePermissions) but often have no BusinessMemberships row for a
  // business they manage directly — without this, a business with no formal
  // staff (common in this app: admin runs it solo, contractors log in via a
  // separate userId link, not a membership) would silently get zero
  // recipients and the notification would just vanish.
  const systemAdmins = await prisma.users.findMany({
    where: { role: 'admin', isActive: true },
    select: { id: true },
  })

  return [...new Set([...memberUserIds, ...systemAdmins.map(a => a.id)])]
}

// Fired right after a job is billed (invoice generated) — see MBM-266's
// two-step billing/payment split. Tells whoever can actually collect payment
// (same canAccessFinancialData gate Collect Payment itself requires) that an
// invoice is sitting there waiting, regardless of who billed it.
export async function notifyJobBilled(jobId: string, businessId: string, orderNumber: string, totalAmount: number): Promise<void> {
  try {
    const userIds = await getBusinessUserIdsWithPermission(businessId, 'canAccessFinancialData')
    if (userIds.length === 0) return

    await emitNotification({
      userIds,
      type: 'JOB_BILLED_AWAITING_PAYMENT',
      title: `Invoice ${orderNumber} awaiting payment`,
      message: `A vehicle-service job was billed for $${totalAmount.toFixed(2)} — collect payment when the customer arrives.`,
      linkUrl: `/vehicle-service/jobs/${jobId}`,
      metadata: { jobId, businessId, orderNumber, totalAmount },
    })
  } catch (err) {
    console.error('[vehicle-service notify] notifyJobBilled failed:', err)
  }
}

// A job with no work started yet — sat in 'open' longer than this without
// any task moving to in_progress — gets escalated to whoever can manage
// contractor assignments (canManageEmployees), so someone follows up.
// Overridable via env for verification only — unset in normal operation.
const STALE_OPEN_JOB_HOURS = Number(process.env.VEHICLE_SERVICE_STALE_JOB_HOURS) || 24

// Lazy, request-triggered check (no cron infrastructure in this app — see
// the same pattern already used by src/app/api/policies/pending/route.ts's
// due-soon reminders): called from the jobs list GET, so it runs whenever
// staff actually load the Jobs page, with a 24h dedupe per job so the same
// stale job doesn't re-notify on every page load.
export async function checkAndEscalateStaleJobs(businessId: string): Promise<void> {
  try {
    const threshold = new Date(Date.now() - STALE_OPEN_JOB_HOURS * 60 * 60 * 1000)
    const staleJobs = await prisma.vehicleServiceJobs.findMany({
      where: { businessId, status: 'open', createdAt: { lt: threshold } },
      select: { id: true, createdAt: true, vehicleMake: true, vehicleModel: true, vehiclePlate: true },
    })
    if (staleJobs.length === 0) return

    const userIds = await getBusinessUserIdsWithPermission(businessId, 'canManageEmployees')
    if (userIds.length === 0) return

    const dedupeWindow = new Date(Date.now() - 24 * 60 * 60 * 1000)

    for (const job of staleJobs) {
      const alreadyNotified = await prisma.appNotification.findFirst({
        where: {
          type: 'JOB_START_ESCALATION',
          userId: { in: userIds },
          createdAt: { gt: dedupeWindow },
          metadata: { path: ['jobId'], equals: job.id },
        },
        select: { id: true },
      })
      if (alreadyNotified) continue

      const vehicle = [job.vehicleMake, job.vehicleModel].filter(Boolean).join(' ') || 'Vehicle'
      const hoursOpen = Math.round((Date.now() - job.createdAt.getTime()) / (60 * 60 * 1000))

      await emitNotification({
        userIds,
        type: 'JOB_START_ESCALATION',
        title: `Job not started: ${vehicle}${job.vehiclePlate ? ` (${job.vehiclePlate})` : ''}`,
        message: `This job has been open for ${hoursOpen}h with no work started yet — check on it.`,
        linkUrl: `/vehicle-service/jobs/${job.id}`,
        metadata: { jobId: job.id, businessId },
      })
    }
  } catch (err) {
    console.error('[vehicle-service notify] checkAndEscalateStaleJobs failed:', err)
  }
}
