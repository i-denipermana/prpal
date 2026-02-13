/** Preload script for Electron renderer processes (CommonJS) */

const { contextBridge, ipcRenderer } = require('electron')

// Expose secure APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Onboarding
  finishOnboarding: (config) => {
    return ipcRenderer.invoke('onboarding:complete', config)
  },

  // Settings
  openSettings: () => {
    return ipcRenderer.invoke('app:openSettings')
  },

  // Window control
  closeWindow: () => {
    return ipcRenderer.invoke('window:close')
  },

  // App info
  getVersion: () => {
    return ipcRenderer.invoke('app:getVersion')
  },

  // PR Detail Window
  openPRDetail: (prId) => {
    return ipcRenderer.invoke('pr:openDetail', prId)
  },

  // Close window and show menubar
  closeAndShowMenubar: () => {
    return ipcRenderer.invoke('pr:closeAndShowMenubar')
  },

  // Open URL in external browser
  openExternal: (url) => {
    return ipcRenderer.invoke('shell:openExternal', url)
  },
})
