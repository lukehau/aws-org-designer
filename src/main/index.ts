import { app, BrowserWindow, shell, Menu, ipcMain } from 'electron'
import path from 'path'

// Check for --debug flag
const isDebugMode = process.argv.includes('--debug')

// Logging helper (only logs when --debug flag is passed)
const log = (message: string, data?: unknown) => {
  if (!isDebugMode) return
  const timestamp = new Date().toISOString()
  if (data !== undefined) {
    console.log(`[Main ${timestamp}] ${message}`, data)
  } else {
    console.log(`[Main ${timestamp}] ${message}`)
  }
}

// Update check state
let isCheckingForUpdates = false
let mainWindow: BrowserWindow | null = null

// Forward declaration for createMenu
let createMenu: () => void

// GitHub releases API URL
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/lukehau/aws-org-designer/releases/latest'

// Compare version strings (returns true if remote is newer)
const isNewerVersion = (current: string, remote: string): boolean => {
  // Strip 'v' prefix if present
  const currentClean = current.replace(/^v/, '')
  const remoteClean = remote.replace(/^v/, '')
  
  const currentParts = currentClean.split('.').map(Number)
  const remoteParts = remoteClean.split('.').map(Number)
  
  for (let i = 0; i < Math.max(currentParts.length, remoteParts.length); i++) {
    const curr = currentParts[i] || 0
    const rem = remoteParts[i] || 0
    if (rem > curr) return true
    if (rem < curr) return false
  }
  return false
}

// Check for updates via GitHub releases API
const checkForUpdates = async (silent = false) => {
  if (!app.isPackaged) {
    log('Skipping update check in development mode')
    return
  }

  if (isCheckingForUpdates) {
    log('Update check already in progress')
    return
  }

  isCheckingForUpdates = true
  createMenu()

  const currentVersion = app.getVersion()
  log(`Current version: ${currentVersion}`)
  log('Checking for updates...')

  try {
    const response = await fetch(GITHUB_RELEASES_URL, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'AWS-Org-Designer'
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`)
    }

    const release = await response.json()
    const remoteVersion = release.tag_name
    const releaseUrl = release.html_url

    log(`Latest version: ${remoteVersion}`)

    if (isNewerVersion(currentVersion, remoteVersion)) {
      log('Update available')
      mainWindow?.webContents.send('update-result', {
        status: 'available',
        version: remoteVersion,
        releaseUrl
      })
    } else {
      log('Already up to date')
      // Only show "up to date" toast if manually triggered
      if (!silent) {
        mainWindow?.webContents.send('update-result', {
          status: 'up-to-date'
        })
      }
    }
  } catch (error) {
    log('Update check failed:', error)
    // Only show error toast if manually triggered
    if (!silent) {
      mainWindow?.webContents.send('update-result', {
        status: 'error'
      })
    }
  } finally {
    isCheckingForUpdates = false
    createMenu()
  }
}

// Single instance lock - prevent multiple instances of the app
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
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

  // IPC handlers
  ipcMain.on('check-for-updates', () => {
    checkForUpdates(false)
  })

  ipcMain.on('open-external', (_event, url: string) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
    }
  })

  ipcMain.handle('get-app-version', () => {
    return app.getVersion()
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

    const getUpdateMenuItem = (): Electron.MenuItemConstructorOptions => ({
      label: isCheckingForUpdates ? 'Checking for Updates...' : 'Check for Updates',
      enabled: !isCheckingForUpdates,
      click: () => checkForUpdates(false)
    })

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
      copyright: '© 2025 Luke Harris',
      website: 'https://github.com/lukehau/aws-org-designer'
    })

    createMenu()
    createWindow()

    // Check for updates after app settles (5 second delay, silent mode)
    setTimeout(() => {
      checkForUpdates(true)
    }, 5000)

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
