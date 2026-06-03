/**
 * Scale Service — Star Micronics MG-S8200 RS-232 driver
 *
 * Handles COM port management, weight streaming, and tare for the MG-S8200 scale.
 * All communication with the renderer goes through IPC (ipcMain.handle / webContents.send).
 */

const { SerialPort } = require('serialport')
const Store = require('electron-store')

const store = new Store({ name: 'scale-config' })

let port = null
let rawBuffer = ''
let reconnectTimer = null
let mainWindowRef = null
let autoReconnect = true

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

  console.log('[Scale] No regex match for line:', JSON.stringify(trimmed))
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
    console.log('[Scale] RAW line:', JSON.stringify(trimmed))
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
  clearReconnect()
  if (!autoReconnect) return
  reconnectTimer = setTimeout(() => connect(comPort), RECONNECT_DELAY_MS)
}

function clearReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

// ─── Baud Rate Detection ──────────────────────────────────────────────────────

function tryBaudRate(comPort, baudRate) {
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
        console.log(`[Scale] detectBaud ${baudRate}: ${totalBytes} bytes, ${pct}% readable → ${ok ? 'MATCH' : 'no'}`)
        testPort.close(() => resolve(ok))
      }, 1500)
    })
  })
}

async function detectBaud(comPort) {
  console.log(`[Scale] Auto-detecting baud rate on ${comPort}...`)

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
      console.log(`[Scale] Detected baud rate: ${baud}`)
      store.set('scale.baudRate', baud)
      return { baudRate: baud }
    }
  }
  console.log('[Scale] No baud rate detected')
  // Only clear the COM port (prevents auto-connect to an unresponsive port).
  // Keep baudRate — it's still valid for the next manual attempt.
  store.delete('scale.comPort')
  return { baudRate: null }
}

// ─── Public API ───────────────────────────────────────────────────────────────

function init(mainWindow) {
  mainWindowRef = mainWindow

  // Auto-connect to previously saved port on startup
  const saved = getSavedPort()
  if (saved) {
    connect(saved)
  }
}

async function listPorts() {
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

function connect(comPort, baudRateOverride, _retryCount = 0) {
  autoReconnect = true
  clearReconnect()

  // Close existing port if open
  if (port) {
    try { port.close() } catch (_) {}
    port = null
  }
  rawBuffer = ''

  if (!comPort) {
    emit('scale:status', { status: 'disconnected', comPort: null })
    return
  }

  const baudRate = baudRateOverride ?? store.get('scale.baudRate', 1200)
  if (baudRateOverride) store.set('scale.baudRate', baudRateOverride)
  console.log(`[Scale] Connecting to ${comPort} at ${baudRate} baud (attempt ${_retryCount + 1})`)
  port = new SerialPort({ path: comPort, baudRate, dataBits: 8, stopBits: 1, parity: 'none', rtscts: false, autoOpen: false })

  port.open((err) => {
    if (err) {
      console.error(`[Scale] Failed to open ${comPort}:`, err.message)
      emit('scale:status', { status: 'error', error: err.message, comPort })
      scheduleReconnect(comPort)
      return
    }
    // Only persist after a successful open
    store.set('scale.comPort', comPort)
    // Assert RTS+DTR so the scale starts streaming
    port.set({ rts: true, dtr: true }, () => {})
    console.log(`[Scale] Connected to ${comPort}`)
    emit('scale:status', { status: 'connected', comPort })
  })

  // Raw data — log every chunk so we can see exactly what the scale sends
  port.on('data', (chunk) => {
    const hex = Buffer.from(chunk).toString('hex')
    const str = chunk.toString('latin1')
    console.log('[Scale] RAW chunk hex:', hex, '| text:', JSON.stringify(str))
    rawBuffer += str
    processBuffer()
  })

  port.on('error', (err) => {
    console.error(`[Scale] Port error on ${comPort}:`, err.message)
    emit('scale:status', { status: 'error', error: err.message, comPort })
    scheduleReconnect(comPort)
  })

  port.on('close', () => {
    console.log(`[Scale] Port closed: ${comPort}`)
    emit('scale:status', { status: 'disconnected', comPort })
    scheduleReconnect(comPort)
  })
}

function disconnect() {
  autoReconnect = false
  clearReconnect()

  if (port) {
    try { port.close() } catch (_) {}
    port = null
  }
  rawBuffer = ''

  emit('scale:status', { status: 'disconnected', comPort: null })
}

function tare() {
  if (!port || !port.isOpen) return false
  // MG-S8200 tare command
  port.write('T\r\n', (err) => {
    if (err) console.error('[Scale] Tare write error:', err.message)
  })
  return true
}

module.exports = { init, listPorts, getSavedPort, getSavedBaudRate, connect, disconnect, tare, detectBaud }
