/**
 * Electron Preload Script
 *
 * Runs before web content loads, provides secure bridge between
 * main process and renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron')

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electron', {
  isElectron: true,

  getDisplays: () => ipcRenderer.invoke('get-displays'),

  reopenCustomerDisplay: () => ipcRenderer.send('reopen-customer-display'),

  quit: () => ipcRenderer.send('quit-app'),

  // ── Scale API ──────────────────────────────────────────────────────────────
  scale: {
    listPorts: () => ipcRenderer.invoke('scale:list-ports'),

    getSavedPort: () => ipcRenderer.invoke('scale:get-saved-port'),

    getSavedBaud: () => ipcRenderer.invoke('scale:get-saved-baud'),

    connect: (comPort, baudRate) => ipcRenderer.invoke('scale:connect', comPort, baudRate),

    disconnect: () => ipcRenderer.invoke('scale:disconnect'),

    tare: () => ipcRenderer.invoke('scale:tare'),

    detectBaud: (comPort) => ipcRenderer.invoke('scale:detect-baud', comPort),

    // Subscribe to live weight updates; returns cleanup function
    onWeight: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('scale:weight', handler)
      return () => ipcRenderer.removeListener('scale:weight', handler)
    },

    // Subscribe to connection status changes; returns cleanup function
    onStatus: (callback) => {
      const handler = (_event, data) => callback(data)
      ipcRenderer.on('scale:status', handler)
      return () => ipcRenderer.removeListener('scale:status', handler)
    },
  },
})
