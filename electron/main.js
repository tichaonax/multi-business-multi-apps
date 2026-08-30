/**
 * Electron Main Process
 *
 * Automatically opens POS on primary monitor and customer display on secondary monitor
 * in fullscreen kiosk mode.
 *
 * Multi-server support: this kiosk can be registered against several
 * different app servers (different companies, or a test server alongside a
 * real one) and switch between them — see server-registry.js /
 * connection-test.js / renderer/server-picker.html. Each server gets its
 * own non-persistent session partition, so logging into one never shares
 * cookies/localStorage with another; switching tears down and recreates
 * both windows on the new server's partition rather than trying to swap it
 * on a live window, which would risk leaking session state between them.
 */

const { app, BrowserWindow, screen, ipcMain, Menu, session: electronSession } = require('electron')
const path = require('path')
const scaleService = require('./scale-service')
const registry = require('./server-registry')
const { testConnection } = require('./connection-test')

// ─── EPIPE protection ───────────────────────────────────────────────────────
// Wrap console output in try-catch so a USB unplug (which closes stdout/stderr)
// does not crash the main process with an EPIPE error.
;['log', 'error', 'warn'].forEach((level) => {
  const orig = console[level].bind(console)
  console[level] = (...args) => {
    try { orig(...args) } catch (_) {}
  }
})
// ─────────────────────────────────────────────────────────────────────────────

// ─── Single-instance lock ────────────────────────────────────────────────────
// Prevents two Electron processes running at the same time (which would cause
// "Access denied" on the COM port because the first instance still holds it).
if (!app.requestSingleInstanceLock()) {
  // app.exit() is synchronous — execution stops here.
  // app.quit() is async and would let the code continue, creating windows before exiting.
  console.log('[App] Another instance is already running — exiting immediately.')
  app.exit(0)
}
// If a second launch is attempted, bring the existing window to the foreground.
app.on('second-instance', () => {
  const w = mainWindow || pickerWindow
  if (w) {
    if (w.isMinimized()) w.restore()
    w.focus()
  }
})
// ─────────────────────────────────────────────────────────────────────────────

// Suppress GPU hardware acceleration errors (common on headless/remote desktop environments)
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')

let mainWindow = null
let customerWindow = null
let pickerWindow = null
let activeServerId = null
let pendingOpenContext = null // { failure: {...} } | null — read once by the picker on open

// ─── Server session / cert trust ────────────────────────────────────────────

// Non-persistent (no "persist:" prefix) — deliberately. The previous
// single-server build cleared cookies on every window close anyway (see
// the close handler below), so there was never any cross-restart login
// persistence to begin with; an in-memory partition keeps that exact
// behavior while adding real isolation BETWEEN servers within one running
// session, without leaving a per-server cookie DB sitting on disk for a
// server that's no longer registered.
function partitionNameFor(serverId) {
  return `server-${serverId}`
}

// Certificate trust is pinned per server, not blanket-trusted by hostname —
// see connection-test.js's identical reasoning. A server's fingerprint is
// only ever recorded here after an admin explicitly confirmed it during
// the add-server test; a mismatch (cert rotated unexpectedly, or a genuine
// spoofing attempt) fails closed rather than silently trusting whatever's
// on the wire now.
function applyCertificateTrust(session, serverEntry) {
  session.setCertificateVerifyProc((request, callback) => {
    if (request.errorCode === 0) {
      callback(0)
      return
    }
    const fingerprint = request.certificate?.fingerprint
    if (serverEntry.certFingerprint && fingerprint === serverEntry.certFingerprint) {
      callback(0)
    } else {
      callback(-2)
    }
  })
}

// ─── Window lifecycle ────────────────────────────────────────────────────────

function destroyActiveWindows() {
  if (customerWindow) {
    customerWindow.removeAllListeners('close')
    customerWindow.destroy()
    customerWindow = null
  }
  if (mainWindow) {
    mainWindow.removeAllListeners('close')
    mainWindow.destroy()
    mainWindow = null
  }
}

