/**
 * Local Serial Printer Service
 *
 * Client-side module for printing directly to a USB thermal printer
 * via the Web Serial API. Runs entirely in the browser — no server involved.
 *
 * Web Serial works on Chrome/Edge 89+. Requires a secure context (HTTPS or localhost).
 * On Windows, most thermal printers expose virtual COM ports that Web Serial can access.
 */

const LOCAL_PRINTER_STORAGE_KEY = 'local-serial-printer-config'
const CHUNK_SIZE = 4096 // Write in 4KB chunks to avoid buffer overflows

export interface LocalPrinterConfig {
  name: string
  baudRate: number
  /** Stored for display purposes (may be empty on some platforms) */
  vendorId?: number
  productId?: number
}

/**
 * Check if the Web Serial API is available in this browser
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== 'undefined' && 'serial' in navigator
}

/**
 * Get saved local printer config from localStorage
 */
export function getLocalPrinterConfig(): LocalPrinterConfig | null {
  try {
    const stored = localStorage.getItem(LOCAL_PRINTER_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as LocalPrinterConfig
  } catch {
    return null
  }
}

/**
 * Save local printer config to localStorage
 */
function saveLocalPrinterConfig(config: LocalPrinterConfig): void {
  localStorage.setItem(LOCAL_PRINTER_STORAGE_KEY, JSON.stringify(config))
}

/**
 * Clear saved local printer config
 */
export function clearLocalPrinterConfig(): void {
  localStorage.removeItem(LOCAL_PRINTER_STORAGE_KEY)
}

/**
 * Request a local serial printer from the user.
 * MUST be called from a user gesture (click handler).
 * Shows the browser's native serial port picker dialog.
 */
export async function requestLocalPrinter(
  name: string = 'Local Receipt Printer',
  baudRate: number = 9600
): Promise<LocalPrinterConfig | null> {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial API is not supported in this browser. Use Chrome or Edge.')
  }

  try {
    // Show browser's native serial port picker
    const port = await (navigator as any).serial.requestPort()
    const portInfo = port.getInfo()

    const config: LocalPrinterConfig = {
      name,
      baudRate,
      vendorId: portInfo.usbVendorId,
      productId: portInfo.usbProductId,
    }

    saveLocalPrinterConfig(config)
    return config
  } catch (err: any) {
    // User cancelled the picker
    if (err.name === 'NotFoundError') {
      return null
    }
    throw err
  }
}

/**
 * Convert ESC/POS string (with embedded control characters) to a Uint8Array.
 * The receipt-templates.ts output uses String.fromCharCode() for ESC/POS commands,
 * so each character maps to one byte in the 0x00-0xFF range.
 */
function escPosStringToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i) & 0xFF
  }
  return bytes
}

/**
 * Get a previously-authorized serial port (no user gesture needed).
 * Returns null if no port is available.
 */
async function getAuthorizedPort(): Promise<any | null> {
  if (!isWebSerialSupported()) return null

  try {
    const ports = await (navigator as any).serial.getPorts()
    if (ports.length === 0) return null

    const config = getLocalPrinterConfig()
    if (!config) return null

    // If we have vendor/product IDs, try to match the specific port
    if (config.vendorId) {
      const matched = ports.find((p: any) => {
        const info = p.getInfo()
        return info.usbVendorId === config.vendorId && info.usbProductId === config.productId
      })
      if (matched) return matched
    }

    // Fallback: return the first available port
    return ports[0]
  } catch {
    return null
  }
}

/**
 * Send raw bytes to the serial port in chunks
 */
async function writeToPort(port: any, data: Uint8Array): Promise<void> {
  const writer = port.writable.getWriter()
  try {
    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, Math.min(offset + CHUNK_SIZE, data.length))
      await writer.write(chunk)
    }
  } finally {
    writer.releaseLock()
  }
}

/**
 * Print an ESC/POS string to the local serial printer.
 * The string should be the output of generateReceipt() from receipt-templates.ts.
 *
 * @param escPosString - ESC/POS formatted string with embedded control characters
 * @param copies - Number of copies to print (default 1)
 */
export async function printToLocalPrinter(
  escPosString: string,
  copies: number = 1
): Promise<void> {
  if (!isWebSerialSupported()) {
    throw new Error('Web Serial API is not supported in this browser.')
  }

  const config = getLocalPrinterConfig()
  if (!config) {
    throw new Error('No local printer configured. Please set up a local printer first.')
  }

  const port = await getAuthorizedPort()
  if (!port) {
    throw new Error('Local printer not found. Please reconnect the printer and try again.')
  }

  try {
    await port.open({
      baudRate: config.baudRate,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      flowControl: 'none',
    })
  } catch (err: any) {
    // Port may already be open from a previous operation
    if (!err.message?.includes('already open')) {
      throw new Error(`Failed to open printer port: ${err.message}`)
    }
  }

  try {
    const bytes = escPosStringToBytes(escPosString)

    for (let i = 0; i < copies; i++) {
      await writeToPort(port, bytes)
      // Small delay between copies to let the printer process
      if (i < copies - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  } finally {
    try {
      await port.close()
    } catch {
      // Ignore close errors
    }
  }
}

/**
 * Send a test print to the local serial printer.
 * Prints a simple test receipt to verify the connection works.
 */
export async function testLocalPrinter(): Promise<void> {
  const ESC = '\x1B'
  const GS = '\x1D'
  const LF = '\x0A'

  const INIT = ESC + '@'
  const CENTER = ESC + 'a' + String.fromCharCode(1)
  const LEFT = ESC + 'a' + String.fromCharCode(0)
  const BOLD_ON = ESC + 'E' + String.fromCharCode(1)
  const BOLD_OFF = ESC + 'E' + String.fromCharCode(0)
  const CUT = GS + 'V' + '\x41' + String.fromCharCode(3)

  const divider = '==========================================';

  const testReceipt = [
    INIT,
    CENTER,
    BOLD_ON,
    'LOCAL PRINTER TEST' + LF,
    BOLD_OFF,
    divider + LF,
    LEFT,
    LF,
    'If you can read this, your local' + LF,
    'USB printer is working correctly!' + LF,
    LF,
    `Date: ${new Date().toLocaleString()}` + LF,
    `Baud Rate: ${getLocalPrinterConfig()?.baudRate || 'unknown'}` + LF,
    LF,
    divider + LF,
    CENTER,
    'Test Complete' + LF,
    LF + LF + LF,
    CUT,
  ].join('')

  await printToLocalPrinter(testReceipt)
}

/**
 * Check if a local printer is currently accessible
 */
export async function isLocalPrinterAvailable(): Promise<boolean> {
  if (!isWebSerialSupported()) return false
  if (!getLocalPrinterConfig()) return false
  const port = await getAuthorizedPort()
  return port !== null
}
