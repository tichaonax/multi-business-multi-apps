/**
 * Electron Preload Script
 *
 * Runs before web content loads, provides secure bridge between
 * main process and renderer process.
 */

const { contextBridge, ipcRenderer } = require('electron')

// Expose safe APIs to renderer process
contextBridge.exposeInMainWorld('electron', {
  // Check if running in Electron
  isElectron: true,

  // Get display information
  getDisplays: () => ipcRenderer.invoke('get-displays'),

  // Request to reopen customer display
  reopenCustomerDisplay: () => ipcRenderer.send('reopen-customer-display'),

  // Quit application
  quit: () => ipcRenderer.send('quit-app')
})
