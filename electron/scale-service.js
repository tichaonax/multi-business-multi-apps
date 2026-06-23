/**
 * Scale Service — Star Micronics MG-S8200 RS-232 driver
 *
 * Handles COM port management, weight streaming, and tare for the MG-S8200 scale.
 * All communication with the renderer goes through IPC (ipcMain.handle / webContents.send).
 */

let SerialPort
try {
  SerialPort = require('serialport').SerialPort
} catch (e) {
  console.warn('[Scale] serialport module not available — scale features disabled:', e.message)
}

const Store = require('electron-store')

const store = new Store({ name: 'scale-config' })

let port = null
let rawBuffer = ''
const reconnectTimers = new Set()   // tracks ALL pending retry timers so clearReconnect() cancels every one
let mainWindowRef = null
let autoReconnect = true
let connectPending = false  // mutex: prevents concurrent connect() calls

const BAUD_RATES_TO_TRY = [1200, 2400, 4800, 9600, 19200, 38400]
const RECONNECT_DELAY_MS = 5000

// Format 1 (Star standard): "ST,+  1.234 kg"  "US, 0.000 kg"
const WEIGHT_REGEX_STANDARD = /^(ST|US|OL|ER),\s*([+\-]?)\s*([\d.]+)\s*(kg|g|lb)/i
// Format 2 (simple, used by MG-S8200 at 1200 baud): "  +      91  g"
const WEIGHT_REGEX_SIMPLE = /^\s*([+\-]?)\s*([\d.]+)\s*(kg|g|lb)\s*$/i

// Always emit weight in kg so all consumers are consistent
function toKg(value, unit) {
  if (unit === 'g') return value / 1000
  if (unit === 'lb') return value * 0.453592
  return value
}

function parseWeightLine(line) {
  const trimmed = line.trim()
  if (!trimmed) return null

  // Try standard Star protocol format first
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

  // Try simple format (sign + value + unit, no status prefix)
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

// Process raw buffer — split on any combination of \r and \n
function processBuffer() {
  const parts = rawBuffer.split(/[\r\n]+/)
  // Last part may be an incomplete line — keep it in the buffer
  rawBuffer = parts.pop()
  for (const line of parts) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const result = parseWeightLine(trimmed)
    if (result) emit('scale:weight', result)
  }
}

function emit(channel, data) {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    mainWindowRef.webContents.send(channel, data)
  }
}

function scheduleReconnect(comPort) {
  if (!autoReconnect) return
  const t = setTimeout(() => {
    reconnectTimers.delete(t)
    if (autoReconnect) connect(comPort)
  }, RECONNECT_DELAY_MS)
  reconnectTimers.add(t)
}

function clearReconnect() {
  for (const t of reconnectTimers) clearTimeout(t)
  reconnectTimers.clear()
}

// ─── Baud Rate Detection ──────────────────────────────────────────────────────

function tryBaudRate(comPort, baudRate) {
  if (!SerialPort) return Promise.resolve(false)
  return new Promise((resolve) => {
    const testPort = new SerialPort({
      path: comPort, baudRate,
      dataBits: 8, stopBits: 1, parity: 'none',
      rtscts: false, autoOpen: false,
    })

    let totalBytes = 0
    let readableBytes = 0

    testPort.open((err) => {
      if (err) return resolve(false)
      testPort.set({ rts: true, dtr: true }, () => {})

      testPort.on('data', (chunk) => {
        totalBytes += chunk.length
        for (const b of chunk) {
          if (b >= 0x20 && b <= 0x7e) readableBytes++
        }
      })
      testPort.on('error', () => {})

      setTimeout(() => {
        const pct = totalBytes > 0 ? Math.round(100 * readableBytes / totalBytes) : 0
        const ok = pct >= 40
        testPort.close(() => resolve(ok))
      }, 1500)
    })
  })
}

