/**
 * Sweeps vehicle and driver licenses that are overdue or expiring within the
 * warning window and sends/refreshes a reminder to every "cashier and
 * manager" (canManageVehicles grantees + system admins — see
 * license-compliance.ts). Same emitGroupedNotification + groupKey pattern
 * as sweepOutstandingReceiptReminders (receipt-review-notify.ts): a repeat
 * daily run refreshes one notification row per recipient instead of piling
 * up a new one every day.
 *
 * Called both by the nightly cron (license-reminder-scheduler.ts) and
 * lazily from GET /api/notifications for immediacy — safe to call
 * repeatedly, it's idempotent per license/driver via the upsert.
 */

import { emitGroupedNotification, clearGroupedNotifications } from '@/lib/notifications/notification-emitter'
import {
  getVehicleLicenseAlerts,
  getDriverLicenseAlerts,
  getVehicleComplianceRecipients,
  type LicenseUrgency,
} from './license-compliance'

export function vehicleLicenseReminderGroupKey(licenseId: string): string {
  return `vehicle-license-reminder:${licenseId}`
}

export function driverLicenseReminderGroupKey(driverId: string): string {
  return `driver-license-reminder:${driverId}`
}

function actionTitle(urgency: LicenseUrgency, kind: 'Vehicle' | 'Driver'): string {
  return urgency === 'OVERDUE'
    ? `⚠️ Action Needed: ${kind} License Overdue`
    : `⚠️ Action Needed: ${kind} License Expiring Soon`
}

const VEHICLES_OVERVIEW_LINK = '/vehicles?tab=overview'

export async function sweepVehicleLicenseReminders(): Promise<{ vehicleLicenses: number; driverLicenses: number; notificationsSent: number }> {
  try {
    const [vehicleAlerts, driverAlerts, recipientIds] = await Promise.all([
      getVehicleLicenseAlerts(),
      getDriverLicenseAlerts(),
      getVehicleComplianceRecipients(),
    ])

    let notificationsSent = 0

    for (const alert of vehicleAlerts) {
      const groupKey = vehicleLicenseReminderGroupKey(alert.id)
      const title = actionTitle(alert.urgency, 'Vehicle')
      const message = alert.urgency === 'OVERDUE'
        ? `${alert.licenseType} license for ${alert.vehicleLicensePlate} (${alert.vehicleMake} ${alert.vehicleModel}) expired ${Math.abs(alert.daysUntilExpiry)} day(s) ago, on ${alert.expiryDate.toDateString()}. Renew immediately.`
        : `${alert.licenseType} license for ${alert.vehicleLicensePlate} (${alert.vehicleMake} ${alert.vehicleModel}) expires in ${alert.daysUntilExpiry} day(s), on ${alert.expiryDate.toDateString()}.`

      for (const userId of recipientIds) {
        await emitGroupedNotification({
          userId,
          type: alert.urgency === 'OVERDUE' ? 'VEHICLE_LICENSE_OVERDUE' : 'VEHICLE_LICENSE_EXPIRING',
          title,
          message,
          linkUrl: VEHICLES_OVERVIEW_LINK,
          metadata: { licenseId: alert.id, vehicleId: alert.vehicleId, urgency: alert.urgency },
          groupKey,
        })
        notificationsSent++
      }
    }

    for (const alert of driverAlerts) {
      const groupKey = driverLicenseReminderGroupKey(alert.id)
      const title = actionTitle(alert.urgency, 'Driver')
      const message = alert.urgency === 'OVERDUE'
        ? `${alert.fullName}'s driver license expired ${Math.abs(alert.daysUntilExpiry)} day(s) ago, on ${alert.licenseExpiry.toDateString()}. Renew immediately.`
        : `${alert.fullName}'s driver license expires in ${alert.daysUntilExpiry} day(s), on ${alert.licenseExpiry.toDateString()}.`

      for (const userId of recipientIds) {
        await emitGroupedNotification({
          userId,
          type: alert.urgency === 'OVERDUE' ? 'VEHICLE_LICENSE_OVERDUE' : 'VEHICLE_LICENSE_EXPIRING',
          title,
          message,
          linkUrl: VEHICLES_OVERVIEW_LINK,
          metadata: { driverId: alert.id, urgency: alert.urgency },
          groupKey,
        })
        notificationsSent++
      }
    }

    return { vehicleLicenses: vehicleAlerts.length, driverLicenses: driverAlerts.length, notificationsSent }
  } catch (err) {
    console.error('[license-reminder-notify] sweepVehicleLicenseReminders failed:', err)
    return { vehicleLicenses: 0, driverLicenses: 0, notificationsSent: 0 }
  }
}

/** Clears a vehicle license's reminder for everyone — call when it's renewed. */
export async function clearVehicleLicenseReminder(licenseId: string): Promise<void> {
  await clearGroupedNotifications(vehicleLicenseReminderGroupKey(licenseId))
}

/** Clears a driver license's reminder for everyone — call when it's renewed. */
export async function clearDriverLicenseReminder(driverId: string): Promise<void> {
  await clearGroupedNotifications(driverLicenseReminderGroupKey(driverId))
}

let lastLazySweepAt = 0
const MIN_LAZY_SWEEP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes — same throttle as the receipt-reminder lazy trigger

/** Lazy trigger for GET /api/notifications — same upsert logic as the cron sweep, throttled. */
export async function sweepVehicleLicenseRemindersThrottled(): Promise<void> {
  if (Date.now() - lastLazySweepAt < MIN_LAZY_SWEEP_INTERVAL_MS) return
  lastLazySweepAt = Date.now()
  await sweepVehicleLicenseReminders()
}
