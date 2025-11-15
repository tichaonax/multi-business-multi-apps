/**
 * Label Generator
 * Generates SKU labels with barcodes for inventory items
 * Supports business-specific label formats
 */

import type {
  LabelData,
  ClothingLabelData,
  GroceryLabelData,
  HardwareLabelData,
  ConstructionLabelData,
  VehiclesLabelData,
  LabelFormat
} from '@/types/printing';

// Label dimensions (for thermal label printers)
const LABEL_WIDTH = 48; // characters per line for text labels
const LABEL_HEIGHT_MM = 50; // Standard 50mm label height

/**
 * Generate label content based on format and business type
 */
export function generateLabel(data: LabelData): string {
  switch (data.labelFormat) {
    case 'with-price':
      return generateLabelWithPrice(data);
    case 'compact':
      return generateCompactLabel(data);
    case 'business-specific':
      return generateBusinessSpecificLabel(data);
    default:
      return generateStandardLabel(data);
  }
}

/**
 * Standard label format (SKU + Name + Barcode)
 */
function generateStandardLabel(data: LabelData): string {
  let label = '';

  // Business name (optional)
  if (data.businessName) {
    label += centerText(data.businessName, LABEL_WIDTH) + '\n';
    label += line('-', LABEL_WIDTH) + '\n';
  }

  // SKU
  label += `SKU: ${data.sku}\n`;

  // Item name
  label += wrapText(data.itemName, LABEL_WIDTH) + '\n';

  // Barcode placeholder (actual barcode would be rendered by printer)
  label += '\n';
  label += centerText('[BARCODE]', LABEL_WIDTH) + '\n';
  label += centerText(data.barcode.data, LABEL_WIDTH) + '\n';

  return label;
}

/**
 * Label with price
 */
function generateLabelWithPrice(data: LabelData): string {
  let label = '';

  // Business name
  if (data.businessName) {
    label += centerText(data.businessName, LABEL_WIDTH) + '\n';
    label += line('-', LABEL_WIDTH) + '\n';
  }

  // Item name
  label += wrapText(data.itemName, LABEL_WIDTH) + '\n';
  label += '\n';

  // SKU
  label += `SKU: ${data.sku}\n`;

  // Price (large and centered)
  if (data.price !== undefined) {
    const priceStr = `$${data.price.toFixed(2)}`;
    label += '\n';
    label += centerText(priceStr, LABEL_WIDTH) + '\n';
    label += '\n';
  }

  // Barcode
  label += centerText('[BARCODE]', LABEL_WIDTH) + '\n';
  label += centerText(data.barcode.data, LABEL_WIDTH) + '\n';

  return label;
}

/**
 * Compact label (minimal info)
 */
function generateCompactLabel(data: LabelData): string {
  let label = '';

  // Name (truncated if too long)
  const maxNameLength = LABEL_WIDTH - 2;
  const truncatedName = data.itemName.length > maxNameLength
    ? data.itemName.substring(0, maxNameLength - 3) + '...'
    : data.itemName;

  label += truncatedName + '\n';

  // SKU + Price on same line
  let line2 = `SKU:${data.sku}`;
  if (data.price !== undefined) {
    const priceStr = `$${data.price.toFixed(2)}`;
    const padding = LABEL_WIDTH - line2.length - priceStr.length;
    line2 += ' '.repeat(Math.max(1, padding)) + priceStr;
  }
  label += line2 + '\n';

  // Barcode
  label += centerText('[BC]', LABEL_WIDTH) + '\n';

  return label;
}

/**
 * Business-specific label formats
 */
function generateBusinessSpecificLabel(data: LabelData): string {
  switch (data.businessType) {
    case 'clothing':
      return generateClothingLabel(data);
    case 'grocery':
      return generateGroceryLabel(data);
    case 'hardware':
      return generateHardwareLabel(data);
    case 'construction':
      return generateConstructionLabel(data);
    case 'vehicles':
      return generateVehiclesLabel(data);
    default:
      return generateStandardLabel(data);
  }
}

/**
 * Clothing-specific label (with size/color)
 */
