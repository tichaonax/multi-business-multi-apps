/**
 * Barcode Label Generator for Barcode Management System
 * Generates actual printable barcode labels using ESC/POS commands
 */

import { formatDate } from './date-format';
import { fitTemplateName } from './text-abbreviation';

interface BarcodeLabelOptions {
  barcodeData: string;
  symbology: string;
  itemName?: string;
  businessName?: string;
  templateName?: string;
  width: number;
  height: number;
  displayValue?: boolean;
  fontSize?: number;
  batchNumber?: string;
  quantity?: number; // Number of labels being printed (for quantity-batch format)
  customData?: {
    name?: string;
    barcodeValue?: string;
    productName?: string;
    description?: string;
    price?: string;
    size?: string;
    color?: string;
    [key: string]: any;
  };
  sku?: string;
}

/**
 * Generate a barcode label with ESC/POS commands for thermal/label printers
 * Format matches Goodwill-style labels with date, batch number, and price
 */
export function generateBarcodeLabel(options: BarcodeLabelOptions): string {
  const {
    barcodeData,
    symbology,
    itemName = '',
    businessName = '',
    templateName = '',
    displayValue = true,
    fontSize = 20,
    batchNumber = '',
    customData,
  } = options;

  let label = '';

  // ESC @ - Initialize printer
  label += '\x1B\x40';

  // Top fold line markers (vertical bars at 30% and 113% positions)
  // For 58mm thermal (32 chars wide): 30%=10 chars, 113%=36 chars
  label += '\x1B\x61\x00'; // Left alignment
  label += '      |   |                          |   |\n'; // Vertical fold markers at ~30% and ~113%

  // Print business name if provided (centered, emphasized)
  if (businessName) {
    label += '\x1B\x61\x01'; // Center alignment
    label += '\x1B\x21\x18'; // Double height and emphasized
    label += businessName + '\n';
    label += '\x1B\x21\x00'; // Reset size
  }

  // Print product name if provided (centered)
  const productName = customData?.productName || itemName;
  if (productName) {
    label += '\x1B\x61\x01'; // Center alignment
    label += '\x1B\x21\x08'; // Emphasized
    label += productName + '\n';
    label += '\x1B\x21\x00'; // Reset size
  }

  // Print description if provided (centered)
  if (customData?.description) {
    label += '\x1B\x61\x01'; // Center alignment
    label += '\x1B\x21\x00'; // Normal size
    label += customData.description + '\n';
  }

  // Print size if provided (centered, large number)
  if (customData?.size) {
    label += '\x1B\x61\x01'; // Center alignment
    label += '\x1B\x21\x30'; // Double width and height
    label += customData.size + '\n';
    label += '\x1B\x21\x00'; // Reset size
  }

  // Print date and batch number (centered, with quantity-batch format)
  const currentDate = formatDate(new Date());
  // Format batch as "quantity-batchId" (e.g., "50-A01") if quantity provided
  const formattedBatch = options.quantity && batchNumber
    ? `${options.quantity}-${batchNumber}`
    : batchNumber || '';
  const batch = formattedBatch ? ` ${formattedBatch}` : '';

  if (currentDate || batch) {
    label += '\x1B\x61\x01'; // Center alignment
    label += '\x1B\x21\x00'; // Normal size
    label += currentDate + batch + '\n';
  }

  // Center alignment for barcode
  label += '\x1B\x61\x01';

  // Generate barcode based on symbology
  label += generateBarcodeCommand(barcodeData, symbology);

  // Print human-readable value below barcode if enabled (centered)
  if (displayValue) {
    label += '\n';
    label += '\x1B\x61\x01'; // Center alignment
    label += barcodeData + '\n';
  }

  // Print SKU label if provided and different from barcode value (centered, bold)
  if (options.sku && options.sku !== barcodeData) {
    label += '\x1B\x61\x01'; // Center alignment
    label += '\x1B\x21\x08'; // Emphasized (bold)
    label += 'SKU: ' + options.sku + '\n';
    label += '\x1B\x21\x00'; // Reset size
  }

  // Add minimal spacing before price
  label += '\n';

  // Print price if provided (centered, LARGE at bottom - like Goodwill)
  if (customData?.price) {
    label += '\x1B\x61\x01'; // Center alignment
    label += '\x1B\x21\x30'; // Double width and height
    const formattedPrice = parseFloat(customData.price).toFixed(2);
    label += '$ ' + formattedPrice + '\n';
    label += '\x1B\x21\x00'; // Reset size
  }

  // Print color/descriptor if provided (centered)
  if (customData?.color) {
    label += '\x1B\x61\x01'; // Center alignment
    label += '\x1B\x21\x00'; // Normal size
    label += customData.color + '\n';
  }

  // Print template name at bottom (centered, fine print, 40-char abbreviation)
  if (templateName) {
    label += '\x1B\x61\x01'; // Center alignment
    label += '\x1B\x21\x01'; // Font B (smaller than normal)
    const abbreviatedName = fitTemplateName(templateName, 40);
    label += abbreviatedName + '\n';
    label += '\x1B\x21\x00'; // Reset to normal size
  }

  // Bottom fold line markers (vertical bars at 30% and 113% positions)
  label += '\x1B\x61\x00'; // Left alignment
  label += '      |   |                          |   |\n'; // Vertical fold markers at ~30% and ~113%

  // Add extra feed before cut to ensure all content prints
  label += '\n\n\n';
  label += '\x1D\x56\x01'; // GS V 1 (partial cut)

  return label;
}

