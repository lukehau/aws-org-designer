export interface UpdateResult {
  status: 'available' | 'up-to-date' | 'error'
  version?: string
  releaseUrl?: string
}

export interface ElectronAPI {
  platform: string
  checkForUpdates: () => void
  onUpdateResult: (callback: (result: UpdateResult) => void) => () => void
  openExternal: (url: string) => void
  getAppVersion: () => Promise<string>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
