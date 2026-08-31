const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('pickerAPI', {
  listServers: () => ipcRenderer.invoke('servers:list'),
  hasPin: () => ipcRenderer.invoke('servers:hasPin'),
  setPin: (pin) => ipcRenderer.invoke('servers:setPin', pin),
  verifyPin: (pin) => ipcRenderer.invoke('servers:verifyPin', pin),
  testConnection: (params) => ipcRenderer.invoke('servers:testConnection', params),
  addServer: (params) => ipcRenderer.invoke('servers:add', params),
  updateServer: (params) => ipcRenderer.invoke('servers:update', params),
  removeServer: (id, pin) => ipcRenderer.invoke('servers:remove', { id, pin }),
  switchTo: (id) => ipcRenderer.invoke('servers:switchTo', id),
  getOpenContext: () => ipcRenderer.invoke('servers:getOpenContext'),
  getActiveServer: () => ipcRenderer.invoke('servers:getActive'),
})
