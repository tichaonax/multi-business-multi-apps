'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { fitTemplateName } from '@/lib/text-abbreviation';

interface CompleteLabelPreviewProps {
  // Template data
  barcodeValue: string;
  symbology?: string;
  displayValue?: boolean;
  fontSize?: number;
  lineColor?: string;
  backgroundColor?: string;

  // Business and label data
  businessName?: string;
  productName?: string;
  description?: string;
  size?: string;
  price?: string;
  color?: string;
  sku?: string;
  templateName?: string;

  // Preview mode
  showDate?: boolean;
  batchNumber?: string;
  quantity?: number; // Number of items in this batch
}

export default function CompleteLabelPreview({
  barcodeValue,
  symbology = 'code128',
  displayValue = true,
  fontSize = 20,
  lineColor = '#000000',
  backgroundColor = '#FFFFFF',
  businessName = '',
  productName = '',
  description = '',
  size = '',
  price = '',
  color = '',
  sku = '',
  templateName = '',
  showDate = true,
  batchNumber = 'XXX',
  quantity,
}: CompleteLabelPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !barcodeValue) return;

    // Calculate dynamic height based on content
    let estimatedHeight = 60; // Base padding
    if (businessName) estimatedHeight += 45;
    if (productName) estimatedHeight += 35;
    if (description) estimatedHeight += 40;
    if (size) estimatedHeight += 45;
    if (showDate) estimatedHeight += 30;
    estimatedHeight += 95; // Barcode + space
    if (sku && sku !== barcodeValue) estimatedHeight += 35;
    if (price) estimatedHeight += 70;
    if (color) estimatedHeight += 40;
    if (templateName) estimatedHeight += 30;

    const labelWidth = 750;
    const labelHeight = Math.max(estimatedHeight, 375);

    // Create SVG
    let svg = `<svg width="${labelWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<rect width="${labelWidth}" height="${labelHeight}" fill="${backgroundColor}"/>`;

    let yPos = 40;

    // Business name (large, bold)
    if (businessName) {
      svg += `<text x="${labelWidth / 2}" y="${yPos}" font-size="38" font-weight="bold" text-anchor="middle" font-family="Arial" fill="${lineColor}">${escapeXml(businessName)}</text>`;
      yPos += 45;
    }

    // Product name
    if (productName) {
      svg += `<text x="${labelWidth / 2}" y="${yPos}" font-size="30" font-weight="500" text-anchor="middle" font-family="Arial" fill="${lineColor}">${escapeXml(productName)}</text>`;
      yPos += 35;
    }

    // Description
    if (description) {
      svg += `<text x="${labelWidth / 2}" y="${yPos}" font-size="24" text-anchor="middle" font-family="Arial" fill="${lineColor}">${escapeXml(description)}</text>`;
      yPos += 40;
    }

    // Size (large, bold)
    if (size) {
      svg += `<text x="${labelWidth / 2}" y="${yPos}" font-size="34" font-weight="bold" text-anchor="middle" font-family="Arial" fill="${lineColor}">${escapeXml(size)}</text>`;
      yPos += 45;
    }

    // Date + batch number (with quantity prefix if provided)
    if (showDate) {
      const currentDate = new Date().toLocaleDateString('en-GB');
      // Format batch as "quantity-batchId" (e.g., "50-A01") if quantity provided
      const formattedBatch = quantity && batchNumber
        ? `${quantity}-${batchNumber}`
        : batchNumber || '';
      const batch = formattedBatch ? ` ${formattedBatch}` : '';
      svg += `<text x="${labelWidth / 2}" y="${yPos}" font-size="22" font-weight="600" text-anchor="middle" font-family="Arial" fill="${lineColor}">${currentDate}${batch}</text>`;
      yPos += 30;
    }

    // Generate barcode using jsbarcode
    const barcodeCanvas = document.createElement('canvas');
    try {
      const formatMap: Record<string, string> = {
        'code128': 'CODE128',
        'code39': 'CODE39',
        'ean13': 'EAN13',
        'ean8': 'EAN8',
        'upca': 'UPC',
        'itf14': 'ITF14',
        'msi': 'MSI',
        'pharmacode': 'pharmacode',
        'codabar': 'codabar',
      };

      const format = formatMap[symbology.toLowerCase()] || 'CODE128';

      JsBarcode(barcodeCanvas, barcodeValue, {
        format: format,
        width: 2,
        height: 60,
        displayValue: true,
        fontSize: fontSize,
        margin: 0,
        lineColor: lineColor,
        background: backgroundColor,
      });

      const barcodeDataUrl = barcodeCanvas.toDataURL();
      const barcodeImageWidth = Math.min(labelWidth - 40, 325);
      const barcodeImageHeight = 80;
      const barcodeX = (labelWidth - barcodeImageWidth) / 2;

      svg += `<image x="${barcodeX}" y="${yPos}" width="${barcodeImageWidth}" height="${barcodeImageHeight}" href="${barcodeDataUrl}"/>`;
      // Add extra space after barcode to prevent overlap with SKU/price (accounts for barcode value text)
      yPos += barcodeImageHeight + 35;

    } catch (error) {
      console.error('Error generating barcode:', error);
      svg += `<text x="${labelWidth / 2}" y="${yPos}" font-size="16" text-anchor="middle" font-family="Arial" fill="red">Invalid barcode data</text>`;
      yPos += 25;
    }

    // SKU text - LARGE and BOLD (only show if different from barcode value)
    if (sku && sku !== barcodeValue && displayValue) {
      svg += `<text x="${labelWidth / 2}" y="${yPos}" font-size="24" font-weight="bold" text-anchor="middle" font-family="Arial" fill="${lineColor}">SKU: ${escapeXml(sku)}</text>`;
      yPos += 60;
    }

    // Price (large, bold) - always show 2 decimal places
    if (price) {
      const formattedPrice = parseFloat(price).toFixed(2);
      svg += `<text x="${labelWidth / 2}" y="${yPos}" font-size="60" font-weight="bold" text-anchor="middle" font-family="Arial" fill="${lineColor}">$ ${escapeXml(formattedPrice)}</text>`;
      yPos += 50;
    }

    // Color
    if (color) {
      svg += `<text x="${labelWidth / 2}" y="${yPos}" font-size="26" text-anchor="middle" font-family="Arial" fill="${lineColor}">${escapeXml(color)}</text>`;
      yPos += 40;
    }

    // Template name at bottom in fine print (abbreviate to fit within fold lines)
    if (templateName) {
      // Use 40 characters as the target - fits well in the fold line space with 20px font
      const maxChars = 40;

      // Use abbreviation algorithm to fit within fold lines
      // E.g., "H&BA:Purple Jewel Flower Statement Earrings" → "H&BA:Purple JF Statement Earrings"
      const displayName = fitTemplateName(templateName, maxChars);

      svg += `<text x="${labelWidth / 2}" y="${yPos}" font-size="20" text-anchor="middle" font-family="Arial" fill="${lineColor}">${escapeXml(displayName)}</text>`;
    }

    // Add vertical fold lines at 20% and 80% from left
    const foldLine1X = labelWidth * 0.2;
    const foldLine2X = labelWidth * 0.8;
    svg += `<line x1="${foldLine1X}" y1="0" x2="${foldLine1X}" y2="${labelHeight}" stroke="#999999" stroke-width="1" stroke-dasharray="5,5" opacity="0.5"/>`;
    svg += `<line x1="${foldLine2X}" y1="0" x2="${foldLine2X}" y2="${labelHeight}" stroke="#999999" stroke-width="1" stroke-dasharray="5,5" opacity="0.5"/>`;

    svg += '</svg>';

    // Convert SVG to image and display
    const img = new Image();
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          canvasRef.current.width = labelWidth;
          canvasRef.current.height = labelHeight;
          ctx.drawImage(img, 0, 0);
        }
      }
      URL.revokeObjectURL(url);
    };

    img.src = url;

  }, [barcodeValue, symbology, displayValue, fontSize, lineColor, backgroundColor, businessName, productName, description, size, price, color, sku, templateName, showDate, batchNumber, quantity]);

  return (
    <div ref={containerRef} className="inline-block">
      <canvas
        ref={canvasRef}
        className="border border-gray-300 dark:border-gray-600 rounded"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
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
