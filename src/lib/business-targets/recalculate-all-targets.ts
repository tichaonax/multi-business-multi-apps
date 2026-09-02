import { prisma } from '@/lib/prisma'
import { recalculateBusinessTarget } from './recalculate-target'

// The app's own fixed, portable system-admin user id (scripts/create-admin.js
// creates it with this exact id in every environment) — used to attribute
// the BusinessTargetOverrideHistory rows a background job writes, since
// there's no human actor to credit. Falls back to whichever admin originally
// enabled target tracking for a business if that seeded user isn't present
// in a given environment, rather than hard-failing the nightly run.
const SYSTEM_ADMIN_ID = 'admin-system-user-default'

export interface RecalculateAllResult {
  businessesProcessed: number
  errors: { businessId: string; error: string }[]
}

/** MBM-288 §6 — recalculates every business with target tracking enabled. Called by the nightly cron job and available for a manual full run. */
export async function recalculateAllBusinessTargets(): Promise<RecalculateAllResult> {
  const systemUserExists = await prisma.users.findUnique({ where: { id: SYSTEM_ADMIN_ID }, select: { id: true } })

  const configs = await prisma.businessTargetConfig.findMany({
    where: { isEnabled: true },
    select: { businessId: true, createdBy: true },
  })

  const errors: { businessId: string; error: string }[] = []
  for (const config of configs) {
    try {
      const actingUserId = systemUserExists ? SYSTEM_ADMIN_ID : config.createdBy
      await recalculateBusinessTarget(config.businessId, actingUserId)
    } catch (error) {
      errors.push({ businessId: config.businessId, error: error instanceof Error ? error.message : String(error) })
    }
  }

  return { businessesProcessed: configs.length, errors }
}
