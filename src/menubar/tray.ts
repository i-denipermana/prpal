/** Tray icon management with badge support */

import { nativeImage, NativeImage } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

let trayIcon: NativeImage | null = null
let currentBadgeCount = 0

export function createTrayIcon(): string {
  const iconPath = getIconPath()
  trayIcon = nativeImage.createFromPath(iconPath)
  return iconPath
}

export function getIconPath(): string {
  const assetsDir = getAssetsDir()
  return join(assetsDir, 'iconTemplate.png')
}

function getAssetsDir(): string {
  const isDev = process.env['NODE_ENV'] === 'development'
  if (isDev) {
    return join(__dirname, '../../assets')
  }
  return join(process.resourcesPath ?? '', 'assets')
}

export function updateBadge(count: number): void {
  currentBadgeCount = count
  // Badge display handled by the tray title on macOS
}

export function getBadgeCount(): number {
  return currentBadgeCount
}

export function getTrayIcon(): NativeImage | null {
  return trayIcon
}

export function createBadgeIcon(count: number): NativeImage | null {
  if (!trayIcon) return null
  if (count === 0) return trayIcon

  // For now, return the base icon
  // Badge rendering would require canvas or native module
  return trayIcon
}
