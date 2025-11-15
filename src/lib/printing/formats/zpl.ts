/**
 * ZPL Format Converter
 * Converts label data to ZPL (Zebra Programming Language) commands
 * ZPL is used by Zebra label printers
 */

import type { ZPLOptions, ZPLCommand } from '@/types/printing';

// Default ZPL settings
const DEFAULT_DPI = 203; // dots per inch
const DEFAULT_LABEL_WIDTH = 400; // dots (approximately 2 inches at 203 DPI)
const DEFAULT_LABEL_HEIGHT = 600; // dots (approximately 3 inches at 203 DPI)

/**
 * Convert label text to ZPL commands
 */
export function convertToZPL(
  labelData: { text: string; barcode?: { data: string; format?: string } },
  options: ZPLOptions = {}
): string {
  const { labelWidth = DEFAULT_LABEL_WIDTH, labelHeight = DEFAULT_LABEL_HEIGHT, dpi = DEFAULT_DPI } = options;

  let zpl = '';

  // Start ZPL command
  zpl += '^XA'; // Start format

  // Set label home position
  zpl += '^LH0,0'; // Label Home at 0,0

  // Set print width
  zpl += `^PW${labelWidth}`;

  // Parse and position text
  const lines = labelData.text.split('\n');
  let yPosition = 20; // Starting Y position

  lines.forEach((line) => {
    if (line.trim()) {
      // Check if line is centered (has leading spaces)
      const isCentered = line !== line.trimStart() && line !== line.trimEnd();

      if (isCentered) {
        // Center text
        zpl += centerTextZPL(line.trim(), yPosition, labelWidth);
      } else if (line.includes('$') && !line.includes(':')) {
        // Price line - make it larger
        zpl += createTextField(line.trim(), labelWidth / 2, yPosition, { size: 50, centered: true });
      } else {
        // Regular text
        zpl += createTextField(line.trim(), 10, yPosition, { size: 25 });
      }

      yPosition += 40; // Move down for next line
    }
  });

  // Add barcode if provided
  if (labelData.barcode) {
    const barcodeY = yPosition + 20;
    zpl += createBarcodeZPL(labelData.barcode.data, labelWidth / 2, barcodeY, labelData.barcode.format || 'code128');
  }

  // End ZPL command
  zpl += '^XZ'; // End format

  return zpl;
}

/**
 * Create a text field in ZPL
 */
function createTextField(
  text: string,
  x: number,
  y: number,
  options: { size?: number; centered?: boolean; bold?: boolean } = {}
): string {
  const { size = 25, centered = false, bold = false } = options;

  let zpl = '';

  // Field origin
  zpl += `^FO${Math.round(x)},${Math.round(y)}`;

  // Font selection (A = 9pt, 0 = normal orientation)
  zpl += '^A0N,' + size + ',' + size;

  // Field data
  zpl += `^FD${text}^FS`;

  return zpl;
}

/**
 * Center text in ZPL
 */
function centerTextZPL(text: string, y: number, labelWidth: number, fontSize: number = 25): string {
  // Approximate character width (in dots)
  const charWidth = fontSize * 0.6;
  const textWidth = text.length * charWidth;
  const x = (labelWidth - textWidth) / 2;

  return createTextField(text, Math.max(0, x), y, { size: fontSize, centered: true });
}

/**
 * Create barcode in ZPL
 */
