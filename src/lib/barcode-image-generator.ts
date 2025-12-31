/**
 * Barcode Image Generator for Laser/Inkjet Printers
 * Generates PNG images of barcodes for printing on standard printers
 */

import bwipjs from 'bwip-js';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import sharp from 'sharp';
import { formatDate } from './date-format';
import { formatBatchWithQuantity } from './batch-id-generator';
import { fitTemplateName } from './text-abbreviation';

interface BarcodeImageOptions {
  barcodeData: string;
  symbology: string;
  itemName?: string;
  businessName?: string;
  templateName?: string;
  description?: string; // Phase 7: Add description field
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  batchNumber?: string;
  quantity?: number; // Number of labels being printed (for quantity-batch format)
  customData?: {
    name?: string;
    barcodeValue?: string;
    productName?: string;
    price?: string;
    size?: string;
    color?: string;
    description?: string; // Phase 7: Add description in custom data
    [key: string]: any;
  };
}

/**
 * Map template symbology names to bwip-js barcode types
 */
function mapSymbologyToBwipType(symbology: string): string {
  const map: Record<string, string> = {
    'upca': 'upca',
    'upc-a': 'upca',
    'upce': 'upce',
    'upc-e': 'upce',
    'ean13': 'ean13',
    'ean-13': 'ean13',
    'ean8': 'ean8',
    'ean-8': 'ean8',
    'code128': 'code128',
    'code39': 'code39',
    'code93': 'code93',
    'itf': 'interleaved2of5',
    'codabar': 'rationalizedCodabar',
    'qr': 'qrcode',
    'qrcode': 'qrcode',
    'datamatrix': 'datamatrix',
  };

  return map[symbology.toLowerCase()] || 'code128';
}

/**
 * Format barcode data for specific symbology
 */
function formatBarcodeData(data: string, symbology: string): string {
  const sym = symbology.toLowerCase();

  switch (sym) {
    case 'upca':
    case 'upc-a':
      // UPC-A requires 11 or 12 digits
      const upcaDigits = data.replace(/\D/g, '').substring(0, 12);
      return upcaDigits.padStart(11, '0');

    case 'ean13':
    case 'ean-13':
      // EAN-13 requires 12 or 13 digits
      const ean13Digits = data.replace(/\D/g, '').substring(0, 13);
      return ean13Digits.padStart(12, '0');

    case 'ean8':
    case 'ean-8':
      // EAN-8 requires 7 or 8 digits
      const ean8Digits = data.replace(/\D/g, '').substring(0, 8);
      return ean8Digits.padStart(7, '0');

    default:
      return data;
  }
}

/**
 * Generate a barcode image file for laser/inkjet printers
 * Returns the path to the generated PNG file
 */
