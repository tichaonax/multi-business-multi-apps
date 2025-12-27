/**
 * Configurable Receipt Formatter
 *
 * Dynamically adjusts receipt formatting based on printer's configured width
 * Supports 32, 42, and 48 character widths for different thermal printers
 */

import type { ReceiptData } from '@/types/printing';
import { formatDuration, formatDataAmount } from '@/lib/printing/format-utils';
import { formatPhoneNumberForDisplay } from '@/lib/country-codes';
import { formatDateTime, formatDate as formatDateOnly } from '@/lib/date-format';

export interface FormattingOptions {
  width: number; // Characters per line (32, 42, or 48)
}

const DEFAULT_WIDTH = 48;

// ESC/POS Commands
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';
const CUT = GS + 'V' + '\x41' + String.fromCharCode(3); // Partial cut
const ALIGN_LEFT = ESC + 'a' + String.fromCharCode(0);
const ALIGN_CENTER = ESC + 'a' + String.fromCharCode(1);
const ALIGN_RIGHT = ESC + 'a' + String.fromCharCode(2);

/**
 * Format receipt with configurable width
 */
export function formatReceipt(data: ReceiptData, options?: FormattingOptions): string {
  const width = options?.width || DEFAULT_WIDTH;
  let receipt = '';

  // Initialize printer and reset margins
  receipt += ESC + '@';  // Reset all settings
  receipt += ESC + 'l' + String.fromCharCode(0);  // Set left margin to 0

  // Header - Center aligned
  receipt += ALIGN_CENTER;
  receipt += centerText(data.businessName, width) + LF;
  if (data.businessAddress) {
    receipt += centerText(data.businessAddress, width) + LF;
  }
  if (data.businessPhone) {
    receipt += centerText(`Tel: ${formatPhoneNumberForDisplay(data.businessPhone)}`, width) + LF;
  }
  receipt += LF;

  // Receipt Type Label (for dual receipts)
  if (data.receiptType) {
    const label = data.receiptType === 'business' ? '--- BUSINESS COPY ---' : '--- CUSTOMER COPY ---';
    receipt += centerText(label, width) + LF;
    receipt += LF;
  }

  // Transaction Info - Left aligned
  receipt += ALIGN_LEFT;
  receipt += `Receipt: ${data.receiptNumber.formattedNumber}` + LF;
  receipt += `Date: ${formatDateTime(data.transactionDate)}` + LF;
  if (data.salespersonName) {
    receipt += `Salesperson: ${data.salespersonName}` + LF;
  }
  receipt += LF;

  // Items
  receipt += line('-', width) + LF;
  data.items.forEach((item) => {
    const itemLine = formatLineItem(
      item.name,
      item.quantity,
      item.unitPrice,
      item.totalPrice,
      width
    );
    receipt += itemLine;

    // Add barcode or SKU if present
    if (item.barcode) {
      receipt += `  UPC: ${item.barcode.code}` + LF;
    } else if (item.sku) {
      receipt += `  SKU: ${item.sku}` + LF;
    }
  });
  receipt += line('-', width) + LF;

  // Totals
  receipt += LF;
  receipt += formatTotal('Subtotal', data.subtotal, width);
  receipt += formatTotal('Tax', data.tax, width);
  if (data.discount && data.discount > 0) {
    receipt += formatTotal('Savings', -data.discount, width);
  }
  receipt += formatTotal('TOTAL', data.total, width, true);
  receipt += LF;

  // Payment
  receipt += `Payment: ${data.paymentMethod.toUpperCase()}` + LF;
  if (data.amountPaid) {
    receipt += formatTotal('Amount Paid', data.amountPaid, width);
  }
  if (data.changeDue && data.changeDue > 0) {
    receipt += formatTotal('Change', data.changeDue, width);
  }

  // WiFi Tokens (if any)
  // ESP32 WiFi Tokens Section
  if (data.wifiTokens && data.wifiTokens.length > 0) {
    receipt += LF;
    receipt += line('=', width) + LF;
    receipt += ALIGN_CENTER;
    receipt += centerText('ESP32 WiFi Access', width) + LF;
    receipt += ALIGN_LEFT;
    receipt += line('=', width) + LF;

    data.wifiTokens.forEach((token) => {
      receipt += `Package: ${token.packageName}` + LF;
      receipt += `Token: ${token.tokenCode}` + LF;

      // Only show duration and bandwidth on customer copy
      if (data.receiptType === 'customer') {
        receipt += `Duration: ${formatDuration(token.duration)}` + LF;

        // Show bandwidth for ESP32 tokens (convert to GB if needed)
        if (token.bandwidthDownMb || token.bandwidthUpMb) {
          const downBw = formatDataAmount(token.bandwidthDownMb || 0);
          const upBw = formatDataAmount(token.bandwidthUpMb || 0);
          receipt += `Bandwidth: ${downBw}/${upBw}` + LF;
        }

        if (token.ssid) {
          receipt += `Network: ${token.ssid}` + LF;
        }
        receipt += LF;
        receipt += wrapText('To connect: Join WiFi network and enter this token when prompted.', width) + LF;
      }
      receipt += LF;
    });
  }

  // R710 WiFi Tokens Section
  if (data.r710Tokens && data.r710Tokens.length > 0) {
    receipt += LF;
    receipt += line('=', width) + LF;
    receipt += ALIGN_CENTER;
    receipt += centerText('R710 WiFi Access', width) + LF;
    receipt += ALIGN_LEFT;
    receipt += line('=', width) + LF;

    data.r710Tokens.forEach((token: any) => {
      receipt += `Package: ${token.packageName}` + LF;
      receipt += `Password: ${token.password}` + LF;

      // Duration from durationValue + durationUnit (e.g., "4 Days")
      if (token.durationValue && token.durationUnit) {
        const durationUnit = token.durationUnit.split('_')[1] || '';
        receipt += `Duration: ${token.durationValue} ${durationUnit}` + LF;
      }

      // Expiration date if available
      if (token.expiresAt) {
        receipt += `Expires: ${formatDateTime(token.expiresAt)}` + LF;
      }

      // Network SSID/VLAN
      if (token.ssid) {
        receipt += `Network: ${token.ssid}` + LF;
      }
      receipt += LF;
      receipt += wrapText('To connect: Join the WiFi network above and use password to log in.', width) + LF;
      receipt += LF;
    });
  }

  // Footer - Center aligned
  receipt += LF;
  receipt += ALIGN_CENTER;
  if (data.umbrellaPhone) {
    receipt += centerText(`Support: ${formatPhoneNumberForDisplay(data.umbrellaPhone)}`, width) + LF;
  }
  if (data.footerMessage) {
    receipt += centerText(data.footerMessage, width) + LF;
  }
  receipt += centerText('Thank you for your business!', width) + LF;
  receipt += centerText('Please come again!', width) + LF;
  receipt += LF + LF + LF;

  // Cut paper
  receipt += CUT;

  return receipt;
}

