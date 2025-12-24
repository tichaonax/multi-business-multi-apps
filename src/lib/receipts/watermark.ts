/**
 * Receipt Watermark Utility
 * Adds "RE-PRINT" watermark to thermal printer receipts
 */

/**
 * ESC/POS commands for thermal printers
 */
const ESC = '\x1B'
const GS = '\x1D'

// Text alignment
const ALIGN_CENTER = `${ESC}a1`
const ALIGN_LEFT = `${ESC}a0`

// Text formatting
const BOLD_ON = `${ESC}E1`
const BOLD_OFF = `${ESC}E0`
const DOUBLE_HEIGHT_ON = `${GS}!1` // Double height
const DOUBLE_SIZE_ON = `${GS}!17` // Double width AND double height
const NORMAL_SIZE = `${GS}!0`

// Line breaks
const NEWLINE = '\n'

/**
 * Add RE-PRINT watermark to receipt text (thermal printer)
 * Inserts watermark banner at top and bottom of receipt
 */
export function addReprintWatermark(
  receiptText: string,
  reprintedBy?: string,
  originalPrintDate?: Date
): string {
  const watermarkTop = buildWatermarkHeader(reprintedBy, originalPrintDate)
  const watermarkBottom = buildWatermarkFooter()

  return watermarkTop + receiptText + watermarkBottom
}

/**
 * Build watermark header for top of receipt
 */
function buildWatermarkHeader(
  reprintedBy?: string,
  originalPrintDate?: Date
): string {
  const now = new Date()
  const dateStr = now.toLocaleDateString()
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  let header = ''

  // Top separator line
  header += ALIGN_CENTER
  header += '━'.repeat(42) + NEWLINE
  header += NEWLINE

  // RE-PRINT banner in large, bold text
  header += DOUBLE_SIZE_ON + BOLD_ON
  header += '*** RE-PRINT ***' + NEWLINE
  header += NORMAL_SIZE + BOLD_OFF

  // Reprint info
  header += NEWLINE
  header += `Reprinted: ${dateStr} ${timeStr}` + NEWLINE

  if (reprintedBy) {
    header += `By: ${reprintedBy}` + NEWLINE
  }

  if (originalPrintDate) {
    const origDate = new Date(originalPrintDate)
    const origDateStr = origDate.toLocaleDateString()
    header += `Original: ${origDateStr}` + NEWLINE
  }

  header += NEWLINE
  header += '━'.repeat(42) + NEWLINE
  header += NEWLINE + NEWLINE

  // Reset to left alignment for receipt content
  header += ALIGN_LEFT

  return header
}

/**
 * Build watermark footer for bottom of receipt
 */
function buildWatermarkFooter(): string {
  let footer = ''

  footer += NEWLINE + NEWLINE

  // Bottom separator line
  footer += ALIGN_CENTER
  footer += '━'.repeat(42) + NEWLINE
  footer += NEWLINE

  // RE-PRINT banner again
  footer += DOUBLE_SIZE_ON + BOLD_ON
  footer += '*** RE-PRINT ***' + NEWLINE
  footer += NORMAL_SIZE + BOLD_OFF

  footer += NEWLINE
  footer += 'THIS IS A REPRINTED RECEIPT' + NEWLINE
  footer += 'NOT VALID FOR RETURNS/EXCHANGES' + NEWLINE
  footer += NEWLINE
  footer += '━'.repeat(42) + NEWLINE

  // Reset alignment
  footer += ALIGN_LEFT

  return footer
}

/**
 * Add RE-PRINT watermark for visual preview (HTML/React)
 * Returns CSS class names and text for visual display
 */
export function getReprintWatermarkStyles() {
  return {
    containerClass: 'relative',
    watermarkClass:
      'absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-10',
    watermarkTextClass:
      'text-6xl font-bold text-red-600 transform -rotate-45 select-none',
    watermarkText: 'RE-PRINT',
  }
}

/**
 * Format reprint date for display
 */
export function formatReprintDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