async function openServer(serverEntry) {
  if (!serverEntry) {
    showPicker()
    return
  }

  console.log(`[App] Opening server: ${serverEntry.label} (${serverEntry.url})`)

  if (pickerWindow) {
    pickerWindow.close()
  }

  // Switching away from whichever server (if any) was previously active —
  // release the COM port first, same as the quit path, since the physical
  // scale isn't meaningfully "for" any particular server and shouldn't stay
  // attached to a session that's about to be torn down.
  if (activeServerId) {
    await scaleService.disconnectAsync().catch(() => {})
  }
  destroyActiveWindows()

  const partition = partitionNameFor(serverEntry.id)
  const serverSession = electronSession.fromPartition(partition, { cache: true })
  applyCertificateTrust(serverSession, serverEntry)

  activeServerId = serverEntry.id
  registry.setLastUsed(serverEntry.id)

  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  const secondary = displays.find((d) => d.id !== primary.id)

  mainWindow = new BrowserWindow({
    x: primary.bounds.x,
    y: primary.bounds.y,
    width: primary.bounds.width,
    height: primary.bounds.height,
    title: 'Multi-Business Management Platform',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition,
    },
    autoHideMenuBar: true,
    fullscreen: false,
  })

  let loadFailed = false
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    // Only the top-level page navigation counts — a failed sub-resource
    // (an image, a font, an analytics script) must never bounce the
    // operator out to the server picker over something that wouldn't have
    // stopped the app from working.
    if (!isMainFrame) return
    // -3 is ERR_ABORTED, which fires harmlessly on a deliberate navigation
    // (e.g. a client-side redirect) — not a real failure.
    if (errorCode === -3) return
    if (loadFailed) return
    loadFailed = true
    console.error(`[App] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`)
    handleServerLoadFailure(serverEntry, `${errorDescription} (${errorCode})`)
  })

  mainWindow.loadURL(`${serverEntry.url}/`)

  mainWindow.on('close', (event) => {
    if (app.isQuitting) return
    event.preventDefault()
    app.isQuitting = true
    console.log('[App] Main window closing — releasing COM port…')
    scaleService.disconnectAsync().then(() => {
      const s = mainWindow?.webContents?.session
      const clear = s ? s.clearStorageData({ storages: ['cookies'] }).catch(() => {}) : Promise.resolve()
      clear.finally(() => {
        mainWindow?.destroy()
      })
    })
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    if (customerWindow) {
      customerWindow.close()
      customerWindow = null
    }
  })

  if (secondary) {
    createCustomerWindow(serverEntry, secondary, partition)
  } else {
    console.log('⚠️  No secondary display detected - customer display will not open')
  }

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  scaleService.init(mainWindow)
}

function createCustomerWindow(serverEntry, secondary, partition) {
  customerWindow = new BrowserWindow({
    x: secondary.bounds.x,
    y: secondary.bounds.y,
    width: secondary.bounds.width,
    height: secondary.bounds.height,
    title: 'Customer Display',
    frame: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition, // same partition as mainWindow — required for BroadcastChannel/shared storage
    },
  })

  customerWindow.setBounds({ x: secondary.bounds.x, y: secondary.bounds.y, width: secondary.bounds.width, height: secondary.bounds.height })
  customerWindow.setKiosk(true)
  customerWindow.setAlwaysOnTop(true, 'screen-saver')
  customerWindow.setVisibleOnAllWorkspaces(true)
  customerWindow.focus()

  customerWindow.on('focus', () => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.setKiosk(true)
      customerWindow.setFullScreen(true)
      customerWindow.focus()
    }
  })
  customerWindow.on('leave-full-screen', () => {
    if (customerWindow && !customerWindow.isDestroyed()) {
      customerWindow.setKiosk(true)
      customerWindow.setFullScreen(true)
    }
  })

  const terminalId = process.env.TERMINAL_ID || `terminal-${Date.now()}`
  const displayUrl = `${serverEntry.url}/customer-display?terminalId=${terminalId}`
  customerWindow.loadURL(displayUrl)

  customerWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      customerWindow?.setKiosk(true)
      customerWindow?.setFullScreen(true)
      customerWindow?.setMenuBarVisibility(false)
    }, 500)
  })
  customerWindow.once('ready-to-show', () => {
    setTimeout(() => {
      customerWindow?.setKiosk(true)
      customerWindow?.setFullScreen(true)
    }, 1000)
  })
  customerWindow.once('show', () => {
    setTimeout(() => {
      customerWindow?.setKiosk(true)
      customerWindow?.setFullScreen(true)
      customerWindow?.focus()
    }, 1500)
  })

  if (process.env.NODE_ENV === 'development') {
    customerWindow.webContents.openDevTools()
  }

  customerWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      customerWindow.hide()
    }
  })
}

// Auto-load-last-used can strand the operator on a blank/failed screen if
// that server is unreachable — this is the escape hatch: fall back to the
// picker automatically, with the specific failure and (if set) this
// server's support contact shown right there, rather than a dead window
// with no way forward.
function handleServerLoadFailure(serverEntry, message) {
  activeServerId = null
  pendingOpenContext = {
    failure: {
      label: serverEntry.label,
      host: serverEntry.host || serverEntry.url,
      message,
      supportContact: serverEntry.supportContact || null,
    },
  }
  destroyActiveWindows()
  showPicker()
}

function showPicker() {
  if (pickerWindow) {
    pickerWindow.focus()
    return
  }
  pickerWindow = new BrowserWindow({
    width: 900,
    height: 720,
    title: 'Select Server',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'renderer', 'server-picker-preload.js'),
    },
  })
  pickerWindow.loadFile(path.join(__dirname, 'renderer', 'server-picker.html'))
  pickerWindow.on('closed', () => {
    pickerWindow = null
    // Only quit if this was the initial "nothing active yet" picker and the
    // operator closed it without ever picking a server — if a server is
    // already active (this was opened via "Switch Server" mid-session),
    // closing the picker is just a cancel, not an app-level decision.
    if (!activeServerId && !mainWindow) {
      app.quit()
    }
  })
}

// ─── IPC Handlers — servers ──────────────────────────────────────────────────

