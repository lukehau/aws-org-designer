export interface ElectronAPI {
  platform: string
  getVersion: () => Promise<string>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
