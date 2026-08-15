import { getEffectivePermissions } from '@/lib/permission-utils'

// Shared gate for vehicle-service money that isn't contractor payout (labour
// rates, per-task customer pricing, total estimated cost) — same permission
// already used by the contractor payout-preview/payout endpoints, reused here
// for consistency rather than introducing a second "can see money" flag.
export function canViewFinancials(user: any, businessId: string): boolean {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canAccessFinancialData
}
