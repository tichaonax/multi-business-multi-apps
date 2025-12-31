'use client';

import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

interface BarcodePreviewProps {
  barcodeValue: string;
  symbology?: string;
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  margin?: number;
  lineColor?: string;
  backgroundColor?: string;
}

export default function BarcodePreview({
  barcodeValue,
  symbology = 'code128',
  width = 200,
  height = 100,
  displayValue = true,
  fontSize = 20,
  margin = 10,
  lineColor = '#000000',
  backgroundColor = '#FFFFFF',
}: BarcodePreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !barcodeValue) return;

    try {
      // Map symbology to jsbarcode format
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

      JsBarcode(canvasRef.current, barcodeValue, {
        format: format,
        width: 2,
        height: height - 40,
        displayValue: displayValue,
        fontSize: fontSize,
        margin: margin,
        lineColor: lineColor,
        background: backgroundColor,
      });
    } catch (error) {
      console.error('Error generating barcode:', error);
      // If barcode generation fails, clear the canvas
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = lineColor;
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Invalid barcode data', canvasRef.current.width / 2, canvasRef.current.height / 2);
      }
    }
  }, [barcodeValue, symbology, width, height, displayValue, fontSize, margin, lineColor, backgroundColor]);

  return (
    <canvas
      ref={canvasRef}
      className="mx-auto"
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
