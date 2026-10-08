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
import { getOrCreateSystemAlertsRoom, postSystemMessage } from '@/lib/chat/rooms'
import { emitToUsers } from '@/lib/customer-display/socket-server'
import {
  getVehicleLicenseAlerts,
  getDriverLicenseAlerts,
  getVehicleComplianceRecipients,
  deactivateSupersededVehicleLicenses,
  type VehicleLicenseAlert,
  type DriverLicenseAlert,
} from './license-compliance'

// A single combined groupKey for every recipient's bell notification —
// previously one row per license/driver (vehicle-license-reminder:${id}),
// which meant a fleet with several overdue licenses buried the bell under
// a long, unmanageable list of near-identical rows. One upserted summary
// row per user (via emitGroupedNotification's existing upsert-on-groupKey
// behavior) replaces that; the full itemized breakdown already lives in
// both the Compliance Alerts panel (linkUrl below) and the System Alerts
// chat digest (postLicenseComplianceChatDigest).
function vehicleLicenseComplianceSummaryGroupKey(): string {
  return 'vehicle-license-compliance-summary'
}

const VEHICLES_OVERVIEW_LINK = '/vehicles?tab=overview'

export async function sweepVehicleLicenseReminders(options: { forceChatDigest?: boolean } = {}): Promise<{ vehicleLicenses: number; driverLicenses: number; notificationsSent: number }> {
  try {
    // Self-heal first: a vehicle should only ever have one active license
    // per type. Clearing out any stale duplicate before computing alerts
    // means a license that's genuinely already been renewed can't still
    // show up as overdue right alongside its own replacement.
    await deactivateSupersededVehicleLicenses().catch(err => {
      console.error('[license-reminder-notify] deactivateSupersededVehicleLicenses failed:', err)
    })

    const [vehicleAlerts, driverAlerts, recipientIds] = await Promise.all([
      getVehicleLicenseAlerts(),
      getDriverLicenseAlerts(),
      getVehicleComplianceRecipients(),
    ])

    let notificationsSent = 0
    const totalAlerts = vehicleAlerts.length + driverAlerts.length
    const groupKey = vehicleLicenseComplianceSummaryGroupKey()

    // One-time cleanup (safe to repeat — no-op once done): rows created
    // under the old per-license/per-driver groupKeys before this sweep
    // switched to a single combined summary row. Nothing clears those old
    // keys any more, so without this they sit in the bell forever,
    // alongside the new summary, making the "Vehicle & Licensing" group
    // look uncollapsed/ungrouped even though the new code is working.
    await prisma.appNotification.deleteMany({
      where: {
        OR: [
          { groupKey: { startsWith: 'vehicle-license-reminder:' } },
          { groupKey: { startsWith: 'driver-license-reminder:' } },
        ],
      },
    })

    if (totalAlerts === 0) {
      // Nothing outstanding any more — drop the summary row entirely rather
      // than leave a stale "0 alerts" notification sitting in the bell.
      await clearGroupedNotifications(groupKey)
    } else {
      const overdueCount =
        vehicleAlerts.filter(a => a.urgency === 'OVERDUE').length +
        driverAlerts.filter(a => a.urgency === 'OVERDUE').length
      const soonCount = totalAlerts - overdueCount
      const title = overdueCount > 0
        ? `⚠️ Action Needed: ${overdueCount} License${overdueCount === 1 ? '' : 's'} Overdue${soonCount > 0 ? `, ${soonCount} Expiring Soon` : ''}`
        : `⚠️ Action Needed: ${soonCount} License${soonCount === 1 ? '' : 's'} Expiring Soon`
      // Same itemized, per-vehicle/driver text the System Alerts chat digest
      // posts (buildComplianceDigestText) — not a separate terse sentence —
      // so the bell notification panel can parse and render it with the
      // exact same shared component (ComplianceDigestSections) instead of
      // reimplementing the formatting a second time.
      const message = buildComplianceDigestText(vehicleAlerts, driverAlerts).trimEnd()

      for (const userId of recipientIds) {
        await emitGroupedNotification({
          userId,
          type: overdueCount > 0 ? 'VEHICLE_LICENSE_OVERDUE' : 'VEHICLE_LICENSE_EXPIRING',
          title,
          message,
          linkUrl: VEHICLES_OVERVIEW_LINK,
          metadata: { overdueCount, soonCount, totalAlerts },
          groupKey,
        })
        notificationsSent++
      }
    }

    await postLicenseComplianceChatDigest(vehicleAlerts, driverAlerts, recipientIds, options.forceChatDigest)

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

// Trailing `ref:` line carries the vehicle/license ids so the chat UI can
// render a "Renew →" deep link straight to that license's Renew form
// (parseComplianceDigest in chat-window.tsx) — not shown to the reader,
// stripped out of the rendered card. Older stored messages predate this
// line; the parser treats it as optional for backward compatibility.
function formatVehicleLine(a: VehicleLicenseAlert): string {
  return `• ${a.vehicleLicensePlate} — ${a.vehicleMake} ${a.vehicleModel}\n` +
    `  ${a.licenseType.replace(/_/g, ' ')} #${a.licenseNumber}\n` +
    `  Expires ${fmtDate(a.expiryDate)} — ${daysLabel(a.daysUntilExpiry)}\n` +
    `  ref:${a.vehicleId}:${a.id}`
}

function formatDriverLine(a: DriverLicenseAlert): string {
  return `• ${a.fullName} — Driver's license\n` +
    `  Expires ${fmtDate(a.licenseExpiry)} — ${daysLabel(a.daysUntilExpiry)}\n` +
    `  ref:driver:${a.id}`
}

// Builds the itemized OVERDUE / Expiring soon breakdown shared by the bell
// notification's `message` and the System Alerts chat digest — one builder
// so the two can never drift apart in format, each appending its own footer
// (the chat digest's "read-only" line; the bell has none).
function buildComplianceDigestText(vehicleAlerts: VehicleLicenseAlert[], driverAlerts: DriverLicenseAlert[]): string {
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
  return sections.join('\n')
}

/**
 * Posts a single read-only system message into the dedicated "System
 * Alerts" room (see getOrCreateSystemAlertsRoom) — a genuinely separate
 * conversation, not Team/General with a per-message recipient filter —
 * since not everyone with chat access needs vehicle management visibility.
 * Room membership (canManageVehicles grantees + admins, the same list the
 * push notifications go to) is what restricts visibility here, same as any
 * other group room. Summarizes every overdue/expiring license in full
 * detail (type, number, exact date, days remaining/overdue) — not just the
 * push notification's one-line-per-license version. No one can reply (the
 * POST /api/chat/messages route rejects posts into a 'system' room; system
 * messages have no sender so the client hides Reply/Edit/Delete for them);
 * opening the chat and seeing it is the "acknowledgement" — same
 * read-tracking every other message already gets, no separate mechanism
 * needed. Deduped to at most once per ~20h (one calendar sweep) regardless
 * of how many times the throttled lazy trigger fires in between — unless
 * `force` is set (the manual admin test button), since a deliberate human
 * click isn't the automated-polling case this throttle exists to protect
 * against, and "nothing visibly happened" makes the button useless for
 * testing.
 */
export async function postLicenseComplianceChatDigest(vehicleAlerts: VehicleLicenseAlert[], driverAlerts: DriverLicenseAlert[], recipientUserIds: string[], force = false): Promise<void> {
  if (vehicleAlerts.length === 0 && driverAlerts.length === 0) return
  if (recipientUserIds.length === 0) return
  try {
    const room = await getOrCreateSystemAlertsRoom(recipientUserIds)

    if (!force) {
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
    }

    const message = buildComplianceDigestText(vehicleAlerts, driverAlerts) +
      'This is a read-only system alert — open it to acknowledge, then use the link below to renew in Fleet Management.'
    const payload = await postSystemMessage(room.id, message, VEHICLES_OVERVIEW_LINK)
    emitToUsers(recipientUserIds, 'chat:message', payload)
  } catch (err) {
    console.error('[license-reminder-notify] postLicenseComplianceChatDigest failed:', err)
  }
}

/** Recomputes the license-compliance summary immediately — call right after
 * a vehicle or driver license is renewed, so the bell/chat digest drop or
 * update it without waiting for the next throttled sweep. The groupKey is
 * now one shared summary row per recipient, not one per license, so there's
 * no single id to "clear" any more — a full resweep naturally drops the
 * renewed license/driver from the count (or clears the row entirely if
 * nothing else is outstanding). */
export async function resweepVehicleLicenseReminders(): Promise<void> {
  await sweepVehicleLicenseReminders()
}

let lastLazySweepAt = 0
const MIN_LAZY_SWEEP_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes — same throttle as the receipt-reminder lazy trigger

/** Lazy trigger for GET /api/notifications — same upsert logic as the cron sweep, throttled. */
export async function sweepVehicleLicenseRemindersThrottled(): Promise<void> {
  if (Date.now() - lastLazySweepAt < MIN_LAZY_SWEEP_INTERVAL_MS) return
  lastLazySweepAt = Date.now()
  await sweepVehicleLicenseReminders()
}
