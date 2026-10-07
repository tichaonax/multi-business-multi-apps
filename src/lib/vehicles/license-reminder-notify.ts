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
import { prisma } from '@/lib/prisma'
import { getGeneralRoom, postSystemMessage } from '@/lib/chat/rooms'
import { emitToUsers } from '@/lib/customer-display/socket-server'
import {
  getVehicleLicenseAlerts,
  getDriverLicenseAlerts,
  getVehicleComplianceRecipients,
  type LicenseUrgency,
  type VehicleLicenseAlert,
  type DriverLicenseAlert,
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
        ? `${alert.licenseType} license #${alert.licenseNumber} for ${alert.vehicleLicensePlate} (${alert.vehicleMake} ${alert.vehicleModel}) expired ${Math.abs(alert.daysUntilExpiry)} day(s) ago, on ${alert.expiryDate.toDateString()}. Renew immediately.`
        : `${alert.licenseType} license #${alert.licenseNumber} for ${alert.vehicleLicensePlate} (${alert.vehicleMake} ${alert.vehicleModel}) expires in ${alert.daysUntilExpiry} day(s), on ${alert.expiryDate.toDateString()}.`

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

    await postLicenseComplianceChatDigest(vehicleAlerts, driverAlerts, recipientIds)

    return { vehicleLicenses: vehicleAlerts.length, driverLicenses: driverAlerts.length, notificationsSent }
  } catch (err) {
    console.error('[license-reminder-notify] sweepVehicleLicenseReminders failed:', err)
    return { vehicleLicenses: 0, driverLicenses: 0, notificationsSent: 0 }
  }
}

const CHAT_DIGEST_MARKER = '🚨 Vehicle & Driver License Compliance Alert'
const CHAT_DIGEST_MIN_INTERVAL_MS = 20 * 60 * 60 * 1000 // ~20h — once per nightly sweep, not once per throttled lazy trigger

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function daysLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} OVERDUE`
  if (days === 0) return 'expires today'
  return `${days} day${days === 1 ? '' : 's'} left`
}

function formatVehicleLine(a: VehicleLicenseAlert): string {
  return `• ${a.vehicleLicensePlate} — ${a.vehicleMake} ${a.vehicleModel}\n` +
    `  ${a.licenseType.replace(/_/g, ' ')} #${a.licenseNumber}\n` +
    `  Expires ${fmtDate(a.expiryDate)} — ${daysLabel(a.daysUntilExpiry)}`
}

function formatDriverLine(a: DriverLicenseAlert): string {
  return `• ${a.fullName} — Driver's license\n` +
    `  Expires ${fmtDate(a.licenseExpiry)} — ${daysLabel(a.daysUntilExpiry)}`
}

/**
 * Posts a single read-only system message into Team/General, visible ONLY
 * to recipientUserIds (canManageVehicles grantees + admins — the same list
 * the push notifications go to), summarizing every overdue/expiring license
 * in full detail (type, number, exact date, days remaining/overdue) — not
 * just the push notification's one-line-per-license version. Reuses the
 * same ChatMessageRecipients "private message" mechanism a targeted reply
 * already uses (see postSystemMessage), so it's genuinely not visible to
 * everyone in the room, not just visually hidden. No one can reply to it
 * (system messages have no sender; the client hides Reply/Edit/Delete for
 * them); opening the chat and seeing it is the "acknowledgement" — same
 * read-tracking every other message already gets, no separate mechanism
 * needed. Deduped to at most once per ~20h (one calendar sweep) regardless
 * of how many times the throttled lazy trigger fires in between.
 */
export async function postLicenseComplianceChatDigest(vehicleAlerts: VehicleLicenseAlert[], driverAlerts: DriverLicenseAlert[], recipientUserIds: string[]): Promise<void> {
  if (vehicleAlerts.length === 0 && driverAlerts.length === 0) return
  if (recipientUserIds.length === 0) return
  try {
    const room = await getGeneralRoom()

    const recent = await prisma.chatMessages.findFirst({
      where: {
        roomId: room.id,
        userId: null,
        message: { startsWith: CHAT_DIGEST_MARKER },
        createdAt: { gte: new Date(Date.now() - CHAT_DIGEST_MIN_INTERVAL_MS) },
      },
      select: { id: true },
    })
    if (recent) return // already posted a digest recently — avoid spamming the room

    const overdueVehicles = vehicleAlerts.filter(a => a.urgency === 'OVERDUE')
    const soonVehicles = vehicleAlerts.filter(a => a.urgency !== 'OVERDUE')
    const overdueDrivers = driverAlerts.filter(a => a.urgency === 'OVERDUE')
    const soonDrivers = driverAlerts.filter(a => a.urgency !== 'OVERDUE')

    const sections: string[] = [CHAT_DIGEST_MARKER, '']
    if (overdueVehicles.length + overdueDrivers.length > 0) {
      sections.push(`⛔ OVERDUE (${overdueVehicles.length + overdueDrivers.length})`)
      sections.push(...overdueVehicles.map(formatVehicleLine))
      sections.push(...overdueDrivers.map(formatDriverLine))
      sections.push('')
    }
    if (soonVehicles.length + soonDrivers.length > 0) {
      sections.push(`⚠️ Expiring soon (${soonVehicles.length + soonDrivers.length})`)
      sections.push(...soonVehicles.map(formatVehicleLine))
      sections.push(...soonDrivers.map(formatDriverLine))
      sections.push('')
    }
    sections.push('This is a read-only system alert, visible only to vehicle managers and admins — open it to acknowledge, then use the link below to renew in Fleet Management.')

    const message = sections.join('\n')
    const payload = await postSystemMessage(room.id, message, VEHICLES_OVERVIEW_LINK, recipientUserIds)
    emitToUsers(recipientUserIds, 'chat:message', payload)
  } catch (err) {
    console.error('[license-reminder-notify] postLicenseComplianceChatDigest failed:', err)
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
