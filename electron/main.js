/**
 * Electron Main Process
 *
 * Automatically opens POS on primary monitor and customer display on secondary monitor
 * in fullscreen kiosk mode.
 */

const { app, BrowserWindow, screen } = require('electron')
const path = require('path')

let mainWindow = null
let customerWindow = null

// Get server URL from environment (supports both dev and production)
const SERVER_PORT = process.env.PORT || process.env.NEXT_PUBLIC_PORT || 8080
const SERVER_URL = `http://localhost:${SERVER_PORT}`

console.log(`Electron using server URL: ${SERVER_URL}`)

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
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    fullscreen: false // Allow windowed mode for POS operator
  })

  // Load the home/dashboard page - user will navigate to their desired POS
  // This allows flexibility to use any business type without restarting Electron
  mainWindow.loadURL(`${SERVER_URL}/`)

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
      fullscreen: true, // Start in fullscreen
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
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
      // Try multiple approaches for Windows compatibility
      customerWindow.setKiosk(true)
      customerWindow.setFullScreen(true)
      customerWindow.setMenuBarVisibility(false)
      console.log('✅ Customer display kiosk mode enabled')
    })

    // Also try setting kiosk immediately (belt and suspenders approach)
    customerWindow.once('ready-to-show', () => {
      customerWindow.setKiosk(true)
      customerWindow.setFullScreen(true)
      console.log('✅ Customer display kiosk mode set on ready-to-show')
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
}

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

// Set quitting flag when app is quitting
app.on('before-quit', () => {
  app.isQuitting = true
})
