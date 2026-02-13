/** Context menu for the tray icon */

import { Menu, MenuItem } from 'electron'
import { getAllPRStates } from '../services/state/prStore.js'
import { isPolling, getLastPollTime } from '../services/polling/index.js'
import { formatRelativeTime } from '../utils/time.js'

export interface MenuActions {
  onShowWindow: () => void
  onQuit: () => void
  onRefresh: () => void
  onSettings: () => void
  onRerunSetup?: () => void
}

export function createContextMenu(actions: MenuActions): Menu {
  const menu = new Menu()

  addPRItems(menu, actions.onShowWindow)
  menu.append(new MenuItem({ type: 'separator' }))
  addStatusItem(menu)
  menu.append(new MenuItem({ type: 'separator' }))
  addActionItems(menu, actions)

  return menu
}

function addPRItems(menu: Menu, onShow: () => void): void {
  const states = getAllPRStates()
  const pendingPRs = states.filter((s) => s.status === 'new' || s.status === 'seen')

  if (pendingPRs.length === 0) {
    menu.append(new MenuItem({
      label: 'No PRs pending review',
      enabled: false,
    }))
    return
  }

  pendingPRs.slice(0, 5).forEach((state) => {
    const label = `#${state.pr.number}: ${truncate(state.pr.title, 30)}`
    menu.append(new MenuItem({
      label,
      click: onShow,
    }))
  })

  if (pendingPRs.length > 5) {
    menu.append(new MenuItem({
      label: `... and ${pendingPRs.length - 5} more`,
      click: onShow,
    }))
  }
}

function addStatusItem(menu: Menu): void {
  const lastPoll = getLastPollTime()
  const status = isPolling() ? 'Active' : 'Paused'
  const lastUpdate = lastPoll ? formatRelativeTime(lastPoll) : 'Never'

  menu.append(new MenuItem({
    label: `Status: ${status} (Last: ${lastUpdate})`,
    enabled: false,
  }))
}

function addActionItems(menu: Menu, actions: MenuActions): void {
  menu.append(new MenuItem({
    label: 'Refresh Now',
    click: actions.onRefresh,
  }))

  menu.append(new MenuItem({
    label: 'Settings...',
    click: actions.onSettings,
  }))

  if (actions.onRerunSetup) {
    menu.append(new MenuItem({
      label: 'Re-run Setup...',
      click: actions.onRerunSetup,
    }))
  }

  menu.append(new MenuItem({ type: 'separator' }))

  menu.append(new MenuItem({
    label: 'Quit',
    click: actions.onQuit,
    accelerator: 'Command+Q',
  }))
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
