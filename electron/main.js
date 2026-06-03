/**
 * Electron Main Process
 *
 * Automatically opens POS on primary monitor and customer display on secondary monitor
 * in fullscreen kiosk mode.
 */

const { app, BrowserWindow, screen, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const scaleService = require('./scale-service')

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
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})
// ─────────────────────────────────────────────────────────────────────────────

// Suppress GPU hardware acceleration errors (common on headless/remote desktop environments)
app.commandLine.appendSwitch('disable-gpu')
app.commandLine.appendSwitch('disable-software-rasterizer')

let mainWindow = null
let customerWindow = null

// Get server URL from environment (supports both dev and production)
const SERVER_PORT = process.env.PORT || process.env.NEXT_PUBLIC_PORT || 8080

// Auto-detect HTTPS: use https:// if certs are present in the project root certs/ folder
const certsDir = path.join(__dirname, '..', 'certs')
const hasHttpsCerts = fs.existsSync(certsDir) &&
  fs.readdirSync(certsDir).some(f => f.endsWith('.pem') && !f.includes('-key') && f !== 'rootCA.pem')
const protocol = hasHttpsCerts ? 'https' : 'http'
const SERVER_URL = `${protocol}://localhost:${SERVER_PORT}`

console.log(`Electron using server URL: ${SERVER_URL}`)

// Trust the local self-signed certificate (mkcert) for localhost connections.
// This must be registered before app.whenReady().
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (url.startsWith(`https://localhost:`) || url.startsWith('https://127.0.0.1:')) {
    event.preventDefault()
    callback(true) // trust local cert
  } else {
    callback(false)
  }
})

