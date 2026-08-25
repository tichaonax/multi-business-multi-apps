/**
 * MBM-275: Star Micronics MG-S8200 RS-232 driver, ported for the workstation
 * agent from electron/scale-service.js. Deliberately kept structurally
 * identical to that file (same regexes, same baud list, same connect/
 * reconnect/tare logic) so a protocol fix made in one is easy to mirror in
 * the other — see the header comment there for why they aren't a single
 * shared module (electron/ and this agent are separate npm/build projects;
 * true de-duplication would need a third shared package, judged
 * disproportionate to this project's scope for now).
 *
 * Two real differences from the Electron version:
 *  - No local persistence here. The server is the source of truth for
 *    comPort/baudRate (ScaleDeviceConfigs, MBM-275 Phase 1) and passes them
 *    on every SCALE_CONNECT job — electron-store's role there simply has no
 *    equivalent need on the agent.
 *  - Status/weight are emitted via a plain EventEmitter ('weight', 'status')
 *    instead of Electron IPC — the workstation socket client subscribes and
 *    relays them to the central server.
 */

import { EventEmitter } from 'events'
import { join, dirname } from 'path'
import { existsSync } from 'fs'
import { createRequire } from 'module'

// Same reasoning and pattern as tray.ts's loadSysTray(): a packaged Node SEA
// .exe sandboxes its embedded require() to only what esbuild bundled —
// requiring an external (native-binary) package by bare specifier throws
// ERR_UNKNOWN_BUILTIN_MODULE even though build.mjs copied serialport's
// whole dependency closure to dist/node_modules/serialport. createRequire()
// rooted at a real on-disk path escapes that sandbox; serialport's own
// internal requires of @serialport/bindings-cpp (the native addon) then
// resolve normally from there, since everything was copied flat as siblings.
function loadSerialPort(): any {
  const packagedDir = join(dirname(process.execPath), 'node_modules', 'serialport')
  try {
    const mod = existsSync(packagedDir)
      ? createRequire(process.execPath)(packagedDir) // packaged .exe — escape the SEA require sandbox
      : require('serialport') // dev mode (npm run dev, no SEA involved) — resolve normally
    return mod.SerialPort
  } catch (e) {
    console.warn('[Scale] serialport module not available — scale features disabled:', (e as Error).message)
    return undefined
  }
}

const SerialPortCtor: any = loadSerialPort()

const BAUD_RATES_TO_TRY = [1200, 2400, 4800, 9600, 19200, 38400]
const RECONNECT_DELAY_MS = 5000

// Format 1 (Star standard): "ST,+  1.234 kg"  "US, 0.000 kg"
const WEIGHT_REGEX_STANDARD = /^(ST|US|OL|ER),\s*([+\-]?)\s*([\d.]+)\s*(kg|g|lb)/i
// Format 2 (simple, used by MG-S8200 at 1200 baud): "  +      91  g"
const WEIGHT_REGEX_SIMPLE = /^\s*([+\-]?)\s*([\d.]+)\s*(kg|g|lb)\s*$/i

export interface ScaleWeightReading {
  weight: number
  stable: boolean
  overload: boolean
  error: boolean
  unit: 'kg'
}

export interface ScaleStatus {
  status: 'connecting' | 'connected' | 'disconnected' | 'error'
  comPort: string | null
  error?: string
}

export interface SerialPortInfo {
  path: string
  manufacturer: string | null
  serialNumber: string | null
  pnpId: string | null
  vendorId: string | null
  productId: string | null
}

function toKg(value: number, unit: string): number {
  if (unit === 'g') return value / 1000
  if (unit === 'lb') return value * 0.453592
  return value
}

function parseWeightLine(line: string): ScaleWeightReading | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  let match = trimmed.match(WEIGHT_REGEX_STANDARD)
  if (match) {
    const sign = match[2] === '-' ? -1 : 1
    const code = match[1].toUpperCase()
    const rawUnit = match[4].toLowerCase()
    const rawValue = parseFloat(match[3]) * sign
    return {
      weight: toKg(rawValue, rawUnit),
      stable: code === 'ST',
      overload: code === 'OL',
      error: code === 'ER',
      unit: 'kg',
    }
  }

  match = trimmed.match(WEIGHT_REGEX_SIMPLE)
  if (match) {
    const sign = match[1] === '-' ? -1 : 1
    const rawUnit = match[3].toLowerCase()
    const rawValue = parseFloat(match[2]) * sign
    return {
      weight: toKg(rawValue, rawUnit),
      stable: true,
      overload: false,
      error: false,
      unit: 'kg',
    }
  }

  return null
}

export class ScaleDriver extends EventEmitter {
  private port: any = null
  private rawBuffer = ''
  private reconnectTimers = new Set<NodeJS.Timeout>()
  private autoReconnect = true
  private connectPending = false

  private emitWeight(reading: ScaleWeightReading): void {
    this.emit('weight', reading)
  }

  private emitStatus(status: ScaleStatus): void {
    this.emit('status', status)
  }

  private processBuffer(): void {
    const parts = this.rawBuffer.split(/[\r\n]+/)
    this.rawBuffer = parts.pop() ?? ''
    for (const line of parts) {
      const trimmed = line.trim()
      if (!trimmed) continue
      const result = parseWeightLine(trimmed)
      if (result) this.emitWeight(result)
    }
  }

  private scheduleReconnect(comPort: string, baudRate: number): void {
    if (!this.autoReconnect) return
    const t = setTimeout(() => {
      this.reconnectTimers.delete(t)
      if (this.autoReconnect) this.connect(comPort, baudRate)
    }, RECONNECT_DELAY_MS)
    this.reconnectTimers.add(t)
  }

