/** macOS native notification service */

import notifier from 'node-notifier'
import type { PullRequest } from '../../types/pr.js'
import type { ReviewResult } from '../../types/review.js'
import { debug } from '../../utils/logger.js'

export interface NotificationOptions {
  sound: boolean
}

export function notifyNewPR(pr: PullRequest, options: NotificationOptions): void {
  debug(`Notifying new PR: ${pr.id}`)

  notifier.notify({
    title: `PR Review Requested`,
    message: `#${pr.number}: ${pr.title}\nby ${pr.author.login}`,
    sound: options.sound,
    wait: true,
    timeout: 10,
  })
}

export function notifyMultiplePRs(count: number, options: NotificationOptions): void {
  debug(`Notifying ${count} new PRs`)

  notifier.notify({
    title: `${count} PRs Need Review`,
    message: `You have ${count} pull requests waiting for your review`,
    sound: options.sound,
    wait: true,
    timeout: 10,
  })
}

export function notifyReviewComplete(
  pr: PullRequest,
  result: ReviewResult,
  options: NotificationOptions
): void {
  debug(`Notifying review complete: ${pr.id}`)

  const verdictEmoji = getVerdictEmoji(result.output.verdict)
  const issueCount = result.output.issues.length

  notifier.notify({
    title: `Review Complete ${verdictEmoji}`,
    message: `PR #${pr.number}: ${pr.title}\n${issueCount} issue(s) found`,
    sound: options.sound,
    wait: true,
    timeout: 10,
  })
}

export function notifyReviewError(
  pr: PullRequest,
  errorMessage: string,
  _options: NotificationOptions
): void {
  debug(`Notifying review error: ${pr.id}`)

  notifier.notify({
    title: `Review Failed`,
    message: `PR #${pr.number}: ${errorMessage}`,
    sound: false,
    wait: false,
    timeout: 5,
  })
}

function getVerdictEmoji(verdict: ReviewResult['output']['verdict']): string {
  const map = { approve: '✅', request_changes: '⚠️', comment: '💬' }
  return map[verdict]
}

export function onNotificationClick(callback: () => void): void {
  notifier.on('click', callback)
}
