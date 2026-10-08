// MBM-304: single source of truth for "which vehicle/driver licenses need
// attention, and how urgently" — shared by the Compliance Alerts report
// (src/app/api/vehicles/reports/route.ts) and the nightly reminder sweep
// (license-reminder-notify.ts) so the two can never disagree about what
// counts as needing action.
//
// Previously the report's own inline query used
// `expiryDate: { gte: new Date(), lte: +60d }` — the moment a license's
// expiry date passed, it silently dropped out of the query entirely. This
// module has no lower bound: an already-overdue license is the MOST urgent
// case, not an excluded one.

import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/audit'

export type LicenseUrgency = 'OVERDUE' | 'CRITICAL' | 'HIGH'

// MBM-305: distinguishes a standard registration/insurance/etc. alert from
// an exempt vehicle's exemption-license alert — spec §9.1 requires they
// never be merged under one generic label ("Vehicle License Expiry" vs
// "Vehicle Exemption Expiry").
export type LicenseAlertCategory = 'STANDARD' | 'EXEMPTION'

export interface VehicleLicenseAlert {
  id: string
  licenseType: string
  licenseNumber: string
  expiryDate: Date
  daysUntilExpiry: number
  urgency: LicenseUrgency
  alertCategory: LicenseAlertCategory
  vehicleId: string
  vehicleLicensePlate: string
  vehicleMake: string
  vehicleModel: string
}

export interface DriverLicenseAlert {
  id: string
  fullName: string
  licenseExpiry: Date
  daysUntilExpiry: number
  urgency: LicenseUrgency
}

const WARNING_WINDOW_DAYS = 60

function classify(daysUntilExpiry: number): LicenseUrgency {
  if (daysUntilExpiry < 0) return 'OVERDUE'
  if (daysUntilExpiry <= 7) return 'CRITICAL'
  return 'HIGH' // <= WARNING_WINDOW_DAYS, guaranteed by the query itself
}

export async function getVehicleLicenseAlerts(vehicleId?: string): Promise<VehicleLicenseAlert[]> {
  const windowEnd = new Date(Date.now() + WARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const rawLicenses = await prisma.vehicleLicenses.findMany({
    where: {
      isActive: true,
      expiryDate: { lte: windowEnd },
      ...(vehicleId ? { vehicleId } : {}),
      // MBM-305: retired vehicles stop all licensing tracking (spec §5.2,
      // §9.4) — excluded at the query level, not filtered after the fact,
      // so they can never leak into a count or a report by accident.
      vehicles: { licensingStatus: { not: 'RETIRED' } },
    },
    include: {
      vehicles: { select: { id: true, licensePlate: true, make: true, model: true, licensingStatus: true } },
    },
    orderBy: { expiryDate: 'asc' },
  }).then(rows => rows.filter(l =>
    // A non-exempt vehicle is only alerted on its standard licenses; an
    // exempt vehicle only on its exemption license — defensive filtering
    // even though a status transition already deactivates whatever doesn't
    // apply, same self-healing philosophy as the dedupe below.
    l.vehicles.licensingStatus === 'EXEMPT'
      ? l.licenseType === 'EXEMPTION'
      : l.licenseType !== 'EXEMPTION' // NON_EXEMPT
  ))

  // A vehicle should only ever carry one alert per license type. Renewing a
  // license is supposed to deactivate the record it replaces (see POST
  // /api/vehicles/licenses), but not every creation path does — a license
  // added via the Renewal Receipt flow, a bulk import, or any other path
  // that doesn't run that check can leave a stale isActive:true row behind
  // alongside the new one, which would otherwise surface as two alerts
  // (one overdue, one not) for what's really just one license that was
  // already renewed. Keep only the one with the latest expiryDate per
  // (vehicleId, licenseType) — that's unambiguously the current license.
  const latestPerVehicleAndType = new Map<string, (typeof rawLicenses)[number]>()
  for (const l of rawLicenses) {
    const key = `${l.vehicleId}:${l.licenseType}`
    const existing = latestPerVehicleAndType.get(key)
    if (!existing || l.expiryDate > existing.expiryDate) {
      latestPerVehicleAndType.set(key, l)
    }
  }
  const licenses = [...latestPerVehicleAndType.values()].sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime())

  const now = Date.now()
  return licenses.map(l => {
    const daysUntilExpiry = Math.floor((l.expiryDate.getTime() - now) / (24 * 60 * 60 * 1000))
    return {
      id: l.id,
      licenseType: l.licenseType,
      licenseNumber: l.licenseNumber,
      expiryDate: l.expiryDate,
      daysUntilExpiry,
      urgency: classify(daysUntilExpiry),
      alertCategory: l.licenseType === 'EXEMPTION' ? 'EXEMPTION' : 'STANDARD',
      vehicleId: l.vehicles.id,
      vehicleLicensePlate: l.vehicles.licensePlate,
      vehicleMake: l.vehicles.make,
      vehicleModel: l.vehicles.model,
    }
  })
}

