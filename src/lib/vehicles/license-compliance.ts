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

export type LicenseUrgency = 'OVERDUE' | 'CRITICAL' | 'HIGH'

export interface VehicleLicenseAlert {
  id: string
  licenseType: string
  licenseNumber: string
  expiryDate: Date
  daysUntilExpiry: number
  urgency: LicenseUrgency
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
  const licenses = await prisma.vehicleLicenses.findMany({
    where: {
      isActive: true,
      expiryDate: { lte: windowEnd },
      ...(vehicleId ? { vehicleId } : {}),
    },
    include: {
      vehicles: { select: { id: true, licensePlate: true, make: true, model: true } },
    },
    orderBy: { expiryDate: 'asc' },
  })

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
      vehicleId: l.vehicles.id,
      vehicleLicensePlate: l.vehicles.licensePlate,
      vehicleMake: l.vehicles.make,
      vehicleModel: l.vehicles.model,
    }
  })
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