function createWindows() {
  // Get all displays
  const displays = screen.getAllDisplays()
  console.log(`Found ${displays.length} display(s)`)

  // Log all displays for debugging
  displays.forEach((display, index) => {
    console.log(`Display ${index + 1}:`, {
      id: display.id,
      bounds: display.bounds,
      workArea: display.workArea,
      scaleFactor: display.scaleFactor,
      rotation: display.rotation,
      internal: display.internal
    })
  })

  // Primary display (where POS runs) - use Electron's primary display API
  const primary = screen.getPrimaryDisplay()
  console.log('Primary display ID:', primary.id)

  // Secondary display (for customer-facing screen) - any display that's not primary
  const secondary = displays.find(d => d.id !== primary.id)

  // Create main POS window on primary display
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
      partition: 'persist:pos' // Shared partition so BroadcastChannel works
    },
    autoHideMenuBar: true,
    fullscreen: false // Allow windowed mode for POS operator
  })

  // Load the home/dashboard page - user will navigate to their desired POS
  // This allows flexibility to use any business type without restarting Electron
  mainWindow.loadURL(`${SERVER_URL}/`)

  // When the user closes the main window: release the COM port FIRST, then
  // destroy the window. This guarantees the serial port is freed even if the
  // OS never fires before-quit (e.g. task-kill, power-off, crash).
  mainWindow.on('close', (event) => {
    if (app.isQuitting) return  // already handled by before-quit path
    event.preventDefault()      // hold the close until COM port is released
    app.isQuitting = true
    console.log('[App] Main window closing — releasing COM port…')
    scaleService.disconnectAsync().then(() => {
      // Clear cookies (removes NextAuth session) then destroy the window
      const session = mainWindow?.webContents?.session
      const clear = session
        ? session.clearStorageData({ storages: ['cookies'] }).catch(() => {})
        : Promise.resolve()
      clear.finally(() => {
        mainWindow?.destroy()  // destroy() bypasses the 'close' event so no recursion
      })
    })
  })

  // Open customer display immediately on secondary monitor (if available)
  // Customer display will show advertising/marketing until business is selected
  if (secondary) {
    console.log(`Secondary display detected at (${secondary.bounds.x}, ${secondary.bounds.y})`)

    customerWindow = new BrowserWindow({
      x: secondary.bounds.x,
      y: secondary.bounds.y,
      width: secondary.bounds.width,
      height: secondary.bounds.height,
      title: 'Customer Display',
      frame: false, // No window frame
      autoHideMenuBar: true,
      alwaysOnTop: true, // Stay on top
      skipTaskbar: true, // Hide from taskbar
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: 'persist:pos' // MUST use same partition for BroadcastChannel to work
      }
    })

    // Set kiosk mode IMMEDIATELY (before loading URL)
    // Set bounds to cover entire screen including taskbar area
    customerWindow.setBounds({
      x: secondary.bounds.x,
      y: secondary.bounds.y,
      width: secondary.bounds.width,
      height: secondary.bounds.height
    })

    customerWindow.setKiosk(true)
    customerWindow.setAlwaysOnTop(true, 'screen-saver') // Highest level
    customerWindow.setVisibleOnAllWorkspaces(true)
    customerWindow.focus()

    console.log('✅ Customer display kiosk mode set immediately on creation')

    // Force kiosk mode when window regains focus
    customerWindow.on('focus', () => {
      // Check if window still exists before calling methods
      if (customerWindow && !customerWindow.isDestroyed()) {
        customerWindow.setKiosk(true)
        customerWindow.setFullScreen(true)
        customerWindow.focus()
      }
    })

    // Prevent window from ever leaving kiosk mode
    customerWindow.on('leave-full-screen', () => {
      console.log('[Customer Display] Attempting to leave fullscreen - preventing...')
      // Check if window still exists before calling methods
      if (customerWindow && !customerWindow.isDestroyed()) {
        customerWindow.setKiosk(true)
        customerWindow.setFullScreen(true)
      }
    })

    const terminalId = process.env.TERMINAL_ID || `terminal-${Date.now()}`

    // Open customer display without businessId
    // It will show advertising/marketing content and wait for business selection via BroadcastChannel
    const displayUrl = `${SERVER_URL}/customer-display?terminalId=${terminalId}`
    console.log('Opening customer display (will show advertising until business selected):', displayUrl)

    customerWindow.loadURL(displayUrl)

    // Enable kiosk mode after window is ready (more reliable on Windows)
    customerWindow.webContents.on('did-finish-load', () => {
      console.log('[Customer Display] Page loaded, activating kiosk mode...')

      // Add a small delay to ensure window is fully ready
      setTimeout(() => {
        // Try multiple approaches for Windows compatibility
        customerWindow.setKiosk(true)
        customerWindow.setFullScreen(true)
        customerWindow.setMenuBarVisibility(false)
        console.log('✅ Customer display kiosk mode enabled (did-finish-load)')
      }, 500)
    })

    // Also try setting kiosk immediately (belt and suspenders approach)
    customerWindow.once('ready-to-show', () => {
      console.log('[Customer Display] Window ready, activating kiosk mode...')

      setTimeout(() => {
        customerWindow.setKiosk(true)
        customerWindow.setFullScreen(true)
        console.log('✅ Customer display kiosk mode set (ready-to-show)')
      }, 1000)
    })

    // Final attempt after window is shown
    customerWindow.once('show', () => {
      console.log('[Customer Display] Window shown, final kiosk activation...')

      setTimeout(() => {
        customerWindow.setKiosk(true)
        customerWindow.setFullScreen(true)
        customerWindow.focus()
        console.log('✅ Customer display kiosk mode set (show event)')
      }, 1500)
    })

    // Open DevTools for customer display in development mode
    if (process.env.NODE_ENV === 'development') {
      customerWindow.webContents.openDevTools()
      console.log('Customer display DevTools opened')
    }

    // Prevent customer window from closing
    customerWindow.on('close', (e) => {
      if (!app.isQuitting) {
        e.preventDefault()
        customerWindow.hide()
      }
    })

    console.log('✅ Customer display opened on secondary monitor')
    console.log('   - Will show advertising/marketing content')
    console.log('   - Will update automatically when business is selected')
  } else {
    console.log('⚠️  No secondary display detected - customer display will not open')
    console.log('   Connect a second monitor and restart to enable customer display')
  }

  // Handle main window close
  mainWindow.on('closed', () => {
    mainWindow = null
    if (customerWindow) {
      customerWindow.close()
      customerWindow = null
    }
  })

  // Open DevTools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  // Initialise scale service — auto-connects to saved COM port
  scaleService.init(mainWindow)
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────

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

// ─── App ready ────────────────────────────────────────────────────────────────

// App ready event
app.whenReady().then(() => {
  createWindows()

  // Handle display changes (monitor connected/disconnected)
  screen.on('display-added', (event, newDisplay) => {
    console.log('Display added:', newDisplay.id)
    // Optionally: Auto-create customer window on new display
  })

  screen.on('display-removed', (event, oldDisplay) => {
    console.log('Display removed:', oldDisplay.id)
    // Handle customer window if on removed display
  })

  // On macOS, re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindows()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Fallback: if app.quit() is called without the window close path running
// (e.g. programmatic quit, macOS ⌘Q), still ensure the COM port is released.
app.on('before-quit', (event) => {
  if (app.isQuitting) return  // window close path already handled it
  app.isQuitting = true
  event.preventDefault()
  console.log('[App] before-quit — releasing COM port…')
  scaleService.disconnectAsync().then(() => {
    app.quit()
  })
})
