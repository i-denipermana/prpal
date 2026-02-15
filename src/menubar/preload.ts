/** Preload script for Electron renderer processes */

import { contextBridge, ipcRenderer } from 'electron'

// Expose secure APIs to the renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Onboarding
  finishOnboarding: (config?: { pat: string; username: string; org: string }) => {
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

  // App control
  quitApp: () => {
    return ipcRenderer.invoke('app:quit')
  },

  // App info
  getVersion: () => {
    return ipcRenderer.invoke('app:getVersion')
  },
})

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
      finishOnboarding: (config?: {
        pat: string
        username: string
        org: string
      }) => Promise<{ success: boolean }>
      openSettings: () => Promise<void>
      closeWindow: () => Promise<void>
      quitApp: () => Promise<void>
      getVersion: () => Promise<string>
    }
  }
}
