/**
 * MBM-275: workstation-agent printing. Reuses printRawData() directly from
 * the main app's codebase — same precedent as job-handler.ts importing
 * RuckusR710ApiService — so a fix to the Windows Spooler call never has to
 * be made twice. This file only adds what the shared module doesn't have:
 * enumerating the printers actually installed on this workstation, for the
 * pairing/setup UI's printer picker (same idea as the scale's COM-port
 * picker).
 */

import { execSync } from 'child_process'
import { printRawData } from '../../../src/lib/printing/windows-raw-printer'

export { printRawData }

export interface LocalPrinterInfo {
  name: string
  driverName: string | null
  portName: string | null
}

// Deliberately does NOT swallow its own errors — throws instead, with the
// real PowerShell/parse failure message. Both call sites already handle
// that correctly on their own (index.ts's refreshPrinterList() has its own
// try/catch; workstation-job-handler.ts's PRINT_LIST_PRINTERS case is
// already inside an outer try/catch that turns a thrown error into a
// proper { success: false, error } job result). Swallowing it here used to
// turn EVERY failure — a timed-out or genuinely broken `Get-Printer` call,
// same as an OS with nothing installed — into an identical empty list, with
// the real reason only ever visible in this agent's own local console,
// never to whoever's looking at the picker remotely.
export function listPrinters(): LocalPrinterInfo[] {
  const psScript = `
$ErrorActionPreference = "Stop"
Get-Printer | Select-Object Name, DriverName, PortName | ConvertTo-Json -Compress
`
  const output = execSync(`powershell -NoProfile -NonInteractive -Command "${psScript.replace(/"/g, '\\"')}"`, {
    encoding: 'utf-8',
    timeout: 10000,
  })

  const trimmed = output.trim()
  if (!trimmed) return []

  const parsed = JSON.parse(trimmed)
  const list = Array.isArray(parsed) ? parsed : [parsed]
  return list.map((p: any) => ({
    name: p.Name,
    driverName: p.DriverName || null,
    portName: p.PortName || null,
  }))
}
