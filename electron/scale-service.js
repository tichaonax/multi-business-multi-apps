/**
 * Scale Service — Star Micronics MG-S8200 RS-232 driver
 *
 * Handles COM port management, weight streaming, and tare for the MG-S8200 scale.
 * All communication with the renderer goes through IPC (ipcMain.handle / webContents.send).
 */

const { SerialPort } = require('serialport')
const { ReadlineParser } = require('@serialport/parser-readline')
const Store = require('electron-store')

const store = new Store({ name: 'scale-config' })

let port = null
let parser = null
let reconnectTimer = null
let mainWindowRef = null
let autoReconnect = true

const BAUD_RATE = 9600
const RECONNECT_DELAY_MS = 5000

// MG-S8200 output: "ST,+  1.234 kg\r\n" | "US,+  1.234 kg\r\n" | "OL,+  9.999 kg\r\n"
const WEIGHT_REGEX = /^(ST|US|OL|ER),([+-])\s*([\d.]+)\s*(kg|g|lb)/i

function parseWeightLine(line) {
  const match = line.trim().match(WEIGHT_REGEX)
  if (!match) return null

  const sign = match[2] === '-' ? -1 : 1
  const value = parseFloat(match[3]) * sign
  const unit = match[4].toLowerCase()
  const code = match[1].toUpperCase()

  return {
    weight: value,
    stable: code === 'ST',
    overload: code === 'OL',
    error: code === 'ER',
    unit,
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

function connect(comPort) {
  autoReconnect = true
  clearReconnect()

  // Close existing port if open
  if (port) {
    try { port.close() } catch (_) {}
    port = null
    parser = null
  }

  if (!comPort) {
    emit('scale:status', { status: 'disconnected', comPort: null })
    return
  }

  // Persist the chosen port
  store.set('scale.comPort', comPort)

  port = new SerialPort({ path: comPort, baudRate: BAUD_RATE, autoOpen: false })
  parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }))

  port.open((err) => {
    if (err) {
      console.error(`[Scale] Failed to open ${comPort}:`, err.message)
      emit('scale:status', { status: 'error', error: err.message, comPort })
      scheduleReconnect(comPort)
      return
    }
    console.log(`[Scale] Connected to ${comPort}`)
    emit('scale:status', { status: 'connected', comPort })
  })

  parser.on('data', (line) => {
    const result = parseWeightLine(line)
    if (result) emit('scale:weight', result)
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
    parser = null
  }

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

module.exports = { init, listPorts, getSavedPort, connect, disconnect, tare }
