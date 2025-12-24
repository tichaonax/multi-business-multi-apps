/**
 * Printing Format Utilities
 * Smart formatting for data amounts and durations on receipts
 */

/**
 * Format data amount smartly
 * - Less than 1024 MB: show as MB
 * - 1024 MB or more: show as GB
 *
 * @example
 * formatDataAmount(500) // "500MB"
 * formatDataAmount(1024) // "1GB"
 * formatDataAmount(2048) // "2GB"
 * formatDataAmount(3584) // "3.5GB"
 */
export function formatDataAmount(megabytes: number): string {
  if (megabytes < 1024) {
    return `${megabytes}MB`
  }

  const gigabytes = megabytes / 1024
  // Show 1 decimal place if less than 10GB, otherwise whole number
  const formatted = gigabytes >= 10
    ? gigabytes.toFixed(0)
    : gigabytes.toFixed(1)

  return `${formatted}GB`
}

/**
 * Format duration smartly
 * - Less than 60 min: show as minutes
 * - Less than 24 hours: show as hours (with minutes if needed)
 * - 24 hours or more: show as days (with hours if needed)
 *
 * @example
 * formatDuration(30) // "30min"
 * formatDuration(60) // "1h"
 * formatDuration(90) // "1h 30m"
 * formatDuration(1440) // "1 day"
 * formatDuration(2880) // "2 days"
 * formatDuration(43200) // "30 days"
 */
export function formatDuration(minutes: number): string {
  // Less than 60 minutes
  if (minutes < 60) {
    return `${minutes}min`
  }

  // Less than 24 hours
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) {
      return `${hours}h`
    }
    return `${hours}h ${mins}m`
  }

  // 24 hours or more
  const days = Math.floor(minutes / 1440)
  const remainingHours = Math.floor((minutes % 1440) / 60)

  if (remainingHours === 0) {
    return days === 1 ? '1 day' : `${days} days`
  }

  return `${days}d ${remainingHours}h`
}

/**
 * Format duration for compact display (receipts)
 * Similar to formatDuration but more compact
 *
 * @example
 * formatDurationCompact(30) // "30m"
 * formatDurationCompact(60) // "1h"
 * formatDurationCompact(1440) // "1d"
 */
export function formatDurationCompact(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }

  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    return `${hours}h`
  }

  const days = Math.floor(minutes / 1440)
  return `${days}d`
}
