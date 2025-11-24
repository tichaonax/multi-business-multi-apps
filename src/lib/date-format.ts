/**
 * Date Formatting Utilities
 * Centralized date formatting using Zimbabwe locale
 */

// Default locale for the application
// Using en-GB to ensure dd/mm/yyyy format (Zimbabwe follows British date format standards)
export const DEFAULT_LOCALE = 'en-GB' // British English for dd/mm/yyyy format
export const DEFAULT_TIMEZONE = 'Africa/Harare' // Zimbabwe timezone

/**
 * Format a date to Zimbabwe locale string
 */
export function formatDate(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...options,
  }

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, defaultOptions).format(dateObj)
}

/**
 * Format a date and time to Zimbabwe locale string
 */
export function formatDateTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false, // 24-hour format
    ...options,
  }

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, defaultOptions).format(dateObj)
}

/**
 * Format a date for display (e.g., "16 November 2025")
 */
export function formatDateLong(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj)
}

/**
 * Format a date for display with weekday (e.g., "Saturday, 16 November 2025")
 */
export function formatDateFull(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(dateObj)
}

/**
 * Format time only (e.g., "21:44:23")
 */
export function formatTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(dateObj)
}

/**
 * Format currency to Zimbabwe format
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}
