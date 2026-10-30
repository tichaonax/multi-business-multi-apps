/**
 * Send a pre-built ESC/POS slip (e.g. the MBM-329 sample receipt) to whichever
 * printer the user picked — the same three kinds the receipt preview modal
 * supports: local USB (Web Serial), QZ Tray, or a network/agent printer.
 * Printer ids use the modal's conventions: 'local-serial' and 'qz::<name>'.
 */
import { isWebSerialSupported, getLocalPrinterConfig, isLocalPrinterAvailable, printToLocalPrinter } from '@/lib/printing/local-serial-printer'
import { getQzPrinterConfig, printToQzPrinter } from '@/lib/printing/qz-tray-printer'

export const LOCAL_PRINTER_ID = 'local-serial'
export const QZ_PRINTER_PREFIX = 'qz::'

export interface PrintTarget {
  id: string
  label: string
}

/** Local USB and QZ Tray printers configured on this machine (no QZ connection — avoids the security prompt). */
export async function getLocalPrintTargets(): Promise<PrintTarget[]> {
  const targets: PrintTarget[] = []
  try {
    if (isWebSerialSupported()) {
      const local = getLocalPrinterConfig()
      if (local && await isLocalPrinterAvailable()) targets.push({ id: LOCAL_PRINTER_ID, label: `${local.name} (Local USB)` })
    }
  } catch { /* no USB printer */ }
  const qz = getQzPrinterConfig()
  if (qz) targets.push({ id: QZ_PRINTER_PREFIX + qz.printerName, label: `${qz.printerName} (QZ Tray)` })
  return targets
}

/** Converts an ESC/POS byte string to base64 (for /api/print/receipt and the modal's extraEscPosJobs). */
export function escPosToBase64(escPos: string): string {
  let bin = ''
  for (let i = 0; i < escPos.length; i++) bin += String.fromCharCode(escPos.charCodeAt(i) & 0xff)
  return btoa(bin)
}

/** Prints one ESC/POS byte string. Throws on failure. */
export async function printRawEscPos(printerId: string, escPos: string, businessId: string, businessType = 'restaurant'): Promise<void> {
  if (printerId === LOCAL_PRINTER_ID) {
    await printToLocalPrinter(escPos, 1)
    return
  }
  if (printerId.startsWith(QZ_PRINTER_PREFIX)) {
    await printToQzPrinter(printerId.slice(QZ_PRINTER_PREFIX.length), escPos)
    return
  }
  const res = await fetch('/api/print/receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ printerId, businessId, businessType, rawEscPos: escPosToBase64(escPos) }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || 'Print failed')
  }
}
