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
