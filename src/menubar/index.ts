/** Menubar barrel export */

export { initMenubar, showWindow, hideWindow, isWindowVisible } from './app.js'
export { createTrayIcon, updateBadge, getBadgeCount, getIconPath } from './tray.js'
export { createContextMenu, type MenuActions } from './menu.js'
export { showOnboardingWindow, isOnboardingWindowOpen } from './onboarding.js'