function generateClothingLabel(data: LabelData): string {
  const clothingData = data.businessSpecificData as ClothingLabelData;
  let label = '';

  // Brand name if available
  if (clothingData?.brand) {
    label += centerText(clothingData.brand, LABEL_WIDTH) + '\n';
    label += line('-', LABEL_WIDTH) + '\n';
  } else if (data.businessName) {
    label += centerText(data.businessName, LABEL_WIDTH) + '\n';
    label += line('-', LABEL_WIDTH) + '\n';
  }

  // Item name
  label += wrapText(data.itemName, LABEL_WIDTH) + '\n';

  // Size and Color
  if (clothingData?.size || clothingData?.color) {
    const details = [];
    if (clothingData.size) details.push(`Size: ${clothingData.size}`);
    if (clothingData.color) details.push(`Color: ${clothingData.color}`);
    label += details.join(' | ') + '\n';
  }

  // Season tag
  if (clothingData?.season) {
    label += `${clothingData.season}\n`;
  }

  // SKU and Style Number
  label += `SKU: ${data.sku}\n`;
  if (clothingData?.styleNumber) {
    label += `Style: ${clothingData.styleNumber}\n`;
  }

  // Price
  if (data.price !== undefined) {
    const priceStr = `$${data.price.toFixed(2)}`;
    label += '\n';
    label += centerText(priceStr, LABEL_WIDTH) + '\n';
  }

  // Barcode
  label += '\n';
  label += centerText('[BARCODE]', LABEL_WIDTH) + '\n';
  label += centerText(data.barcode.data, LABEL_WIDTH) + '\n';

  return label;
}

/**
 * Grocery-specific label (with expiration)
 */
function generateGroceryLabel(data: LabelData): string {
  const groceryData = data.businessSpecificData as GroceryLabelData;
  let label = '';

  // Item name
  label += wrapText(data.itemName, LABEL_WIDTH) + '\n';
  label += '\n';

  // Category
  if (groceryData?.category) {
    label += `${groceryData.category}\n`;
  }

  // Weight/Unit
  if (groceryData?.weight && groceryData?.unit) {
    label += `Weight: ${groceryData.weight} ${groceryData.unit}\n`;
  }

  // Pack date
  if (groceryData?.packDate) {
    label += `Packed: ${formatDate(groceryData.packDate)}\n`;
  }

  // Expiration date (prominently displayed)
  if (groceryData?.expirationDate) {
    label += '\n';
    label += centerText('EXPIRES', LABEL_WIDTH) + '\n';
    label += centerText(formatDate(groceryData.expirationDate), LABEL_WIDTH) + '\n';
    label += '\n';
  }

  // Price
  if (data.price !== undefined) {
    label += centerText(`$${data.price.toFixed(2)}`, LABEL_WIDTH) + '\n';
  }

  // SKU
  label += `SKU: ${data.sku}\n`;

  // Barcode
  label += centerText('[BARCODE]', LABEL_WIDTH) + '\n';
  label += centerText(data.barcode.data, LABEL_WIDTH) + '\n';

  return label;
}

/**
 * Hardware-specific label (with dimensions)
 */
function generateHardwareLabel(data: LabelData): string {
  const hardwareData = data.businessSpecificData as HardwareLabelData;
  let label = '';

  // Manufacturer
  if (hardwareData?.manufacturer) {
    label += centerText(hardwareData.manufacturer, LABEL_WIDTH) + '\n';
    label += line('-', LABEL_WIDTH) + '\n';
  }

  // Item name
  label += wrapText(data.itemName, LABEL_WIDTH) + '\n';

  // Model number
  if (hardwareData?.model) {
    label += `Model: ${hardwareData.model}\n`;
  }

  // Dimensions (for cut-to-size items)
  if (hardwareData?.dimensions) {
    label += `Dim: ${hardwareData.dimensions}\n`;
  }

  // Location in warehouse
  if (hardwareData?.location) {
    label += `Loc: ${hardwareData.location}\n`;
  }

  // SKU
  label += `SKU: ${data.sku}\n`;

  // Price
  if (data.price !== undefined) {
    label += '\n';
    label += centerText(`$${data.price.toFixed(2)}`, LABEL_WIDTH) + '\n';
  }

  // Barcode
  label += '\n';
  label += centerText('[BARCODE]', LABEL_WIDTH) + '\n';
  label += centerText(data.barcode.data, LABEL_WIDTH) + '\n';

  return label;
}

/**
 * Construction-specific label (for materials)
 */
function generateConstructionLabel(data: LabelData): string {
  const constructionData = data.businessSpecificData as ConstructionLabelData;
  let label = '';

  // Project code (prominent)
  if (constructionData?.projectCode) {
    label += centerText(`PROJECT: ${constructionData.projectCode}`, LABEL_WIDTH) + '\n';
    label += line('=', LABEL_WIDTH) + '\n';
  }

  // Material type
  if (constructionData?.materialType) {
    label += `Material: ${constructionData.materialType}\n`;
  }

  // Item name
  label += wrapText(data.itemName, LABEL_WIDTH) + '\n';

  // Delivery date
  if (constructionData?.deliveryDate) {
    label += `Delivery: ${formatDate(constructionData.deliveryDate)}\n`;
  }

  // Location (job site)
  if (constructionData?.location) {
    label += `Site: ${constructionData.location}\n`;
  }

  // SKU
  label += `SKU: ${data.sku}\n`;

  // Barcode
  label += '\n';
  label += centerText('[BARCODE]', LABEL_WIDTH) + '\n';
  label += centerText(data.barcode.data, LABEL_WIDTH) + '\n';

  return label;
}

