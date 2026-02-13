/** Electron native notification service - uses app icon automatically */

import { Notification, nativeImage, app } from 'electron'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import type { PullRequest } from '../../types/pr.js'
import type { ReviewResult } from '../../types/review.js'
import { debug } from '../../utils/logger.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface NotificationOptions {
  sound: boolean
}

// Click handler callback
let clickCallback: (() => void) | null = null

// Get the app icon path
function getIconPath(): string {
  const possiblePaths = [
    join(app.getAppPath(), 'assets', 'icon-512.png'),
    join(process.resourcesPath ?? '', 'assets', 'icon-512.png'),
    join(__dirname, '../../../assets/icon-512.png'),
  ]

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p
    }
  }

  return possiblePaths[0]!
}

function createNotification(
  title: string,
  body: string,
  _options: NotificationOptions
): Notification {
  const iconPath = getIconPath()
  const icon = nativeImage.createFromPath(iconPath)

  const notification = new Notification({
    title,
    body,
    icon,
    silent: !_options.sound,
  })

  notification.on('click', () => {
    if (clickCallback) {
      clickCallback()
    }
  })

  return notification
}

export function notifyNewPR(pr: PullRequest, options: NotificationOptions): void {
  debug(`Notifying new PR: ${pr.id}`)

  const notification = createNotification(
    'PR Review Requested',
    `#${pr.number}: ${pr.title}\nby ${pr.author.login}`,
    options
  )
  notification.show()
}

export function notifyMultiplePRs(count: number, options: NotificationOptions): void {
  debug(`Notifying ${count} new PRs`)

  const notification = createNotification(
    `${count} PRs Need Review`,
    `You have ${count} pull requests waiting for your review`,
    options
  )
  notification.show()
}

export function notifyReviewComplete(
  pr: PullRequest,
  result: ReviewResult,
  options: NotificationOptions
): void {
  debug(`Notifying review complete: ${pr.id}`)

  const verdictEmoji = getVerdictEmoji(result.output.verdict)
  const issueCount = result.output.issues.length

  const notification = createNotification(
    `Review Complete ${verdictEmoji}`,
    `PR #${pr.number}: ${pr.title}\n${issueCount} issue(s) found`,
    options
  )
  notification.show()
}

export function notifyReviewError(
  pr: PullRequest,
  errorMessage: string,
  options: NotificationOptions
): void {
  debug(`Notifying review error: ${pr.id}`)

  const notification = createNotification('Review Failed', `PR #${pr.number}: ${errorMessage}`, {
    ...options,
    sound: false,
  })
  notification.show()
}

function getVerdictEmoji(verdict: ReviewResult['output']['verdict']): string {
  const map = { approve: '✅', request_changes: '⚠️', comment: '💬' }
  return map[verdict]
}

export function onNotificationClick(callback: () => void): void {
  clickCallback = callback
}