/**
 * Permanently fixes the data, not just the alert view: whenever a vehicle
 * has more than one `isActive: true` license of the same type, deactivates
 * every one except the current (latest-expiry) record — same effect as the
 * create-route's own auto-deactivation (POST /api/vehicles/licenses), run
 * here as a self-heal for whichever creation path left the old record
 * active (confirmed happening for at least one vehicle's REGISTRATION
 * renewal, which didn't go through that endpoint). Called from the
 * compliance sweep, so it runs nightly, on the throttled lazy trigger, and
 * whenever an admin forces a sweep. Returns how many were deactivated, for
 * the sweep's own result summary.
 */
export async function deactivateSupersededVehicleLicenses(): Promise<number> {
  const active = await prisma.vehicleLicenses.findMany({
    where: { isActive: true },
    select: { id: true, vehicleId: true, licenseType: true, licenseNumber: true, expiryDate: true },
    orderBy: { expiryDate: 'desc' },
  })

  const byVehicleAndType = new Map<string, typeof active>()
  for (const l of active) {
    const key = `${l.vehicleId}:${l.licenseType}`
    const group = byVehicleAndType.get(key)
    if (group) group.push(l); else byVehicleAndType.set(key, [l])
  }

  let deactivatedCount = 0
  for (const group of byVehicleAndType.values()) {
    if (group.length < 2) continue
    // group is already sorted latest-expiry-first (inherited from the query
    // order) within each key's insertion order — re-sort defensively.
    const sorted = [...group].sort((a, b) => b.expiryDate.getTime() - a.expiryDate.getTime())
    const [current, ...superseded] = sorted
    for (const old of superseded) {
      await prisma.vehicleLicenses.update({ where: { id: old.id }, data: { isActive: false } })
      deactivatedCount++
      await createAuditLog({
        userId: 'admin-system-user-default',
        action: 'VEHICLE_LICENSE_DEACTIVATED',
        entityType: 'VehicleLicense',
        entityId: old.id,
        oldValues: { isActive: true, expiryDate: old.expiryDate },
        newValues: { isActive: false },
        metadata: {
          vehicleId: old.vehicleId,
          licenseType: old.licenseType,
          licenseNumber: old.licenseNumber,
          supersededBy: current.id,
          supersededByLicenseNumber: current.licenseNumber,
          reason: 'Auto-deactivated: superseded by a newer license of the same type (compliance sweep self-heal)',
        },
      }).catch(() => {})
    }
  }
  return deactivatedCount
}

export async function getDriverLicenseAlerts(driverId?: string): Promise<DriverLicenseAlert[]> {
  const windowEnd = new Date(Date.now() + WARNING_WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const drivers = await prisma.vehicleDrivers.findMany({
    where: {
      isActive: true,
      licenseExpiry: { not: null, lte: windowEnd },
      ...(driverId ? { id: driverId } : {}),
    },
    orderBy: { licenseExpiry: 'asc' },
  })

  const now = Date.now()
  return drivers
    .filter((d): d is typeof d & { licenseExpiry: Date } => d.licenseExpiry !== null)
    .map(d => {
      const daysUntilExpiry = Math.floor((d.licenseExpiry.getTime() - now) / (24 * 60 * 60 * 1000))
      return {
        id: d.id,
        fullName: d.fullName,
        licenseExpiry: d.licenseExpiry,
        daysUntilExpiry,
        urgency: classify(daysUntilExpiry),
      }
    })
}

/**
 * "Cashier and managers" for vehicle compliance — canManageVehicles is a
 * user-level permission (src/types/permissions.ts), not scoped per business
 * membership, which matches how vehicles are actually owned here (by
 * userId, not businessId). Same admin check as isSystemAdmin().
 */
export async function getVehicleComplianceRecipients(): Promise<string[]> {
  const users = await prisma.users.findMany({
    where: {
      isActive: true,
      OR: [
        { role: 'admin' },
        { permissions: { path: ['canManageVehicles'], equals: true } },
      ],
    },
    select: { id: true },
  })
  return users.map(u => u.id)
}
