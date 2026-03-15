/**
 * Client-side utilities for printing scan cards (loyalty, employee) to thermal receipt printers.
 *
 * Flow:
 *  1. html2canvas captures the card element as an image
 *  2. Scaled to the printer paper width (576 dots for 80mm paper)
 *  3. Converted to a 1-bit ESC/POS GS v 0 raster image (B&W)
 *  4. Printed TWICE, stacked vertically with a fold/cut separator between them
 *     — user folds at the line and cuts → scannable card on both sides
 *  5. Raw bytes (base64) are sent to POST /api/print/card
 */

/**
 * Convert a canvas to an ESC/POS GS v 0 raster image byte array.
 * Canvas is scaled to maxWidthDots wide, height proportional.
 */
function canvasToEscPosRaster(canvas: HTMLCanvasElement, maxWidthDots: number): Uint8Array {
  const scaleFactor = maxWidthDots / canvas.width
  const scaledW = maxWidthDots
  const scaledH = Math.round(canvas.height * scaleFactor)

  const scaled = document.createElement('canvas')
  scaled.width = scaledW
  scaled.height = scaledH
  const ctx = scaled.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, scaledW, scaledH)
  ctx.drawImage(canvas, 0, 0, scaledW, scaledH)

  const imageData = ctx.getImageData(0, 0, scaledW, scaledH)
  const pixels = imageData.data

  // Build 1-bit bitmap (MSB first, dark pixel = 1)
  const bytesPerRow = Math.ceil(scaledW / 8)
  const bitmap = new Uint8Array(bytesPerRow * scaledH)

  for (let y = 0; y < scaledH; y++) {
    for (let x = 0; x < scaledW; x++) {
      const idx = (y * scaledW + x) * 4
      const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]
      if (lum < 128) {
        bitmap[y * bytesPerRow + Math.floor(x / 8)] |= (0x80 >> (x % 8))
      }
    }
  }

  // GS v 0 raster image header
  const xL = bytesPerRow & 0xFF
  const xH = (bytesPerRow >> 8) & 0xFF
  const yL = scaledH & 0xFF
  const yH = (scaledH >> 8) & 0xFF
  const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH])

  const out = new Uint8Array(header.length + bitmap.length)
  out.set(header)
  out.set(bitmap, header.length)
  return out
}

/**
 * Build a fold-line separator: small white gap, thin black line, small white gap.
 * This gives a clear fold mark between the two stacked cards.
 */
function buildFoldLine(widthDots: number): Uint8Array {
  const bytesPerRow = Math.ceil(widthDots / 8)
  const whiteRows = 8  // white space above and below the line
  const blackRows = 2  // thin black line
  const totalRows = whiteRows + blackRows + whiteRows

  const bitmap = new Uint8Array(bytesPerRow * totalRows) // all 0x00 = white
  // Fill only the black rows (rows whiteRows .. whiteRows+blackRows-1)
  for (let r = whiteRows; r < whiteRows + blackRows; r++) {
    bitmap.fill(0xFF, r * bytesPerRow, (r + 1) * bytesPerRow)
  }

  const xL = bytesPerRow & 0xFF
  const xH = (bytesPerRow >> 8) & 0xFF
  const yL = totalRows & 0xFF
  const yH = (totalRows >> 8) & 0xFF
  const header = new Uint8Array([0x1D, 0x76, 0x30, 0x00, xL, xH, yL, yH])

  const out = new Uint8Array(header.length + bitmap.length)
  out.set(header)
  out.set(bitmap, header.length)
  return out
}

/**
 * Capture a DOM card element and send TWO stacked copies to the receipt printer
 * with a fold/cut separator between them.
 *
 * @param cardElement      The DOM element to capture.
 * @param printerId        Network printer ID (from /api/printers).
 * @param businessId       Business ID for the print job queue.
 * @param printerWidthDots Dot width of the paper — default 576 (80mm @ 203 DPI).
 */
export async function printCardToReceiptPrinter(
  cardElement: HTMLElement,
  printerId: string,
  businessId: string,
  printerWidthDots = 576,
): Promise<void> {
  const html2canvas = (await import('html2canvas')).default

  const canvas = await html2canvas(cardElement, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    logging: false,
  })

  const cardRaster = canvasToEscPosRaster(canvas, printerWidthDots)
  const foldLine = buildFoldLine(printerWidthDots)

  // Assemble: ESC @ init | card1 | thin fold line | card2 | GS V A 3 partial cut
  // No LF gaps — cards touch the fold line directly
  const init = new Uint8Array([0x1B, 0x40])
  const cut = new Uint8Array([0x1D, 0x56, 0x41, 0x03])

  const totalLen =
    init.length +
    cardRaster.length +
    foldLine.length +
    cardRaster.length +
    cut.length

  const all = new Uint8Array(totalLen)
  let offset = 0
  const write = (arr: Uint8Array) => { all.set(arr, offset); offset += arr.length }

  write(init)
  write(cardRaster)
  write(foldLine)
  write(cardRaster)
  write(cut)

  const escPosBytes = Array.from(all).map(b => String.fromCharCode(b)).join('')

  const res = await fetch('/api/print/card', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      printerId,
      businessId,
      escPosData: btoa(escPosBytes),
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Card print failed (${res.status})`)
  }
}