/**
 * Center text within the given width
 */
function centerText(text: string, width: number): string {
  if (text.length >= width) {
    return text.substring(0, width);
  }
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(padding) + text;
}

/**
 * Create a line of repeated characters
 */
function line(char: string, width: number): string {
  return char.repeat(width);
}

/**
 * Format a line item with quantity and price
 */
function formatLineItem(
  name: string,
  qty: number,
  unitPrice: number,
  total: number,
  width: number
): string {
  const qtyStr = qty > 1 ? `${qty}x ` : '';
  const nameWithQty = `${qtyStr}${name}`;
  const totalStr = formatMoney(total);

  // Try to fit on one line
  if (nameWithQty.length + totalStr.length + 1 <= width) {
    const padding = width - nameWithQty.length - totalStr.length;
    return nameWithQty + ' '.repeat(padding) + totalStr + LF;
  } else {
    // Multi-line if name is too long
    // Truncate name to fit
    const maxNameLength = width - totalStr.length - 1;
    const truncatedName = nameWithQty.substring(0, maxNameLength);
    const padding = width - truncatedName.length - totalStr.length;
    return truncatedName + ' '.repeat(padding) + totalStr + LF;
  }
}

/**
 * Format a total line
 */
function formatTotal(label: string, amount: number, width: number, bold: boolean = false): string {
  const amountStr = formatMoney(amount);
  const padding = width - label.length - amountStr.length;

  let line = '';
  if (bold) {
    line += ESC + 'E' + String.fromCharCode(1); // Bold on
  }
  line += label + ' '.repeat(Math.max(1, padding)) + amountStr + LF;
  if (bold) {
    line += ESC + 'E' + String.fromCharCode(0); // Bold off
  }

  return line;
}

/**
 * Format money amount
 */
function formatMoney(amount: number | undefined | null): string {
  const safeAmount = typeof amount === 'number' ? amount : 0;
  return `$${safeAmount.toFixed(2)}`;
}

// Note: formatDateTime is now imported from @/lib/date-format for consistent global formatting

/**
 * Note: formatDuration and formatDataAmount are imported from format-utils
 * to avoid code duplication across the codebase
 */

/**
 * Wrap text to fit within width
 */
function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    if ((currentLine + word).length > width) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word + ' ';
    } else {
      currentLine += word + ' ';
    }
  });

  if (currentLine) lines.push(currentLine.trim());

  return lines.join(LF);
}

/**
 * Get recommended width for printer type
 */
export function getRecommendedWidth(printerType: string): number {
  // 80mm thermal printers typically support 48 characters
  // 58mm thermal printers typically support 32 characters
  // 72mm thermal printers typically support 42 characters

  if (printerType === 'receipt') {
    return 48; // Most common for 80mm receipt printers
  }

  return 48; // Default to 48
}

/**
 * Validate receipt width
 */
export function isValidWidth(width: number): boolean {
  return [32, 42, 48].includes(width);
}
