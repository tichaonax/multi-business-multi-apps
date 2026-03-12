/**
 * Get the current date in local timezone as YYYY-MM-DD format
 * This avoids timezone issues that occur with new Date().toISOString()
 */
export function getTodayLocalDateString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format a date as DD-MM-YYYY HH:mm (ZIM standard)
 * @param date Date or date string
 * @returns string in DD-MM-YYYY HH:mm
 */
export function formatDateTimeZim(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${day}-${month}-${year} ${hours}:${minutes}`
}
