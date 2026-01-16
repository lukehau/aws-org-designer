// Preload script - runs before renderer process
// Exposes Electron APIs to the renderer via contextBridge

import { contextBridge, ipcRenderer } from 'electron'

// Update result type
interface UpdateResult {
  status: 'available' | 'up-to-date' | 'error'
  version?: string
  releaseUrl?: string
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  
  // Trigger update check
  checkForUpdates: () => {
    ipcRenderer.send('check-for-updates')
  },
  
  // Listen for update results
  onUpdateResult: (callback: (result: UpdateResult) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, result: UpdateResult) => {
      callback(result)
    }
    ipcRenderer.on('update-result', handler)
    
    // Return cleanup function
    return () => {
      ipcRenderer.removeListener('update-result', handler)
    }
  },
  
  // Open URL in system browser
  openExternal: (url: string) => {
    ipcRenderer.send('open-external', url)
  },
  
  // Get current app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
})
