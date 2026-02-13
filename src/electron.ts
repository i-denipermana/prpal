/** Electron entry point - runs both server and menubar */

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { info, error as logError, setLogLevel } from './utils/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { tryLoadConfig, hasValidConfig } from './config/env.js'
import { needsOnboarding, resetOnboarding } from './services/state/onboardingStore.js'
import { initAgentStore } from './services/state/agentStore.js'
import { initSkillsAndMemories } from './services/opencode/skills.js'
import {
  createServer,
  startServer,
  setGitHubClient,
  setReviewClient,
  setPollContext,
} from './server/index.js'
import { createGitHubClient } from './services/github/client.js'
import { detectUserTeams } from './services/github/teamDetector.js'
import { startPolling, stopPolling } from './services/polling/index.js'
import {
  notifyNewPR,
  notifyMultiplePRs,
  onNotificationClick,
} from './services/notification/electron.js'
import { showOnboardingWindow } from './menubar/onboarding.js'
import { createTrayIcon, updateBadge } from './menubar/tray.js'
import { createContextMenu } from './menubar/menu.js'
import { addChangeListener, getNewPRCount } from './services/state/prStore.js'
import { menubar, type Menubar } from 'menubar'
import type { ResolvedConfig } from './types/config.js'

let mb: Menubar | null = null
let server: Awaited<ReturnType<typeof createServer>> | null = null
let openDetailWindows = new Set<BrowserWindow>()

async function main(): Promise<void> {
  info('Starting PRPal (Electron)...')

  // Start server first (needed for API calls during onboarding)
  const serverConfig = { port: 3847, host: '127.0.0.1' }
  server = await createServer(serverConfig)
  await startServer(server, serverConfig)

  // Wait for Electron to be ready
  await app.whenReady()

  // Hide dock icon initially (macOS only) - run as accessory app
  if (process.platform === 'darwin') {
    app.setActivationPolicy('accessory')
    app.dock.hide()
  }

  // Check if onboarding is needed
  if (needsOnboarding() || !hasValidConfig()) {
    info('First startup - showing onboarding')
    await showOnboardingWindow()
  }

  // Now we should have valid config
  const config = tryLoadConfig()
  if (!config) {
    logError('No valid configuration after onboarding')
    app.quit()
    return
  }

  // Initialize with config
  await initializeApp(config)

  // Create menubar
  createMenubarApp(config)

  // Setup notification click handler
  onNotificationClick(() => {
    info('Notification clicked - showing window')
    mb?.showWindow()
  })

  info('PRPal is running')
}

