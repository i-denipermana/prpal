/** Polling scheduler - manages periodic PR fetching */

import type { PullRequest } from '../../types/pr.js'
import type { GitHubClient } from '../github/client.js'
import type { UserTeams } from '../github/teamDetector.js'
import { fetchAllOrgPRs } from '../github/prFetcher.js'
import { filterPRsForReview } from '../github/reviewFilter.js'
import { syncPRs, getNewPRs, setUserTeams, type SyncPRsOptions } from '../state/prStore.js'
import { info, warn, debug } from '../../utils/logger.js'

export type PollCallback = (newPRs: PullRequest[], allPRs: PullRequest[]) => void

interface SchedulerState {
  intervalId: NodeJS.Timeout | null
  isRunning: boolean
  lastPollTime: Date | null
  pollCount: number
}

let state: SchedulerState = {
  intervalId: null,
  isRunning: false,
  lastPollTime: null,
  pollCount: 0,
}

let pollCallback: PollCallback | null = null

export function startPolling(
  client: GitHubClient,
  org: string,
  username: string,
  userTeams: UserTeams,
  intervalMs: number,
  callback: PollCallback
): void {
  if (state.isRunning) {
    warn('Polling already running')
    return
  }

  pollCallback = callback
  state.isRunning = true
  
  // Store user teams for PR route access
  setUserTeams(userTeams.teamSlugs)

  info(`Starting polling every ${intervalMs / 1000}s`)

  // Run immediately
  void runPoll(client, org, username, userTeams)

  // Schedule recurring polls
  state.intervalId = setInterval(() => {
    void runPoll(client, org, username, userTeams)
  }, intervalMs)
}

export function stopPolling(): void {
  if (state.intervalId) {
    clearInterval(state.intervalId)
    state.intervalId = null
  }
  state.isRunning = false
  info('Polling stopped')
}

export function isPolling(): boolean {
  return state.isRunning
}

export function getLastPollTime(): Date | null {
  return state.lastPollTime
}

export function getPollCount(): number {
  return state.pollCount
}

export async function pollNow(
  client: GitHubClient,
  org: string,
  username: string,
  userTeams: UserTeams
): Promise<PullRequest[]> {
  return runPoll(client, org, username, userTeams)
}

async function runPoll(
  client: GitHubClient,
  org: string,
  username: string,
  userTeams: UserTeams
): Promise<PullRequest[]> {
  debug('Running poll')

  try {
    const allPRs = await fetchAllOrgPRs(client, { org })
    
    // Get all non-draft PRs from others
    const allOthersPRs = filterPRsForReview(allPRs, { username, userTeams, showAllPRs: true })
    
    // Get PRs specifically requesting my review
    const myReviewPRs = filterPRsForReview(allPRs, { username, userTeams, showAllPRs: false })
    const myReviewPRIds = new Set(myReviewPRs.map(pr => pr.id))

    const syncOptions: SyncPRsOptions = { prs: allOthersPRs, myReviewPRIds }
    const { added } = syncPRs(syncOptions)
    const newPRs = getNewPRs().map((s) => s.pr)

    state.lastPollTime = new Date()
    state.pollCount++

    if (added.length > 0) {
      info(`Found ${added.length} new PR(s), ${myReviewPRs.length} need my review`)
    }

    pollCallback?.(newPRs, allOthersPRs)

    return allOthersPRs
  } catch (error) {
    warn('Poll failed', { error: String(error) })
    return []
  }
}

export function resetSchedulerState(): void {
  stopPolling()
  state = {
    intervalId: null,
    isRunning: false,
    lastPollTime: null,
    pollCount: 0,
  }
  pollCallback = null
}
