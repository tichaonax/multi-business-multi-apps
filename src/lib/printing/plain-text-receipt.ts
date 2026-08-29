/**
 * Plain-text receipt formatter — for copying the full receipt to the
 * clipboard so it can be pasted into an email to the customer. Deliberately
 * separate from generateReceipt() in receipt-templates.ts: that function's
 * output is interleaved with raw ESC/POS control bytes (ESC/GS alignment
 * and cut commands) meant for a thermal printer, not something readable if
 * pasted into an email body. This mirrors the same layout/information —
 * business header, items, totals, payment, WiFi/R710 tokens, footer — as
 * plain text a mail client renders correctly.
 */

import type { ReceiptData } from '@/types/printing'
import { formatPhoneNumberForDisplay } from '@/lib/country-codes'
import { formatDateTime } from '@/lib/date-format'

const WIDTH = 42
const RULE = '-'.repeat(WIDTH)
const DOUBLE_RULE = '='.repeat(WIDTH)

function money(n: number | undefined): string {
  return `$${(n ?? 0).toFixed(2)}`
}

function line(left: string, right: string): string {
  const space = Math.max(1, WIDTH - left.length - right.length)
  return left + ' '.repeat(space) + right
}

function center(text: string): string {
  const pad = Math.max(0, Math.floor((WIDTH - text.length) / 2))
  return ' '.repeat(pad) + text
}

/**
 * Formats a full receipt as plain text — same information as the printed
 * receipt, safe to paste into an email. Accepts a Partial<ReceiptData>
 * deliberately: the "completed order" summary this feeds is built ad hoc
 * in a few different places across the POS pages, not always a fully
 * populated ReceiptData, so every field here is optional/guarded rather
 * than assumed present.
 */
export function generatePlainTextReceipt(data: Partial<ReceiptData>): string {
  const out: string[] = []

  out.push(center(data.businessName || 'Receipt'))
  if (data.businessAddress) out.push(center(data.businessAddress))
  if (data.businessPhone) out.push(center(`Tel: ${formatPhoneNumberForDisplay(data.businessPhone)}`))
  if (data.businessEmail) out.push(center(data.businessEmail))
  out.push(DOUBLE_RULE)

  const formattedReceiptNumber = data.receiptNumber?.formattedNumber
  if (formattedReceiptNumber) out.push(line('Receipt #:', formattedReceiptNumber))
  if (data.transactionDate) out.push(line('Date:', formatDateTime(data.transactionDate)))
  if (data.transactionId) out.push(line('Transaction:', data.transactionId))
  if (data.salespersonName) out.push(line('Served by:', data.salespersonName))
  if (data.customerName) out.push(line('Customer:', data.customerName))
  if (data.customerPhone) out.push(line('Phone:', formatPhoneNumberForDisplay(data.customerPhone)))
  out.push(RULE)

  for (const item of data.items || []) {
    const qtyUnit = `${item.quantity}${item.unit ? item.unit : ''}`
    out.push(`${item.name}`)
    out.push(line(`  ${qtyUnit} x ${money(item.unitPrice)}`, money(item.totalPrice)))
    if (item.notes) out.push(`  (${item.notes})`)
  }
  out.push(RULE)

  out.push(line('Subtotal:', money(data.subtotal)))
  if (data.discount && data.discount > 0) {
    out.push(line(data.discountLabel || 'Discount:', `-${money(data.discount)}`))
  }
  if (!data.hideTax) out.push(line(data.taxLabel || 'Tax:', money(data.tax)))
  out.push(line('TOTAL:', money(data.total)))
  out.push(RULE)

  out.push(line('Payment Method:', data.paymentLabel || data.paymentMethod || 'N/A'))
  if (typeof data.amountPaid === 'number' && Number.isFinite(data.amountPaid) && data.amountPaid > 0) {
    out.push(line('Amount Paid:', money(data.amountPaid)))
  }
  if (typeof data.changeDue === 'number' && Number.isFinite(data.changeDue) && data.changeDue > 0) {
    out.push(line('Change Due:', money(data.changeDue)))
  }
  if (data.ecocashTransactionCode) {
    out.push(line('EcoCash Ref:', data.ecocashTransactionCode))
  }

  if (data.r710Tokens && data.r710Tokens.length > 0) {
    out.push(DOUBLE_RULE)
    out.push(center('WIFI ACCESS'))
    for (const token of data.r710Tokens) {
      out.push('')
      out.push(`Package: ${token.packageName}`)
      out.push(`Username: ${token.username}`)
      out.push(`Password: ${token.password}`)
      if (token.durationValue && token.durationUnit) {
        out.push(`Duration: ${token.durationValue} ${(token.durationUnit || '').split('_')[1] || token.durationUnit}`)
      }
    }
  }

  if (data.wifiTokens && data.wifiTokens.length > 0) {
    out.push(DOUBLE_RULE)
    out.push(center('WIFI ACCESS TOKENS'))
    for (const token of data.wifiTokens) {
      out.push('')
      out.push(`Package: ${token.packageName}`)
      out.push(`Token: ${token.tokenCode}`)
    }
  }

  out.push(DOUBLE_RULE)
  out.push(center(data.footerMessage || 'Thank you for your business!'))
  if (data.returnPolicy) out.push(center(data.returnPolicy))

  return out.join('\n')
}