ipcMain.handle('servers:list', () => registry.list())
ipcMain.handle('servers:hasPin', () => registry.hasPin())
ipcMain.handle('servers:setPin', (_e, pin) => {
  registry.setPin(pin)
  return true
})
ipcMain.handle('servers:verifyPin', (_e, pin) => registry.verifyPin(pin))

ipcMain.handle('servers:testConnection', (_e, params) => testConnection(params))

ipcMain.handle('servers:add', (_e, params) => {
  // Re-verified here, not just trusted from the renderer's own PIN gate —
  // the main process is the actual security boundary, the renderer UI is
  // just where the prompt happens to live.
  if (!registry.verifyPin(params.pin)) {
    return { ok: false, message: 'Incorrect PIN.' }
  }
  const entry = registry.add({
    label: params.label,
    host: params.host,
    url: params.url,
    supportContact: params.supportContact,
    certFingerprint: params.certFingerprint,
  })
  return { ok: true, entry }
})

ipcMain.handle('servers:remove', (_e, { id, pin }) => {
  if (!registry.verifyPin(pin)) {
    return { ok: false, message: 'Incorrect PIN.' }
  }
  if (id === activeServerId) {
    activeServerId = null
  }
  registry.remove(id)
  return { ok: true }
})

ipcMain.handle('servers:switchTo', async (_e, id) => {
  const entry = registry.get(id)
  if (!entry) return { ok: false }
  await openServer(entry)
  return { ok: true }
})

// Lets the renderer show "Connected to: <label>" on the landing/sign-in
// screens — returns the same registry entry openServer() was called with,
// not just the id, so the label/host are available without a second lookup.
ipcMain.handle('servers:getActive', () => (activeServerId ? registry.get(activeServerId) : null))

ipcMain.handle('servers:getOpenContext', () => {
  const ctx = pendingOpenContext
  pendingOpenContext = null
  return ctx
})

// Lets the main app's own window (not just the picker) ask to reopen the
// picker — used by the "Switch Server" link on the sign-in page, since
// otherwise the only way back to the picker is the hidden app menu /
// Ctrl+Shift+S accelerator.
ipcMain.handle('servers:showPicker', () => {
  showPicker()
  return true
})

// ─── IPC Handlers — displays / scale (unchanged) ────────────────────────────

ipcMain.handle('get-displays', () => screen.getAllDisplays())
ipcMain.handle('scale:list-ports', () => scaleService.listPorts())
ipcMain.handle('scale:get-saved-port', () => scaleService.getSavedPort())
ipcMain.handle('scale:get-saved-baud', () => scaleService.getSavedBaudRate())
ipcMain.handle('scale:connect', (_event, comPort, baudRateOverride) => {
  scaleService.connect(comPort, baudRateOverride)
  return { ok: true }
})
ipcMain.handle('scale:disconnect', () => {
  scaleService.disconnect()
  return { ok: true }
})
ipcMain.handle('scale:tare', () => ({ ok: scaleService.tare() }))
ipcMain.handle('scale:detect-baud', (_event, comPort) => scaleService.detectBaud(comPort))

// ─── Menu — "Switch Server" needs to survive kiosk mode hiding the menu bar,
// so it's reachable via a keyboard accelerator too, not just a visible menu
// item. ────────────────────────────────────────────────────────────────────

function buildMenu() {
  const template = [
    {
      label: 'Server',
      submenu: [
        {
          label: 'Switch Server…',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => showPicker(),
        },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ─── App ready ────────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  buildMenu()

  const lastUsed = registry.getLastUsed()
  if (lastUsed) {
    openServer(lastUsed)
  } else {
    showPicker()
  }

  screen.on('display-added', (event, newDisplay) => {
    console.log('Display added:', newDisplay.id)
  })
  screen.on('display-removed', (event, oldDisplay) => {
    console.log('Display removed:', oldDisplay.id)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const last = registry.getLastUsed()
      if (last) openServer(last)
      else showPicker()
    }
  })
})

// Quit when all windows are closed (except on macOS) — but not on the
// transient zero-window instant that happens mid-switch: openServer() and
// handleServerLoadFailure() both destroy the old window(s) before creating
// the new one (or the picker), and BrowserWindow's 'closed'/'window-all-closed'
// events fire synchronously from destroy(), so this can see 0 windows before
// the replacement exists in the very same call stack. Deferring one tick lets
// that replacement window finish being created first — a real "operator
// closed the last window" case still has 0 windows on the next tick and
// quits exactly as before.
app.on('window-all-closed', () => {
  if (process.platform === 'darwin') return
  setImmediate(() => {
    if (BrowserWindow.getAllWindows().length === 0) {
      app.quit()
    }
  })
})

// Fallback: if app.quit() is called without the window close path running
// (e.g. programmatic quit, macOS ⌘Q), still ensure the COM port is released.
app.on('before-quit', (event) => {
  if (app.isQuitting) return
  app.isQuitting = true
  event.preventDefault()
  console.log('[App] before-quit — releasing COM port…')
  scaleService.disconnectAsync().then(() => {
    app.quit()
  })
})
