/** Onboarding window management */

import { BrowserWindow, ipcMain } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { markOnboardingComplete } from '../services/state/onboardingStore.js'
import { info } from '../utils/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

let onboardingWindow: BrowserWindow | null = null

export function showOnboardingWindow(): Promise<void> {
  return new Promise((resolve) => {
    if (onboardingWindow) {
      onboardingWindow.focus()
      return
    }

    onboardingWindow = createOnboardingWindow()

    onboardingWindow.on('closed', () => {
      onboardingWindow = null
      resolve()
    })

    setupIpcHandlers(resolve)
  })
}

function createOnboardingWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 600,
    height: 700,
    title: 'Welcome to PRPal',
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: getPreloadPath(),
    },
  })

  const url = getOnboardingUrl()
  void window.loadURL(url)

  info('Onboarding window opened')

  return window
}

function getOnboardingUrl(): string {
  const isDev = process.env['NODE_ENV'] === 'development'
  if (isDev) {
    return 'http://localhost:3847/onboarding.html'
  }
  return `file://${join(__dirname, '../renderer/onboarding.html')}`
}

function getPreloadPath(): string {
  return join(__dirname, 'preload.cjs')
}

function setupIpcHandlers(onComplete: () => void): void {
  ipcMain.handleOnce('onboarding:complete', async (_event, config) => {
    info('Onboarding completed via IPC')

    // Save config if provided
    if (config) {
      await saveInitialConfig(config)
    }

    markOnboardingComplete()

    if (onboardingWindow) {
      onboardingWindow.close()
    }

    onComplete()
    return { success: true }
  })
}

interface InitialConfig {
  pat: string
  username: string
  org: string
}

async function saveInitialConfig(config: InitialConfig): Promise<void> {
  const { updateGitHubSettings } = await import('../services/state/settingsStore.js')

  updateGitHubSettings(config.pat, config.username, config.org)

  info('Initial config saved from onboarding')
}

export function isOnboardingWindowOpen(): boolean {
  return onboardingWindow !== null
}

export function closeOnboardingWindow(): void {
  if (onboardingWindow) {
    onboardingWindow.close()
    onboardingWindow = null
  }
}
