import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'path'

// Disable auto-download - we'll control the flow manually
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

// Single instance lock - prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  let mainWindow: BrowserWindow | null = null

  const createWindow = () => {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, '../preload/index.js'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Maximize window on launch
    mainWindow.maximize()

    // Prevent new windows from being created (block window.open)
    mainWindow.webContents.setWindowOpenHandler(() => {
      return { action: 'deny' }
    })

    // Load the app
    if (process.env.ELECTRON_RENDERER_URL) {
      mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      // In production, load from the renderer output directory
      mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
    }

    // Handle window close to prevent data loss
    mainWindow.on('closed', () => {
      mainWindow = null
    })

    // Open DevTools in development
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools()
    }
  }

  // Check for updates on launch (only in packaged app)
  const checkForUpdates = async () => {
    if (!app.isPackaged) {
      console.log('Skipping update check in development mode')
      return
    }

    try {
      console.log('Checking for updates...')
      const result = await autoUpdater.checkForUpdates()
      
      if (result?.updateInfo) {
        console.log(`Update available: ${result.updateInfo.version}`)
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
    }
  }

  // Auto-updater event handlers
  autoUpdater.on('update-available', (info) => {
    console.log(`Update available: ${info.version}`)
    // Start downloading immediately
    autoUpdater.downloadUpdate()
  })

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available')
  })

  autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent.toFixed(1)}%`)
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`Update downloaded: ${info.version}`)
    // Install immediately and restart
    autoUpdater.quitAndInstall(false, true)
  })

  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error)
  })

  // Someone tried to run a second instance, focus our window instead
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })

  // App ready
  app.whenReady().then(() => {
    createWindow()

    // Check for updates after window is created
    checkForUpdates()

    // On macOS, re-create window when dock icon is clicked and no windows are open
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  // Quit when all windows are closed
  app.on('window-all-closed', () => {
    app.quit()
  })
}
