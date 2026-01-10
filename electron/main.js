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

function createWindows() {
  // Get all displays
  const displays = screen.getAllDisplays()
  console.log(`Found ${displays.length} display(s)`)

  // Primary display (where POS runs)
  const primary = displays.find(d => d.bounds.x === 0 && d.bounds.y === 0) || displays[0]

  // Secondary display (for customer-facing screen)
  const secondary = displays.find(d => d.bounds.x !== 0 || d.bounds.y !== 0)

  // Create main POS window on primary display
  mainWindow = new BrowserWindow({
    x: primary.bounds.x,
    y: primary.bounds.y,
    width: primary.bounds.width,
    height: primary.bounds.height,
    title: 'POS System',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    fullscreen: false // Allow windowed mode for POS operator
  })

  // Load the POS page (Restaurant, Grocery, Hardware, or Clothing)
  // Default to restaurant, can be configured via environment variable
  const posType = process.env.POS_TYPE || 'restaurant'
  mainWindow.loadURL(`http://localhost:8080/${posType}/pos`)

  // Create customer display window on secondary monitor (if available)
  if (secondary) {
    console.log(`Secondary display detected at (${secondary.bounds.x}, ${secondary.bounds.y})`)

    customerWindow = new BrowserWindow({
      x: secondary.bounds.x,
      y: secondary.bounds.y,
      width: secondary.bounds.width,
      height: secondary.bounds.height,
      title: 'Customer Display',
      kiosk: true, // Fullscreen kiosk mode (hides browser chrome, prevents exit)
      frame: false, // No window frame
      autoHideMenuBar: true,
      alwaysOnTop: true, // Stay on top
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    // Get business and terminal IDs from main window or environment
    const businessId = process.env.BUSINESS_ID || 'default-business'
    const terminalId = process.env.TERMINAL_ID || `terminal-${Date.now()}`

    // Load customer display page
    customerWindow.loadURL(`http://localhost:8080/customer-display?businessId=${businessId}&terminalId=${terminalId}`)

    // Prevent customer window from closing
    customerWindow.on('close', (e) => {
      if (!app.isQuitting) {
        e.preventDefault()
        customerWindow.hide()
      }
    })

    console.log('Customer display opened on secondary monitor')
  } else {
    console.log('No secondary display detected - customer display will not open')
    console.log('Connect a second monitor and restart the application')
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

// Handle display changes (monitor connected/disconnected)
screen.on('display-added', (event, newDisplay) => {
  console.log('Display added:', newDisplay.id)
  // Optionally: Auto-create customer window on new display
})

screen.on('display-removed', (event, oldDisplay) => {
  console.log('Display removed:', oldDisplay.id)
  // Handle customer window if on removed display
})