/**
 * Vehicles-specific label (for parts)
 */
function generateVehiclesLabel(data: LabelData): string {
  const vehiclesData = data.businessSpecificData as VehiclesLabelData;
  let label = '';

  // Item name
  label += wrapText(data.itemName, LABEL_WIDTH) + '\n';

  // Vehicle ID if linked
  if (vehiclesData?.vehicleId) {
    label += `Vehicle: ${vehiclesData.vehicleId}\n`;
  }

  // Next service info
  if (vehiclesData?.nextServiceDate) {
    label += `Service: ${formatDate(vehiclesData.nextServiceDate)}\n`;
  }
  if (vehiclesData?.nextServiceMileage) {
    label += `@ ${vehiclesData.nextServiceMileage.toLocaleString()} mi\n`;
  }

  // SKU
  label += `SKU: ${data.sku}\n`;

  // Price
  if (data.price !== undefined) {
    label += '\n';
    label += centerText(`$${data.price.toFixed(2)}`, LABEL_WIDTH) + '\n';
  }

  // Barcode
  label += '\n';
  label += centerText('[BARCODE]', LABEL_WIDTH) + '\n';
  label += centerText(data.barcode.data, LABEL_WIDTH) + '\n';

  return label;
}

// ============================================================================
// Barcode Generation Commands
// ============================================================================

/**
 * Generate barcode command for ESC/POS printers
 * Returns the command string to print a barcode
 */
export function generateESCPOSBarcode(data: string, format: string = 'code128'): string {
  // ESC/POS barcode commands
  // Format: GS k m d1...dk NUL (for CODE128)
  // This is a placeholder - actual implementation would use binary commands

  let command = '\x1D\x6B'; // GS k (barcode command)

  switch (format.toLowerCase()) {
    case 'code128':
      command += '\x49'; // CODE128
      break;
    case 'code39':
      command += '\x04'; // CODE39
      break;
    case 'ean13':
      command += '\x02'; // EAN13
      break;
    case 'upca':
      command += '\x00'; // UPC-A
      break;
    default:
      command += '\x49'; // Default to CODE128
  }

  // Add barcode data
  command += String.fromCharCode(data.length);
  command += data;

  return command;
}

/**
 * Generate ZPL barcode command for Zebra printers
 */
export function generateZPLBarcode(
  data: string,
  x: number,
  y: number,
  format: string = 'code128',
  height: number = 100
): string {
  // ZPL barcode format
  let command = '';

  command += `^FO${x},${y}`; // Field Origin

  switch (format.toLowerCase()) {
    case 'code128':
      command += `^BCN,${height},Y,N,N`; // CODE128, height, print interpretation line
      break;
    case 'code39':
      command += `^B3N,N,${height},Y,N`; // CODE39
      break;
    case 'qr':
      command += '^BQN,2,10'; // QR code, error correction level, magnification
      break;
    default:
      command += `^BCN,${height},Y,N,N`; // Default to CODE128
  }

  command += `^FD${data}^FS`; // Field Data

  return command;
}

/**
 * Validate barcode format compatibility
 */
export function validateBarcodeFormat(format: string): boolean {
  const validFormats = ['code128', 'code39', 'ean13', 'upca', 'qr'];
  return validFormats.includes(format.toLowerCase());
}

/**
 * Generate barcode data from SKU
 * Ensures the SKU is valid for the barcode format
 */
export function generateBarcodeData(sku: string, format: string): string {
  // Remove any characters that aren't valid for barcodes
  let cleanSku = sku.replace(/[^A-Za-z0-9\-]/g, '');

  // Format-specific validation/adjustment
  switch (format.toLowerCase()) {
    case 'ean13':
      // EAN13 requires exactly 13 digits
      cleanSku = cleanSku.replace(/\D/g, '').substring(0, 13);
      while (cleanSku.length < 13) {
        cleanSku = '0' + cleanSku;
      }
      break;

    case 'upca':
      // UPC-A requires exactly 12 digits
      cleanSku = cleanSku.replace(/\D/g, '').substring(0, 12);
      while (cleanSku.length < 12) {
        cleanSku = '0' + cleanSku;
      }
      break;

    case 'code39':
    case 'code128':
    default:
      // These formats are more flexible
      break;
  }

  return cleanSku;
}

// ============================================================================
// Utility Functions
// ============================================================================

function centerText(text: string, width: number): string {
  const padding = Math.max(0, Math.floor((width - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function line(char: string, width: number): string {
  return char.repeat(width);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function wrapText(text: string, width: number): string {
  const words = text.split(' ');
  let lines: string[] = [];
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

  return lines.join('\n');
}