/**
 * Generate ESC/POS barcode command based on symbology
 */
function generateBarcodeCommand(data: string, symbology: string): string {
  let command = '';

  // Set barcode height (GS h n) - 97 dots (about 12mm) - reduced by 40% from 162
  command += '\x1D\x68\x61';

  // Set barcode width (GS w n) - auto-scale based on data length
  // For 58mm thermal printers (~384 dots width):
  // - Short barcodes (≤10 chars): width 3 (moderate)
  // - Long barcodes (>10 chars): width 2 (narrow) to fit on paper
  const barcodeWidth = data.length <= 10 ? 3 : 2;
  command += '\x1D\x77' + String.fromCharCode(barcodeWidth);

  // Set HRI (Human Readable Interpretation) position (GS H n)
  // 0 = not printed, 1 = above, 2 = below, 3 = both
  // Set to 0 since we manually print the barcode value
  command += '\x1D\x48\x00'; // No HRI (we print it manually)

  // Select barcode type and print (GS k m d1...dk NUL)
  command += '\x1D\x6B';

  // Map symbology to ESC/POS barcode type
  let barcodeType: number;
  let formattedData = data;

  switch (symbology.toLowerCase()) {
    case 'upca':
    case 'upc-a':
      barcodeType = 0; // UPC-A
      // UPC-A requires 11 or 12 digits
      formattedData = data.replace(/\D/g, '').substring(0, 12);
      while (formattedData.length < 11) {
        formattedData = '0' + formattedData;
      }
      break;

    case 'upce':
    case 'upc-e':
      barcodeType = 1; // UPC-E
      formattedData = data.replace(/\D/g, '').substring(0, 8);
      break;

    case 'ean13':
    case 'ean-13':
      barcodeType = 2; // EAN13
      formattedData = data.replace(/\D/g, '').substring(0, 13);
      while (formattedData.length < 13) {
        formattedData = '0' + formattedData;
      }
      break;

    case 'ean8':
    case 'ean-8':
      barcodeType = 3; // EAN8
      formattedData = data.replace(/\D/g, '').substring(0, 8);
      break;

    case 'code39':
      barcodeType = 4; // CODE39
      break;

    case 'itf':
      barcodeType = 5; // ITF (Interleaved 2 of 5)
      formattedData = data.replace(/\D/g, '');
      break;

    case 'codabar':
      barcodeType = 6; // CODABAR
      break;

    case 'code93':
      barcodeType = 7; // CODE93
      break;

    case 'code128':
    default:
      barcodeType = 73; // CODE128 (GS k 73)
      // ✅ FIX: Add mandatory subset B prefix for alphanumeric
      formattedData = '{B' + data;
      break;
  }

  // Add barcode type
  command += String.fromCharCode(barcodeType);

  // Add data length (for CODE128 only)
  if (barcodeType === 73) {
    command += String.fromCharCode(formattedData.length);
  }

  // Add barcode data
  command += formattedData;

  // ✅ FIX: Add null terminator for linear barcode types only (0-6)
  if ([0, 1, 2, 3, 4, 5, 6].includes(barcodeType)) {
    command += '\x00';
  }

  return command;
}

/**
 * Generate multiple labels on a single page (for cutting)
 * Returns ESC/POS formatted string with multiple labels
 */
export function generateMultipleLabels(
  options: BarcodeLabelOptions,
  quantity: number,
  labelsPerRow: number = 2
): string {
  let output = '';

  // Initialize printer
  output += '\x1B\x40';

  for (let i = 0; i < quantity; i++) {
    // Generate individual label
    const label = generateBarcodeLabel(options);

    // Add label to output
    output += label;

    // Add page break after each label for cutting
    // (For continuous feed, you might want to adjust this)
    if ((i + 1) % labelsPerRow === 0) {
      output += '\x0C'; // Form feed
    }
  }

  return output;
}

/**
 * Validate barcode data for specific symbology
 */
export function validateBarcodeData(data: string, symbology: string): {
  valid: boolean;
  error?: string;
  formatted?: string;
} {
  const sym = symbology.toLowerCase();

  switch (sym) {
    case 'upca':
    case 'upc-a':
      const upcaDigits = data.replace(/\D/g, '');
      if (upcaDigits.length < 11 || upcaDigits.length > 12) {
        return { valid: false, error: 'UPC-A requires 11 or 12 digits' };
      }
      return { valid: true, formatted: upcaDigits };

    case 'ean13':
    case 'ean-13':
      const ean13Digits = data.replace(/\D/g, '');
      if (ean13Digits.length !== 13) {
        return { valid: false, error: 'EAN-13 requires exactly 13 digits' };
      }
      return { valid: true, formatted: ean13Digits };

    case 'code39':
      // ✅ FIX: Full CODE39 character set (A-Z0-9 + -.$/+% * /)
      if (!/^[A-Z0-9\-.\$\\/\+% *]+$/.test(data)) {
        return { valid: false, error: 'CODE39 only supports A-Z, 0-9, -.$/+ % * /' };
      }
      return { valid: true, formatted: data };

    case 'code128':
      // CODE128 supports all ASCII characters
      return { valid: true, formatted: data };

    default:
      return { valid: true, formatted: data };
  }
}
