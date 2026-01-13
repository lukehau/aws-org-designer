// Preload script - runs before renderer process
// This is where you would expose Electron APIs to the renderer if needed

import { contextBridge } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Add any APIs you want to expose to the renderer here
  // For now, we don't need any desktop-specific features
  platform: process.platform,
});
