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

  switchServer: () => ipcRenderer.invoke('servers:showPicker'),

  getActiveServer: () => ipcRenderer.invoke('servers:getActive'),

  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Clears this window's session HTTP cache and force-reloads bypassing it --
  // fixes the server-bundle-went-stale-in-Electron's-own-cache problem (see
  // main.js), independent of the Electron shell's own installer version.
  clearCacheAndReload: () => ipcRenderer.invoke('app:clearCacheAndReload'),

  // ── Device-level default business ─────────────────────────────────────────
  getDefaultBusiness: () => ipcRenderer.invoke('business:getDefault'),

  setDefaultBusiness: (pin, businessId, businessLabel) =>
    ipcRenderer.invoke('business:setDefault', { pin, businessId, businessLabel }),

  hasPin: () => ipcRenderer.invoke('pin:has'),

  setPin: (pin) => ipcRenderer.invoke('pin:set', pin),

  // ── Device-level theme preference (survives app restarts; see main.js) ──
  getTheme: () => ipcRenderer.invoke('theme:get'),

  setTheme: (theme) => ipcRenderer.invoke('theme:set', theme),

  // ── Device-level page-size preference (survives app restarts; see main.js) ──
  getPageSize: (userId) => ipcRenderer.invoke('pageSize:get', userId),

  setPageSize: (userId, size) => ipcRenderer.invoke('pageSize:set', { userId, size }),

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
