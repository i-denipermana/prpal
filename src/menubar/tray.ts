/** Tray icon management with badge support */

import { nativeImage, NativeImage, app } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

let trayIcon: NativeImage | null = null
let currentBadgeCount = 0

export function createTrayIcon(): string {
  const iconPath = getIconPath()
  console.log('[Tray] Icon path:', iconPath)
  console.log('[Tray] Icon exists:', existsSync(iconPath))
  trayIcon = nativeImage.createFromPath(iconPath)
  return iconPath
}

export function getIconPath(): string {
  const assetsDir = getAssetsDir()
  return join(assetsDir, 'iconTemplate.png')
}

function getAssetsDir(): string {
  // Try multiple locations to find the assets directory
  const possiblePaths = [
    // Development: relative to dist/menubar/
    join(__dirname, '../../assets'),
    // Development: relative to project root
    join(app.getAppPath(), 'assets'),
    // Production: in resources
    join(process.resourcesPath ?? '', 'assets'),
  ]

  for (const path of possiblePaths) {
    if (existsSync(join(path, 'iconTemplate.png'))) {
      console.log('[Tray] Found assets at:', path)
      return path
    }
  }

  // Fallback to first path
  console.log('[Tray] Assets not found, using fallback:', possiblePaths[0])
  return possiblePaths[0]!
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