  private clearReconnect(): void {
    for (const t of this.reconnectTimers) clearTimeout(t)
    this.reconnectTimers.clear()
  }

  async listPorts(): Promise<SerialPortInfo[]> {
    if (!SerialPortCtor) return []
    const ports = await SerialPortCtor.list()
    return ports.map((p: any) => ({
      path: p.path,
      manufacturer: p.manufacturer || null,
      serialNumber: p.serialNumber || null,
      pnpId: p.pnpId || null,
      vendorId: p.vendorId || null,
      productId: p.productId || null,
    }))
  }

  private tryBaudRate(comPort: string, baudRate: number): Promise<boolean> {
    if (!SerialPortCtor) return Promise.resolve(false)
    return new Promise((resolve) => {
      const testPort = new SerialPortCtor({
        path: comPort, baudRate,
        dataBits: 8, stopBits: 1, parity: 'none',
        rtscts: false, autoOpen: false,
      })

      let totalBytes = 0
      let readableBytes = 0

      testPort.open((err: Error | null) => {
        if (err) return resolve(false)
        testPort.set({ rts: true, dtr: true }, () => {})

        testPort.on('data', (chunk: Buffer) => {
          totalBytes += chunk.length
          for (const b of chunk) {
            if (b >= 0x20 && b <= 0x7e) readableBytes++
          }
        })
        testPort.on('error', () => {})

        setTimeout(() => {
          const pct = totalBytes > 0 ? Math.round((100 * readableBytes) / totalBytes) : 0
          const ok = pct >= 40
          testPort.close(() => resolve(ok))
        }, 1500)
      })
    })
  }

  async detectBaud(comPort: string): Promise<{ baudRate: number | null }> {
    this.autoReconnect = false
    this.clearReconnect()

    await new Promise<void>((resolve) => {
      if (!this.port) return resolve()
      const p = this.port
      this.port = null
      this.rawBuffer = ''
      p.close(() => resolve())
    })

    await new Promise((r) => setTimeout(r, 300))

    for (const baud of BAUD_RATES_TO_TRY) {
      const ok = await this.tryBaudRate(comPort, baud)
      if (ok) return { baudRate: baud }
    }
    return { baudRate: null }
  }

  connect(comPort: string | null, baudRate = 1200): void {
    if (!SerialPortCtor) {
      this.emitStatus({ status: 'error', error: 'serialport module not installed', comPort })
      return
    }
    if (this.connectPending) return
    this.connectPending = true
    this.autoReconnect = true
    this.clearReconnect()

    if (this.port) {
      this.port.removeAllListeners()
      if (this.port.isOpen) { try { this.port.close() } catch { /* already closing */ } }
      this.port = null
    }
    this.rawBuffer = ''

    if (!comPort) {
      this.connectPending = false
      this.emitStatus({ status: 'disconnected', comPort: null })
      return
    }

    const thisPort = new SerialPortCtor({ path: comPort, baudRate, dataBits: 8, stopBits: 1, parity: 'none', rtscts: false, autoOpen: false })
    this.port = thisPort

    thisPort.open((err: Error | null) => {
      if (this.port !== thisPort) {
        if (!err) { try { thisPort.close() } catch { /* discarded port */ } }
        return
      }

      if (err) {
        const msg = err.message
        const isLocked = msg.toLowerCase().includes('access denied') || msg.toLowerCase().includes('cannot open')
        if (isLocked) {
          this.emitStatus({ status: 'connecting', comPort })
          this.port = null
          this.clearReconnect()
          const t = setTimeout(() => {
            this.reconnectTimers.delete(t)
            this.connectPending = false
            if (this.autoReconnect) this.connect(comPort, baudRate)
          }, 3000)
          this.reconnectTimers.add(t)
          return
        }
        this.connectPending = false
        console.error(`[Scale] Failed to open ${comPort}:`, msg)
        this.emitStatus({ status: 'error', error: msg, comPort })
        this.scheduleReconnect(comPort, baudRate)
        return
      }
      this.connectPending = false
      thisPort.set({ rts: true, dtr: true }, () => {})
      this.emitStatus({ status: 'connected', comPort })
    })

    thisPort.on('data', (chunk: Buffer) => {
      if (this.port !== thisPort) return
      this.rawBuffer += chunk.toString('latin1')
      this.processBuffer()
    })

    thisPort.on('error', (err: Error) => {
      if (this.port !== thisPort) return
      console.error(`[Scale] Port error on ${comPort}:`, err.message)
      this.emitStatus({ status: 'error', error: err.message, comPort })
      this.scheduleReconnect(comPort, baudRate)
    })

    thisPort.on('close', () => {
      if (this.port !== thisPort) return
      this.emitStatus({ status: 'disconnected', comPort })
      this.scheduleReconnect(comPort, baudRate)
    })
  }

  disconnect(): void {
    this.connectPending = false
    this.autoReconnect = false
    this.clearReconnect()

    if (this.port) {
      try { this.port.close() } catch { /* already closed */ }
      this.port = null
    }
    this.rawBuffer = ''

    this.emitStatus({ status: 'disconnected', comPort: null })
  }

  tare(): boolean {
    if (!this.port || !this.port.isOpen) return false
    this.port.write('T\r\n', (err: Error | null) => {
      if (err) console.error('[Scale] Tare write error:', err.message)
    })
    return true
  }
}
