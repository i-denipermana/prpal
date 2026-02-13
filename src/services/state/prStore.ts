/** PR state store - manages in-memory PR state */

import type { PullRequest, PRState, PRStatus } from '../../types/pr.js'
import { debug, info } from '../../utils/logger.js'

type PRStateMap = Map<string, PRState>
type ChangeListener = (prId: string, state: PRState) => void

let prStates: PRStateMap = new Map()
let listeners: ChangeListener[] = []
let userTeamSlugs: string[] = []

export function setUserTeams(teamSlugs: string[]): void {
  userTeamSlugs = teamSlugs
  info(`User teams set: ${teamSlugs.join(', ') || 'none'}`)
}

export function getUserTeams(): string[] {
  return userTeamSlugs
}

export function getPRState(prId: string): PRState | undefined {
  return prStates.get(prId)
}

export function getAllPRStates(): PRState[] {
  return Array.from(prStates.values())
}

export function getPRsByStatus(status: PRStatus): PRState[] {
  return getAllPRStates().filter((s) => s.status === status)
}

export function getNewPRs(): PRState[] {
  return getPRsByStatus('new')
}

export function getPendingReviewPRs(): PRState[] {
  const pending = getPRsByStatus('new')
  const seen = getPRsByStatus('seen')
  return [...pending, ...seen]
}

export function setPRState(prId: string, state: PRState): void {
  prStates.set(prId, state)
  notifyListeners(prId, state)
}

export function updatePRStatus(prId: string, status: PRStatus): void {
  const existing = prStates.get(prId)
  if (!existing) return

  const updated: PRState = { ...existing, status }

  if (status === 'seen' && !existing.seenAt) {
    updated.seenAt = new Date()
  }
  if (status === 'reviewing' && !existing.reviewStartedAt) {
    updated.reviewStartedAt = new Date()
  }
  if (status === 'reviewed' && !existing.reviewCompletedAt) {
    updated.reviewCompletedAt = new Date()
  }

  setPRState(prId, updated)
}

export function addPR(pr: PullRequest, needsMyReview = false): PRState {
  const existing = prStates.get(pr.id)
  if (existing) {
    return updateExistingPR(existing, pr, needsMyReview)
  }

  const state: PRState = { pr, status: 'new', needsMyReview }
  setPRState(pr.id, state)
  info(`New PR added: ${pr.id}`)
  return state
}

function updateExistingPR(existing: PRState, pr: PullRequest, needsMyReview?: boolean): PRState {
  const updated: PRState = { 
    ...existing, 
    pr,
    needsMyReview: needsMyReview ?? existing.needsMyReview 
  }
  setPRState(pr.id, updated)
  return updated
}

export function removePR(prId: string): boolean {
  const deleted = prStates.delete(prId)
  if (deleted) {
    debug(`PR removed: ${prId}`)
  }
  return deleted
}

export interface SyncPRsOptions {
  prs: PullRequest[]
  myReviewPRIds: Set<string>
}

export function syncPRs(options: SyncPRsOptions): { added: string[]; removed: string[] } {
  const { prs, myReviewPRIds } = options
  const newIds = new Set(prs.map((p) => p.id))
  const existingIds = new Set(prStates.keys())

  const added: string[] = []
  const removed: string[] = []

  // Add new PRs
  for (const pr of prs) {
    const needsMyReview = myReviewPRIds.has(pr.id)
    if (!existingIds.has(pr.id)) {
      addPR(pr, needsMyReview)
      added.push(pr.id)
    } else {
      // Update existing
      const existing = prStates.get(pr.id)!
      updateExistingPR(existing, pr, needsMyReview)
    }
  }

  // Remove closed PRs
  for (const id of existingIds) {
    if (!newIds.has(id)) {
      removePR(id)
      removed.push(id)
    }
  }

  return { added, removed }
}

export function getMyReviewPRs(): PRState[] {
  return getAllPRStates().filter((s) => s.needsMyReview)
}

export function getOtherPRs(): PRState[] {
  return getAllPRStates().filter((s) => !s.needsMyReview)
}

export function clearAllPRs(): void {
  prStates.clear()
  debug('All PRs cleared')
}

export function addChangeListener(listener: ChangeListener): () => void {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function notifyListeners(prId: string, state: PRState): void {
  for (const listener of listeners) {
    listener(prId, state)
  }
}

export function getPRCount(): number {
  return prStates.size
}

export function getNewPRCount(): number {
  return getNewPRs().length
}