async function detectBaud(comPort) {
  // Stop auto-reconnect so closing the port doesn't trigger a reconnect race
  autoReconnect = false
  clearReconnect()

  // Wait for the port to fully close before probing
  await new Promise((resolve) => {
    if (!port) return resolve()
    const p = port
    port = null
    rawBuffer = ''
    p.close(() => resolve())
  })

  // Small delay for the OS to release the port handle
  await new Promise(r => setTimeout(r, 300))

  for (const baud of BAUD_RATES_TO_TRY) {
    const ok = await tryBaudRate(comPort, baud)
    if (ok) {
      store.set('scale.baudRate', baud)
      return { baudRate: baud }
    }
  }
  // Only clear the COM port (prevents auto-connect to an unresponsive port).
  // Keep baudRate — it's still valid for the next manual attempt.
  store.delete('scale.comPort')
  return { baudRate: null }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const STARTUP_DELAY_MS = 3000  // wait for any previous Electron process to release the COM port

function init(mainWindow) {
  mainWindowRef = mainWindow

  const saved = getSavedPort()
  if (saved) {
    const t = setTimeout(() => {
      reconnectTimers.delete(t)
      if (autoReconnect) connect(saved)
    }, STARTUP_DELAY_MS)
    reconnectTimers.add(t)
  }
}

async function listPorts() {
  if (!SerialPort) return []
  const ports = await SerialPort.list()
  return ports.map(p => ({
    path: p.path,
    manufacturer: p.manufacturer || null,
    serialNumber: p.serialNumber || null,
    pnpId: p.pnpId || null,
    vendorId: p.vendorId || null,
    productId: p.productId || null,
  }))
}

function getSavedPort() {
  return store.get('scale.comPort', null)
}

function getSavedBaudRate() {
  return store.get('scale.baudRate', null)
}

function connect(comPort, baudRateOverride) {
  if (!SerialPort) {
    emit('scale:status', { status: 'error', error: 'serialport module not installed — run electron-rebuild', comPort })
    return
  }
  // Deduplicate: if a connect is already in flight, ignore this call.
  // This prevents ScaleContext + ScaleSettings both calling connect simultaneously.
  if (connectPending) {
    return
  }
  connectPending = true
  autoReconnect = true
  clearReconnect()

  // Discard existing port — remove listeners first so stale callbacks
  // from the old port don't race with the new one.
  if (port) {
    port.removeAllListeners()
    if (port.isOpen) { try { port.close() } catch (_) {} }
    port = null
  }
  rawBuffer = ''

  if (!comPort) {
    emit('scale:status', { status: 'disconnected', comPort: null })
    return
  }

  const baudRate = baudRateOverride ?? store.get('scale.baudRate', 1200)
  if (baudRateOverride) store.set('scale.baudRate', baudRateOverride)

  const thisPort = new SerialPort({ path: comPort, baudRate, dataBits: 8, stopBits: 1, parity: 'none', rtscts: false, autoOpen: false })
  port = thisPort

  thisPort.open((err) => {
    // Guard: if connect() was called again while we were waiting for open(),
    // this callback belongs to a discarded port.
    // If it somehow succeeded in opening, close it immediately to release the COM port.
    if (port !== thisPort) {
      if (!err) { try { thisPort.close() } catch (_) {} }
      return
    }

    if (err) {
      const msg = err.message
      const isLocked = msg.toLowerCase().includes('access denied') ||
                       msg.toLowerCase().includes('cannot open')
      if (isLocked) {
        // Keep connectPending = true for the full retry window so the UI cannot
        // fire additional connect() calls while we are waiting to retry.
        // connectPending is released inside the timer, just before retrying.
        emit('scale:status', { status: 'connecting', comPort })
        port = null
        clearReconnect()
        const t = setTimeout(() => {
          reconnectTimers.delete(t)
          connectPending = false  // release mutex here, not on the error path above
          if (autoReconnect) connect(comPort, baudRateOverride)
        }, 3000)
        reconnectTimers.add(t)
        return
      }
      connectPending = false  // non-lock error: release immediately
      console.error(`[Scale] Failed to open ${comPort}:`, msg)
      emit('scale:status', { status: 'error', error: msg, comPort })
      scheduleReconnect(comPort)
      return
    }
    connectPending = false  // success: release mutex
    // Only persist after a successful open
    store.set('scale.comPort', comPort)
    port.set({ rts: true, dtr: true }, () => {})  // connectPending already false (released on error path)
    emit('scale:status', { status: 'connected', comPort })
  })

  thisPort.on('data', (chunk) => {
    if (port !== thisPort) return
    const str = chunk.toString('latin1')
    rawBuffer += str
    processBuffer()
  })

  thisPort.on('error', (err) => {
    if (port !== thisPort) return
    console.error(`[Scale] Port error on ${comPort}:`, err.message)
    emit('scale:status', { status: 'error', error: err.message, comPort })
    scheduleReconnect(comPort)
  })

  thisPort.on('close', () => {
    if (port !== thisPort) return
    emit('scale:status', { status: 'disconnected', comPort })
    scheduleReconnect(comPort)
  })
}

function disconnect() {
  connectPending = false
  autoReconnect = false
  clearReconnect()

  if (port) {
    try { port.close() } catch (_) {}
    port = null
  }
  rawBuffer = ''

  emit('scale:status', { status: 'disconnected', comPort: null })
}

// Promise-based close used by before-quit so the serial driver finishes cleanup
// before the process exits — prevents "Access denied" on rapid restart.
function disconnectAsync() {
  connectPending = false
  autoReconnect = false
  clearReconnect()
  rawBuffer = ''

  return new Promise((resolve) => {
    if (!port) {
      emit('scale:status', { status: 'disconnected', comPort: null })
      return resolve()
    }
    const p = port
    port = null

    // Hard 2-second timeout — if close() callback never fires, quit anyway.
    // Without this, a pending open() can deadlock before-quit forever.
    let resolved = false
    const safeResolve = (_reason) => {
      if (resolved) return
      resolved = true
      emit('scale:status', { status: 'disconnected', comPort: null })
      resolve()
    }
    const deadline = setTimeout(() => safeResolve('timeout (2s)'), 2000)

    try {
      p.close(() => {
        clearTimeout(deadline)
        safeResolve('port closed')
      })
    } catch (_e) {
      clearTimeout(deadline)
      safeResolve('close() threw')
    }
  })
}

function tare() {
  if (!port || !port.isOpen) return false
  // MG-S8200 tare command
  port.write('T\r\n', (err) => {
    if (err) console.error('[Scale] Tare write error:', err.message)
  })
  return true
}

module.exports = { init, listPorts, getSavedPort, getSavedBaudRate, connect, disconnect, disconnectAsync, tare, detectBaud }
