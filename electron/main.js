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
  mainWindow.loadURL(`http://localhost:8080/`)

  // Open customer display on secondary monitor after getting businessId
  mainWindow.webContents.on('did-finish-load', () => {
    // Wait a moment for localStorage to be available, then get businessId
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript(`
        (function() {
          // Try to get businessId from localStorage
          const businessId = localStorage.getItem('currentBusinessId')
          return businessId
        })()
      `).then(businessId => {
        // Create customer display window on secondary monitor (if available)
        if (secondary && !customerWindow) {
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

          const terminalId = process.env.TERMINAL_ID || `terminal-${Date.now()}`

          // Build URL with businessId if available
          let displayUrl = `http://localhost:8080/customer-display?terminalId=${terminalId}`
          if (businessId) {
            displayUrl += `&businessId=${businessId}`
            console.log('Customer display opening with businessId:', businessId)
          } else {
            console.log('No businessId in localStorage - customer display will wait for business selection')
          }

          customerWindow.loadURL(displayUrl)

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

          console.log('Customer display opened on secondary monitor')
        } else if (!secondary) {
          console.log('No secondary display detected - customer display will not open')
          console.log('Connect a second monitor and restart the application')
        }
      }).catch(err => {
        console.error('Error getting businessId from localStorage:', err)
      })
    }, 1000) // Wait 1 second for localStorage to be available
  })

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
