import { getEffectivePermissions } from '@/lib/permission-utils'

// Shared gate for vehicle-service money that isn't contractor payout (labour
// rates, per-task customer pricing, total estimated cost) — same permission
// already used by the contractor payout-preview/payout endpoints, reused here
// for consistency rather than introducing a second "can see money" flag.
export function canViewFinancials(user: any, businessId: string): boolean {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || perms.canAccessFinancialData
}

// Vehicle Parts Inventory (MBM-268) — the blanket canManageInventory flag
// (create/edit/delete parts, same gate the existing Parts Requests issue/
// reject flow already uses) plus the finer vehicle_service-module tiers
// layered in by getMembershipPermissions() for receive/return/transfer/
// adjust/write-off/pricing.
export function canManagePartsInventory(user: any, businessId: string): boolean {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || !!perms.canManageInventory
}

export function canReceiveParts(user: any, businessId: string): boolean {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || !!perms.vehicle_service?.canReceiveStock
}

export function canProcessPartReturns(user: any, businessId: string): boolean {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || !!perms.vehicle_service?.canProcessReturns
}

export function canTransferParts(user: any, businessId: string): boolean {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || !!perms.vehicle_service?.canTransferStock
}

export function canAdjustParts(user: any, businessId: string): boolean {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || !!perms.vehicle_service?.canAdjustStock
}

export function canWriteOffParts(user: any, businessId: string): boolean {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || !!perms.vehicle_service?.canWriteOffStock
}

export function canSetPartPricing(user: any, businessId: string): boolean {
  const perms = getEffectivePermissions(user, businessId)
  return user.role === 'admin' || !!perms.vehicle_service?.canSetPartPricing
}
