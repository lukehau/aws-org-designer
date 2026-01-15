import { app, BrowserWindow, shell, Menu, dialog } from 'electron'
import updater from 'electron-updater'
import path from 'path'

// Disable auto-download - we'll control the flow manually
updater.autoUpdater.autoDownload = false
updater.autoUpdater.autoInstallOnAppQuit = false

// Update state for menu
type UpdateState = 'idle' | 'checking' | 'downloading' | 'up-to-date' | 'ready' | 'error'
let updateState: UpdateState = 'idle'
let updateResetTimeout: NodeJS.Timeout | null = null

// Helper to set update state with optional auto-reset
const setUpdateState = (state: UpdateState, autoReset = false) => {
  if (updateResetTimeout) {
    clearTimeout(updateResetTimeout)
    updateResetTimeout = null
  }
  updateState = state
  if (autoReset) {
    updateResetTimeout = setTimeout(() => {
      updateState = 'idle'
      createMenu()
    }, 60000)
  }
}

// Forward declaration for createMenu (defined inside gotTheLock block)
let createMenu: () => void

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
        preload: path.join(__dirname, '../preload/index.cjs'),
        nodeIntegration: false,
        contextIsolation: true,
      },
    })

    // Maximize window on launch
    mainWindow.maximize()

    // Handle external links - open in system browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url)
      }
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

    setUpdateState('checking')
    createMenu()

    try {
      console.log('Checking for updates...')
      await updater.autoUpdater.checkForUpdates()
    } catch (error) {
      console.error('Error checking for updates:', error)
      setUpdateState('error', true)
      createMenu()
    }
  }

  // Auto-updater event handlers
  updater.autoUpdater.on('update-available', (info) => {
    console.log(`Update available: ${info.version}`)
    setUpdateState('downloading')
    createMenu()
    updater.autoUpdater.downloadUpdate()
  })

  updater.autoUpdater.on('update-not-available', () => {
    console.log('No updates available')
    setUpdateState('up-to-date', true)
    createMenu()
  })

  updater.autoUpdater.on('download-progress', (progress) => {
    console.log(`Download progress: ${progress.percent.toFixed(1)}%`)
  })

  updater.autoUpdater.on('update-downloaded', (info) => {
    console.log(`Update downloaded: ${info.version}`)
    setUpdateState('ready')
    createMenu()
    
    // Prompt user to install
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'The update will be installed when you restart the app.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1
    }).then(({ response }) => {
      if (response === 0) {
        updater.autoUpdater.quitAndInstall(false, true)
      }
    })
  })

  updater.autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error)
    setUpdateState('error', true)
    createMenu()
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

  // Build application menu
  createMenu = () => {
    const isMac = process.platform === 'darwin'

    // Build update menu item based on state
    const getUpdateMenuItem = (): Electron.MenuItemConstructorOptions => {
      switch (updateState) {
        case 'checking':
          return { label: 'Checking for Updates...', enabled: false }
        case 'downloading':
          return { label: 'Downloading Update...', enabled: false }
        case 'up-to-date':
          return { label: "You're up to date!", enabled: false }
        case 'ready':
          return { 
            label: 'Restart to Update', 
            click: () => updater.autoUpdater.quitAndInstall(false, true)
          }
        case 'error':
          return { label: 'Unavailable', enabled: false }
        default:
          return { label: 'Check for Updates', click: checkForUpdates }
      }
    }

    const template: Electron.MenuItemConstructorOptions[] = [
      // App menu (macOS only)
      ...(isMac
        ? [{
            label: app.name,
            submenu: [
              { role: 'about' as const },
              { type: 'separator' as const },
              getUpdateMenuItem(),
              { type: 'separator' as const },
              { role: 'services' as const },
              { type: 'separator' as const },
              { role: 'hide' as const },
              { role: 'hideOthers' as const },
              { role: 'unhide' as const },
              { type: 'separator' as const },
              { role: 'quit' as const }
            ]
          }]
        : []),
      // File menu
      {
        label: 'File',
        submenu: [
          isMac ? { role: 'close' as const } : { role: 'quit' as const }
        ]
      },
      // Edit menu
      { role: 'editMenu' as const },
      // View menu
      { role: 'viewMenu' as const },
      // Window menu
      { role: 'windowMenu' as const },
      // Help menu
      {
        role: 'help' as const,
        submenu: [
          ...(!isMac
            ? [
                { label: 'About', click: () => app.showAboutPanel() },
                getUpdateMenuItem(),
                { type: 'separator' as const }
              ]
            : []),
          {
            label: 'Learn More',
            click: () => shell.openExternal('https://github.com/lukehau/aws-org-designer')
          }
        ]
      }
    ]

    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu)
  }

  // App ready
  app.whenReady().then(() => {
    // Set about panel info (used by both macOS native and Windows custom dialog)
    app.setAboutPanelOptions({
      applicationName: 'AWS Org Designer',
      applicationVersion: app.getVersion(),
      copyright: '© 2025 Luke Hau',
      website: 'https://github.com/lukehau/aws-org-designer'
    })

    createMenu()
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
