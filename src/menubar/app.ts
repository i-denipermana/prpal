/** Electron menubar application */

import { app, BrowserWindow } from 'electron'
import { menubar, Menubar } from 'menubar'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { info } from '../utils/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
import { createTrayIcon, updateBadge } from './tray.js'
import { createContextMenu } from './menu.js'
import { addChangeListener, getNewPRCount } from '../services/state/prStore.js'
import { needsOnboarding } from '../services/state/onboardingStore.js'
import { showOnboardingWindow } from './onboarding.js'

let mb: Menubar | null = null

export function initMenubar(): void {
  app.whenReady().then(handleAppReady).catch(handleAppError)
  app.on('window-all-closed', preventQuit)
}

async function handleAppReady(): Promise<void> {
  // Show onboarding on first startup
  if (needsOnboarding()) {
    info('First startup detected, showing onboarding')
    await showOnboardingWindow()
    info('Onboarding completed, initializing menubar')
  }

  createMenubarApp()
}

function createMenubarApp(): void {
  const trayIcon = createTrayIcon()

  mb = menubar({
    index: getIndexUrl(),
    icon: trayIcon,
    preloadWindow: true,
    browserWindow: getBrowserWindowOptions(),
    showDockIcon: false,
  })

  mb.on('ready', onMenubarReady)
  mb.on('after-create-window', setupWindow)
}

function getIndexUrl(): string {
  const isDev = process.env['NODE_ENV'] === 'development'
  if (isDev) {
    return 'http://localhost:3847'
  }
  return `file://${join(__dirname, '../renderer/index.html')}`
}

function getBrowserWindowOptions(): Electron.BrowserWindowConstructorOptions {
  return {
    width: 400,
    height: 500,
    resizable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  }
}

function onMenubarReady(): void {
  info('Menubar ready')
  setupTrayMenu()
  setupPRListener()
  updateBadge(getNewPRCount())
}

function setupTrayMenu(): void {
  if (!mb?.tray) return

  const menu = createContextMenu({
    onShowWindow: () => mb?.showWindow(),
    onQuit: () => app.quit(),
    onRefresh: () => info('Manual refresh triggered'),
    onSettings: () => openSettingsWindow(),
  })

  mb.tray.on('right-click', () => {
    mb?.tray.popUpContextMenu(menu)
  })
}

function setupWindow(): void {
  if (!mb?.window) return

  mb.window.on('blur', () => {
    if (!mb?.window?.webContents.isDevToolsOpened()) {
      mb?.hideWindow()
    }
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
    height: 400,
    title: 'Settings',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  const settingsUrl = getSettingsUrl()
  void settingsWindow.loadURL(settingsUrl)
}

function getSettingsUrl(): string {
  const isDev = process.env['NODE_ENV'] === 'development'
  if (isDev) {
    return 'http://localhost:3847/settings'
  }
  return `file://${join(__dirname, '../renderer/settings.html')}`
}

function handleAppError(error: Error): void {
  console.error('Failed to initialize app:', error)
  app.quit()
}

function preventQuit(): void {
  // On macOS, keep app running even when all windows are closed
}

export function showWindow(): void {
  mb?.showWindow()
}

export function hideWindow(): void {
  mb?.hideWindow()
}

export function isWindowVisible(): boolean {
  return mb?.window?.isVisible() ?? false
}
