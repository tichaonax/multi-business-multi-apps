/**
 * QZ Tray Printer Service
 *
 * Client-side module for printing to local and network printers via QZ Tray.
 * QZ Tray is a Java desktop app that runs in the system tray and exposes a
 * WebSocket on ws://localhost:8182. Any browser can connect to it.
 *
 * Unlike Web Serial, QZ Tray:
 * - Works in all modern browsers (not just Chrome/Edge)
 * - Requires no browser flags for HTTP sites
 * - Supports both USB and network printers
 *
 * Prerequisites on the client machine:
 * - Java 8+ installed
 * - QZ Tray installed and running (https://qz.io/download/)
 */

const QZ_PRINTER_STORAGE_KEY = 'qz-tray-printer-config'
const QZ_CONNECT_TIMEOUT = 3000 // ms to wait for WebSocket handshake

export interface QzPrinterConfig {
  printerName: string
}

// ─── localStorage helpers ───────────────────────────────────────────────────

export function getQzPrinterConfig(): QzPrinterConfig | null {
  try {
    const stored = localStorage.getItem(QZ_PRINTER_STORAGE_KEY)
    return stored ? (JSON.parse(stored) as QzPrinterConfig) : null
  } catch {
    return null
  }
}

export function saveQzPrinterConfig(config: QzPrinterConfig): void {
  localStorage.setItem(QZ_PRINTER_STORAGE_KEY, JSON.stringify(config))
}

export function clearQzPrinterConfig(): void {
  localStorage.removeItem(QZ_PRINTER_STORAGE_KEY)
}

// ─── QZ Tray dynamic import ─────────────────────────────────────────────────

async function getQz(): Promise<any> {
  // qz-tray ships as a CommonJS module — import dynamically to avoid SSR issues
  const mod = await import('qz-tray')
  return (mod as any).default ?? mod
}

// ─── Connection ──────────────────────────────────────────────────────────────

/**
 * Returns true if QZ Tray is running and reachable on this machine.
 * Resolves quickly (within QZ_CONNECT_TIMEOUT ms) even when not running.
 */
export async function isQzTrayAvailable(): Promise<boolean> {
  try {
    const qz = await getQz()
    if (qz.websocket.isActive()) return true

    await Promise.race([
      qz.websocket.connect({ retries: 0, delay: 0 }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), QZ_CONNECT_TIMEOUT)
      ),
    ])
    return true
  } catch {
    return false
  }
}

/**
 * Ensure QZ Tray WebSocket is connected.
 * Safe to call multiple times — no-ops if already connected.
 */
export async function connectQzTray(): Promise<void> {
  const qz = await getQz()
  if (qz.websocket.isActive()) return
  await qz.websocket.connect({ retries: 1, delay: 1 })
}

export async function disconnectQzTray(): Promise<void> {
  try {
    const qz = await getQz()
    if (qz.websocket.isActive()) await qz.websocket.disconnect()
  } catch {
    // Ignore disconnect errors
  }
}

// ─── Printer discovery ───────────────────────────────────────────────────────

/**
 * List all printers visible to QZ Tray on this machine (USB + network).
 * Connects to QZ Tray if not already connected.
 */
export async function listQzPrinters(): Promise<string[]> {
  await connectQzTray()
  const qz = await getQz()
  const printers: string[] = await qz.printers.find()
  return printers.filter(Boolean).sort()
}

// ─── Printing ────────────────────────────────────────────────────────────────

/**
 * Convert an ESC/POS string (output of generateReceipt()) to a byte array.
 * receipt-templates.ts uses String.fromCharCode() for control bytes,
 * so each character maps to one byte in 0x00–0xFF range.
 */
function escPosStringToBytes(str: string): number[] {
  const bytes: number[] = new Array(str.length)
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xff
  }
  return bytes
}

/**
 * Print an ESC/POS string to a named printer via QZ Tray.
 * Uses base64 encoding to ensure binary data is transmitted correctly.
 *
 * @param printerName - Exact printer name as returned by listQzPrinters()
 * @param escPosString - ESC/POS string from generateReceipt() or card-print-utils
 */
export async function printToQzPrinter(
  printerName: string,
  escPosString: string
): Promise<void> {
  await connectQzTray()
  const qz = await getQz()

  const config = qz.configs.create(printerName)
  // ESC/POS raster data contains bytes > 127 (e.g. 0xFF for black bitmap pixels).
  // Sending via format:'command' causes QZ Tray to UTF-8 encode the string, turning
  // each byte > 127 into a 2-byte sequence — this corrupts the raster stream and the
  // printer only prints the first few rows before byte offsets go wrong ("top half only").
  // base64 encoding ensures the binary payload is transmitted byte-perfect.
  const data = [{ type: 'raw', format: 'base64', data: btoa(escPosString) }]
  await qz.print(config, data)
}

/**
 * Print a ZPL string to a Zebra (or ZPL-compatible) label printer via QZ Tray.
 *
 * @param printerName - Exact printer name as returned by listQzPrinters()
 * @param zplString - ZPL command string (e.g. from convertToZPL())
 */
export async function printZplToQzPrinter(printerName: string, zplString: string): Promise<void> {
  await connectQzTray()
  const qz = await getQz()
  const config = qz.configs.create(printerName)
  const data = [{ type: 'raw', format: 'command', data: zplString }]
  await qz.print(config, data)
}

/**
 * Send a short test receipt to a named printer via QZ Tray.
 */
export async function testQzPrinter(printerName: string): Promise<void> {
  const ESC = '\x1B'
  const GS = '\x1D'
  const LF = '\x0A'

  const testReceipt = [
    ESC + '@',                                    // Init
    ESC + 'a' + String.fromCharCode(1),           // Center
    ESC + 'E' + String.fromCharCode(1),           // Bold on
    'QZ TRAY TEST' + LF,
    ESC + 'E' + String.fromCharCode(0),           // Bold off
    '========================================' + LF,
    ESC + 'a' + String.fromCharCode(0),           // Left
    LF,
    'If you can read this, QZ Tray is' + LF,
    'working correctly!' + LF,
    LF,
    `Date: ${new Date().toLocaleString()}` + LF,
    `Printer: ${printerName}` + LF,
    LF,
    '========================================' + LF,
    ESC + 'a' + String.fromCharCode(1),
    'Test Complete' + LF,
    LF + LF + LF,
    GS + 'V' + '\x41' + String.fromCharCode(3),  // Partial cut
  ].join('')

  await printToQzPrinter(printerName, testReceipt)
}
