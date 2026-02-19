/** Electron native notification service - uses app icon automatically */

import { Notification } from 'electron'
import type { PullRequest } from '../../types/pr.js'
import type { ReviewResult } from '../../types/review.js'
import { debug } from '../../utils/logger.js'

export interface NotificationOptions {
  sound: boolean
}

// Click handler callback
let clickCallback: (() => void) | null = null

function createNotification(
  title: string,
  body: string,
  _options: NotificationOptions
): Notification {
  // On macOS, don't set icon - the system automatically uses the app icon
  // Setting icon causes duplicate icons (app icon on left, custom on right)
  const notification = new Notification({
    title,
    body,
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