async function initializeApp(config: ResolvedConfig): Promise<void> {
  setLogLevel(config.logLevel)
  initAgentStore()
  initSkillsAndMemories(config.opencode.skillsFolder, config.opencode.memoriesFolder)

  const client = createGitHubClient({ token: config.github.pat })
  setGitHubClient(client)
  setReviewClient(client)

  try {
    const userTeams = await detectUserTeams(client, config.github.org)
    info(`Detected ${userTeams.teams.length} teams for user`)

    // Set poll context for manual refresh API
    setPollContext(config.github.org, config.github.username, userTeams)

    // Start polling
    const notificationOpts = { sound: config.notification.sound }
    startPolling(
      client,
      config.github.org,
      config.github.username,
      userTeams,
      config.polling.intervalMs,
      (newPRs) => {
        if (newPRs.length === 0) return
        if (newPRs.length === 1) {
          notifyNewPR(newPRs[0]!, notificationOpts)
        } else {
          notifyMultiplePRs(newPRs.length, notificationOpts)
        }
      }
    )
  } catch (error) {
    logError('Failed to initialize GitHub connection', {
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

function createMenubarApp(config: ResolvedConfig): void {
  const trayIcon = createTrayIcon()

  mb = menubar({
    index: getIndexUrl(),
    icon: trayIcon,
    preloadWindow: true,
    browserWindow: {
      width: 400,
      height: 500,
      resizable: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    },
    showDockIcon: false,
  })

  mb.on('ready', () => {
    info('Menubar ready')
    setupTrayMenu(config)
    setupPRListener()
    updateBadge(getNewPRCount())
  })

  mb.on('after-create-window', () => {
    if (!mb?.window) return
    mb.window.on('blur', () => {
      // Check if window still exists and is not destroyed before hiding
      if (mb?.window && !mb.window.isDestroyed() && !mb.window.webContents.isDevToolsOpened()) {
        mb.hideWindow()
      }
    })
  })
}

function getIndexUrl(): string {
  return 'http://localhost:3847/index.html'
}

function setupTrayMenu(_config: ResolvedConfig): void {
  if (!mb?.tray) return

  const menu = createContextMenu({
    onShowWindow: () => mb?.showWindow(),
    onQuit: () => {
      stopPolling()
      server?.close()
      app.quit()
    },
    onRefresh: () => info('Manual refresh triggered'),
    onSettings: () => openSettingsWindow(),
    onRerunSetup: () => rerunSetup(),
  })

  mb.tray.on('right-click', () => {
    mb?.tray.popUpContextMenu(menu)
  })
}

function setupPRListener(): void {
  addChangeListener(() => {
    updateBadge(getNewPRCount())
  })
}

function openSettingsWindow(): void {
  const settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    title: 'Settings',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Track for dock visibility
  openDetailWindows.add(settingsWindow)
  void updateDockVisibility()

  settingsWindow.on('closed', () => {
    openDetailWindows.delete(settingsWindow)
    void updateDockVisibility()
  })

  void settingsWindow.loadURL('http://localhost:3847/settings.html')
}

async function rerunSetup(): Promise<void> {
  info('Re-running setup wizard')
  resetOnboarding()
  stopPolling()
  await showOnboardingWindow()

  const config = tryLoadConfig()
  if (config) {
    await initializeApp(config)
  }
}

// IPC Handlers
ipcMain.handle('pr:openDetail', (_event, prId: string) => {
  openPRDetailWindow(prId)
})

ipcMain.handle('pr:closeAndShowMenubar', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.close()
  mb?.showWindow()
})

ipcMain.handle('shell:openExternal', (_event, url: string) => {
  void shell.openExternal(url)
})

function openPRDetailWindow(prId: string): void {
  const detailWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    title: 'PR Details',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: getPreloadPath(),
    },
  })

  // Track open windows for dock icon visibility
  openDetailWindows.add(detailWindow)
  void updateDockVisibility()

  detailWindow.on('closed', () => {
    openDetailWindows.delete(detailWindow)
    void updateDockVisibility()
  })

  // Open external links in default browser
  detailWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Intercept navigation to external URLs
  detailWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost:3847')) {
      event.preventDefault()
      void shell.openExternal(url)
    }
  })

  const url = `http://localhost:3847/pr-detail.html?id=${encodeURIComponent(prId)}`
  void detailWindow.loadURL(url)

  info(`Opened PR detail window for ${prId}`)
}

async function updateDockVisibility(): Promise<void> {
  // Only applicable on macOS
  if (process.platform !== 'darwin') return

  if (openDetailWindows.size > 0) {
    // Show in dock and Cmd+Tab switcher when detail windows are open
    info(`[Dock] Showing dock icon (${openDetailWindows.size} windows open)`)
    // Use setActivationPolicy to make app appear in Cmd+Tab
    // 'regular' = normal app (appears in dock and switcher)
    // 'accessory' = background app (no dock, no switcher)
    app.setActivationPolicy('regular')
    await app.dock.show()
  } else {
    // Hide from dock when no detail windows
    info('[Dock] Hiding dock icon (no detail windows)')
    app.setActivationPolicy('accessory')
    app.dock.hide()
  }
}

function getPreloadPath(): string {
  return join(__dirname, 'menubar/preload.cjs')
}

// Handle app lifecycle
app.on('window-all-closed', () => {
  // Keep running on macOS
})

app.on('before-quit', () => {
  stopPolling()
  server?.close()
})

// Start the app
main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  logError('Failed to start application', { error: message })
  app.quit()
})