function createBarcodeZPL(data: string, x: number, y: number, format: string = 'code128'): string {
  let zpl = '';

  // Field origin
  zpl += `^FO${Math.round(x - 100)},${Math.round(y)}`;

  switch (format.toLowerCase()) {
    case 'code128':
      // ^BC = Code 128 barcode
      // N = normal orientation
      // 100 = height in dots
      // Y = print interpretation line
      // N = no interpretation line above
      zpl += '^BCN,100,Y,N,N';
      break;

    case 'code39':
      // ^B3 = Code 39 barcode
      zpl += '^B3N,N,100,Y,N';
      break;

    case 'qr':
      // ^BQ = QR code
      // N = normal orientation
      // 2 = model 2
      // 10 = magnification factor
      zpl += '^BQN,2,10';
      break;

    case 'ean13':
      // ^BE = EAN-13 barcode
      zpl += '^BEN,100,Y,N';
      break;

    case 'upca':
      // ^BU = UPC-A barcode
      zpl += '^BUN,100,Y,N,Y';
      break;

    default:
      // Default to Code 128
      zpl += '^BCN,100,Y,N,N';
  }

  // Field data
  zpl += `^FD${data}^FS`;

  return zpl;
}

/**
 * Execute ZPL commands
 */
export function executeZPLCommands(commands: ZPLCommand[], options: ZPLOptions = {}): string {
  const { labelWidth = DEFAULT_LABEL_WIDTH, labelHeight = DEFAULT_LABEL_HEIGHT } = options;

  let zpl = '';

  // Start format
  zpl += '^XA';
  zpl += '^LH0,0';
  zpl += `^PW${labelWidth}`;

  // Process commands
  commands.forEach((cmd) => {
    switch (cmd.type) {
      case 'field':
        zpl += `^FO${cmd.x},${cmd.y}`;
        zpl += `^A0N,${cmd.data.size || 25},${cmd.data.size || 25}`;
        zpl += `^FD${cmd.data.text}^FS`;
        break;

      case 'barcode':
        zpl += createBarcodeZPL(cmd.data.text, cmd.x, cmd.y, cmd.data.format);
        break;

      case 'box':
        zpl += `^FO${cmd.x},${cmd.y}`;
        zpl += `^GB${cmd.data.width},${cmd.data.height},${cmd.data.thickness || 2}^FS`;
        break;

      case 'line':
        zpl += `^FO${cmd.x},${cmd.y}`;
        zpl += `^GB${cmd.data.length},0,${cmd.data.thickness || 2}^FS`;
        break;

      case 'graphic':
        // Graphic commands would require more complex processing
        break;
    }
  });

  // End format
  zpl += '^XZ';

  return zpl;
}

/**
 * Create a box (rectangle) in ZPL
 */
export function createBox(x: number, y: number, width: number, height: number, thickness: number = 2): string {
  return `^FO${x},${y}^GB${width},${height},${thickness}^FS`;
}

/**
 * Create a line in ZPL
 */
export function createLine(x: number, y: number, length: number, thickness: number = 2): string {
  return `^FO${x},${y}^GB${length},0,${thickness}^FS`;
}

/**
 * Set label dimensions
 */
export function setLabelDimensions(width: number, height: number): string {
  return `^PW${width}^LL${height}`;
}

/**
 * Set print speed (2-14 inches per second)
 */
export function setPrintSpeed(speed: number): string {
  return `^PR${Math.max(2, Math.min(14, speed))}`;
}

/**
 * Set print darkness (0-30)
 */
export function setPrintDarkness(darkness: number): string {
  return `^MD${Math.max(0, Math.min(30, darkness))}`;
}

/**
 * Print multiple copies
 */
export function setPrintQuantity(quantity: number): string {
  return `^PQ${quantity}`;
}

/**
 * Validate ZPL command
 */
export function validateZPL(zpl: string): boolean {
  // Basic validation: should start with ^XA and end with ^XZ
  return zpl.trim().startsWith('^XA') && zpl.trim().endsWith('^XZ');
}

/**
 * Add image to ZPL (converts base64 to ZPL graphic)
 * Note: This is a simplified version - full implementation would require
 * image processing to convert to ZPL-compatible format
 */
export function addImageZPL(x: number, y: number, base64Data: string): string {
  // This is a placeholder - actual implementation would convert
  // image to ZPL graphic field format (^GF command)
  return `^FO${x},${y}^GFA,... [image data would go here] ^FS`;
}