export async function generateBarcodeImage(options: BarcodeImageOptions): Promise<string> {
  const {
    barcodeData,
    symbology,
    itemName = '',
    businessName = '',
    templateName = '',
    displayValue = true,
    height = 100,
  } = options;

  // Map symbology to bwip-js type
  const barcodeType = mapSymbologyToBwipType(symbology);

  // Format the barcode data
  const formattedData = formatBarcodeData(barcodeData, symbology);

  // Generate barcode image using bwip-js
  const png = await bwipjs.toBuffer({
    bcid: barcodeType,        // Barcode type
    text: formattedData,       // Data to encode
    scale: 3,                  // 3x scaling factor
    height: height / 10,       // Bar height in millimeters (bwip-js uses mm)
    includetext: displayValue, // Show human-readable text
    textxalign: 'center',      // Center text
  });

  // Generate temp file path
  const filename = `barcode-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
  const filepath = join(tmpdir(), filename);

  // Write PNG to file
  writeFileSync(filepath, png);

  return filepath;
}

/**
 * Generate a complete barcode label image with header and footer text
 */
export async function generateBarcodeLabelImage(options: BarcodeImageOptions): Promise<string> {
  const {
    barcodeData,
    symbology,
    itemName = '',
    businessName = '',
    templateName = '',
    displayValue = true,
    height = 100,
  } = options;

  // For now, just generate the barcode
  // In future, we could use a library like 'sharp' or 'canvas' to add header/footer text
  return generateBarcodeImage(options);
}

/**
 * Generate multiple barcode labels and return array of file paths
 */
export async function generateMultipleBarcodeImages(
  options: BarcodeImageOptions,
  quantity: number
): Promise<string[]> {
  const filePaths: string[] = [];

  for (let i = 0; i < quantity; i++) {
    const filepath = await generateBarcodeImage(options);
    filePaths.push(filepath);
  }

  return filePaths;
}

/**
 * Calculate the required height for a label based on its content
 */
function calculateLabelHeight(options: BarcodeImageOptions): number {
  let height = 40; // Starting Y position

  // Business name
  if (options.businessName) {
    height += 45; // 38px + 45px spacing
  }

  // Product name
  const productName = options.customData?.productName || options.itemName;
  if (productName) {
    height += 35; // 30px + 35px spacing
  }

  // Description
  const description = options.customData?.description || options.description;
  if (description) {
    height += 40; // 24px + 40px spacing
  }

  // Size
  if (options.customData?.size) {
    height += 45; // 34px + 45px spacing
  }

  // Date + batch
  height += 30; // 22px + 30px spacing (always shown)

  // Barcode + digits
  height += 95; // 80px + 15px spacing

  // SKU (if different from barcode value)
  const formattedData = formatBarcodeData(options.barcodeData, options.symbology);
  if (options.displayValue && options.barcodeData !== formattedData) {
    height += 35; // 24px + 35px spacing
  } else if (options.displayValue) {
    height += 30; // Just spacing
  }

  // Price
  if (options.customData?.price) {
    height += 70; // 60px + 70px spacing (increased from 40px)
  }

  // Color
  if (options.customData?.color) {
    height += 40; // 26px + 40px spacing (increased from 35px)
  }

  // Template name
  if (options.templateName) {
    height += 30; // 24px + extra bottom padding
  }

  return Math.max(height, 375); // Minimum 375px
}

/**
 * Generate a vertical strip of barcode labels for receipt printers
 * Single column layout with no grid or cut lines
 */
export async function generateReceiptLabelStrip(
  options: BarcodeImageOptions,
  quantity: number
): Promise<string> {
  // Label dimensions for receipt printer (80mm width @ 203 DPI)
  // 80mm = 3.15" = 640px at 203 DPI
  const labelWidth = 640;
  const labelHeight = calculateLabelHeight(options); // Dynamic height based on content

  // Page width matches label width (single column)
  const pageWidth = labelWidth;
  const pageHeight = labelHeight * quantity; // Stack labels vertically

  // Create SVG for each label
  const labelSVGs: string[] = [];

  for (let i = 0; i < quantity; i++) {
    const svg = await generateSingleLabelSVG(options, labelWidth, labelHeight);
    labelSVGs.push(svg);
  }

  // Create composite SVG with all labels stacked vertically
  let compositeSVG = `<svg width="${pageWidth}" height="${pageHeight}" xmlns="http://www.w3.org/2000/svg">`;
  compositeSVG += `<rect width="${pageWidth}" height="${pageHeight}" fill="white"/>`;

  for (let i = 0; i < labelSVGs.length; i++) {
    const y = i * labelHeight;
    compositeSVG += `<g transform="translate(0,${y})">${labelSVGs[i]}</g>`;
  }

  // Add vertical fold lines at 20% and 70% from left (for strengthening labels)
  const foldLine1X = pageWidth * 0.2;  // 20% from left
  const foldLine2X = pageWidth * 0.7;  // 70% from left

  compositeSVG += `<line x1="${foldLine1X}" y1="0" x2="${foldLine1X}" y2="${pageHeight}" stroke="#666666" stroke-width="2" stroke-dasharray="10,5"/>`;
  compositeSVG += `<line x1="${foldLine2X}" y1="0" x2="${foldLine2X}" y2="${pageHeight}" stroke="#666666" stroke-width="2" stroke-dasharray="10,5"/>`;

  compositeSVG += '</svg>';

  // Convert SVG to PNG
  const pngBuffer = await sharp(Buffer.from(compositeSVG)).png().toBuffer();

  // Save to temp file
  const filename = `barcode-receipt-strip-${Date.now()}.png`;
  const filepath = join(tmpdir(), filename);
  writeFileSync(filepath, pngBuffer);

  return filepath;
}

/**
 * Generate a page with multiple barcode labels arranged in a grid
 * For laser/inkjet printers (like Brother MFC-7860DW)
 */
export async function generateMultiLabelPage(
  options: BarcodeImageOptions,
  quantity: number
): Promise<string> {
  // Label dimensions in pixels (at 300 DPI)
  // 2.5" x 1.25" = 750px x 375px
  const labelWidth = 750;
  const labelHeight = 375;

  // Page dimensions for 8.5" x 11" at 300 DPI
  const pageWidth = 2550;
  const pageHeight = 3300;

  // Calculate grid layout (3 columns x 6 rows = 18 labels per page - reduced for more cutting space)
  const cols = 3;
  const rows = 6; // Reduced from 8 to give more vertical space
  const labelsPerPage = cols * rows;

  // Margins
  const marginX = 75; // 0.25"
  const marginY = 100; // Increased from 75

  // Spacing between labels - SIGNIFICANTLY increased vertical spacing for cutting
  const spacingX = (pageWidth - (2 * marginX) - (cols * labelWidth)) / (cols - 1);
  const spacingY = Math.max(
    (pageHeight - (2 * marginY) - (rows * labelHeight)) / (rows - 1),
    150 // Minimum 150px (0.5") between rows for cutting
  );

  // Create SVG for each label
  const labelSVGs: string[] = [];

  for (let i = 0; i < Math.min(quantity, labelsPerPage); i++) {
    const svg = await generateSingleLabelSVG(options, labelWidth, labelHeight);
    labelSVGs.push(svg);
  }

  // Create composite SVG with all labels
  let compositeSVG = `<svg width="${pageWidth}" height="${pageHeight}" xmlns="http://www.w3.org/2000/svg">`;
  compositeSVG += `<rect width="${pageWidth}" height="${pageHeight}" fill="white"/>`;

  for (let i = 0; i < labelSVGs.length; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    const x = marginX + col * (labelWidth + spacingX);
    const y = marginY + row * (labelHeight + spacingY);

    compositeSVG += `<g transform="translate(${x},${y})">${labelSVGs[i]}</g>`;
  }

  // Add cutting guidelines (horizontal lines between rows)
  for (let row = 0; row < rows - 1; row++) {
    const y = marginY + (row + 1) * labelHeight + row * spacingY + spacingY / 2;
    compositeSVG += `<line x1="${marginX}" y1="${y}" x2="${pageWidth - marginX}" y2="${y}" stroke="#666666" stroke-width="3" stroke-dasharray="10,5"/>`;
  }

  // Add cutting guidelines (vertical lines between columns)
  for (let col = 0; col < cols - 1; col++) {
    const x = marginX + (col + 1) * labelWidth + col * spacingX + spacingX / 2;
    compositeSVG += `<line x1="${x}" y1="${marginY}" x2="${x}" y2="${pageHeight - marginY}" stroke="#666666" stroke-width="3" stroke-dasharray="10,5"/>`;
  }

  compositeSVG += '</svg>';

  // Convert SVG to PNG
  const pngBuffer = await sharp(Buffer.from(compositeSVG)).png().toBuffer();

  // Save to temp file
  const filename = `barcode-page-${Date.now()}.png`;
  const filepath = join(tmpdir(), filename);
  writeFileSync(filepath, pngBuffer);

  return filepath;
}

/**
 * Generate SVG for a single label in Goodwill format
 */
async function generateSingleLabelSVG(
  options: BarcodeImageOptions,
  width: number,
  height: number
): Promise<string> {
  const {
    barcodeData,
    symbology,
    itemName = '',
    businessName = '',
    templateName = '', // Phase 7
    description = '', // Phase 7
    displayValue = true,
    batchNumber = '',
    customData,
  } = options;

  let svg = '';
  let yPos = 40;

  // Business name (large, bold)
  if (businessName) {
    svg += `<text x="${width / 2}" y="${yPos}" font-size="38" font-weight="bold" text-anchor="middle" font-family="Arial">${escapeXml(businessName)}</text>`;
    yPos += 40; // More space after business name
  }

  // Product name
  const productName = customData?.productName || itemName;
  if (productName) {
    svg += `<text x="${width / 2}" y="${yPos}" font-size="30" font-weight="500" text-anchor="middle" font-family="Arial">${escapeXml(productName)}</text>`;
    yPos += 32; // More space after product name
  }

  // Phase 7: Description (if provided)
  const productDescription = customData?.description || description;
  if (productDescription) {
    svg += `<text x="${width / 2}" y="${yPos}" font-size="24" text-anchor="middle" font-family="Arial">${escapeXml(productDescription)}</text>`;
    yPos += 35; // Increased space after description
  }

  // Size (large)
  if (customData?.size) {
    svg += `<text x="${width / 2}" y="${yPos}" font-size="34" font-weight="bold" text-anchor="middle" font-family="Arial">${escapeXml(customData.size)}</text>`;
    yPos += 35; // MUCH more space after size
  }

  // Date + batch number (with quantity prefix if provided)
  const currentDate = formatDate(new Date());
  let batch = '';
  if (batchNumber) {
    // If quantity is provided, format as "quantity-batchId" (e.g., "50-A01")
    // Otherwise, just show the batch ID
    batch = options.quantity && options.quantity > 0
      ? ` ${formatBatchWithQuantity(options.quantity, batchNumber)}`
      : ` ${batchNumber}`;
  }
  svg += `<text x="${width / 2}" y="${yPos}" font-size="22" font-weight="600" text-anchor="middle" font-family="Arial">${currentDate}${batch}</text>`;
  yPos += 10; // More space before barcode

  // Generate barcode (reduced by 50% for document printers)
  const barcodeType = mapSymbologyToBwipType(symbology);
  const formattedData = formatBarcodeData(barcodeData, symbology);

  const barcodePng = await bwipjs.toBuffer({
    bcid: barcodeType,
    text: formattedData,
    scale: 2, // Scaling factor for barcode
    height: 8, // Bar height in mm
    includetext: true, // Show the encoded barcode digits below the bars
    textxalign: 'center', // Center the text
  });

  // Convert barcode to base64
  const barcodeBase64 = barcodePng.toString('base64');
  const barcodeImageWidth = Math.min(width - 40, 325); // 50% of original 650px
  const barcodeImageHeight = 80; // Height to accommodate barcode + built-in digits text
  const barcodeX = (width - barcodeImageWidth) / 2;

  svg += `<image x="${barcodeX}" y="${yPos}" width="${barcodeImageWidth}" height="${barcodeImageHeight}" href="data:image/png;base64,${barcodeBase64}"/>`;
  yPos += barcodeImageHeight + 32; // Space after barcode (with built-in digits)

  // SKU text - LARGE and BOLD (below the barcode digits)
  // Only show if SKU is different from the barcode value (avoid duplication)
  if (displayValue && barcodeData !== formattedData) {
    svg += `<text x="${width / 2}" y="${yPos}" font-size="24" font-weight="bold" text-anchor="middle" font-family="Arial">SKU: ${escapeXml(barcodeData)}</text>`;
    yPos += 50; // Increased space before price to prevent overlap
  } else if (displayValue) {
    // If SKU same as barcode, just add spacing
    yPos += 45;
  }

  // Price (large, bold) - always show 2 decimal places
  if (customData?.price) {
    const formattedPrice = parseFloat(customData.price).toFixed(2);
    svg += `<text x="${width / 2}" y="${yPos}" font-size="60" font-weight="bold" text-anchor="middle" font-family="Arial">$ ${escapeXml(formattedPrice)}</text>`;
    yPos += 35; // Increased spacing after price to prevent overlap
  }

  // Color
  if (customData?.color) {
    svg += `<text x="${width / 2}" y="${yPos}" font-size="26" text-anchor="middle" font-family="Arial">${escapeXml(customData.color)}</text>`;
    yPos += 40; // Increased spacing after color
  }

  // Phase 7: Template name at bottom in fine print (40 character abbreviation)
  if (templateName) {
    const abbreviatedName = fitTemplateName(templateName, 40);
    svg += `<text x="${width / 2}" y="${yPos}" font-size="22" text-anchor="middle" font-family="Arial">${escapeXml(abbreviatedName)}</text>`;
  }

  // Add vertical fold lines at 20% and 80% from left (for strengthening after cutting)
  const foldLine1X = width * 0.2;  // 20% from left
  const foldLine2X = width * 0.8;  // 80% from left

  svg += `<line x1="${foldLine1X}" y1="0" x2="${foldLine1X}" y2="${height}" stroke="#666666" stroke-width="2" stroke-dasharray="10,5"/>`;
  svg += `<line x1="${foldLine2X}" y1="0" x2="${foldLine2X}" y2="${height}" stroke="#666666" stroke-width="2" stroke-dasharray="10,5"/>`;

  return svg;
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
