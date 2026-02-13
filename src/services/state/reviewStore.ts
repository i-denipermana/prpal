/** Review store - caches review results */

import type { ReviewResult, ReviewState, ReviewStage, InlineCommentState } from '../../types/review.js'
import { debug } from '../../utils/logger.js'

type ReviewStateMap = Map<string, ReviewState>

let reviewStates: ReviewStateMap = new Map()

const STAGE_PROGRESS: Record<ReviewStage, number> = {
  starting: 10,
  fetching_diff: 25,
  analyzing: 50,
  generating: 75,
  parsing: 90,
}

export function getReviewState(prId: string): ReviewState | undefined {
  return reviewStates.get(prId)
}

export function getReviewResult(prId: string): ReviewResult | undefined {
  return reviewStates.get(prId)?.result
}

export function setReviewPending(prId: string): void {
  reviewStates.set(prId, {
    prId,
    status: 'pending',
  })
  debug(`Review pending for PR: ${prId}`)
}

export function setReviewInProgress(prId: string, stage?: ReviewStage): void {
  const existing = reviewStates.get(prId)
  reviewStates.set(prId, {
    ...existing,
    prId,
    status: 'in_progress',
    stage: stage ?? 'starting',
    progress: stage ? STAGE_PROGRESS[stage] : 10,
    startedAt: existing?.startedAt ?? new Date(),
  })
  debug(`Review in progress for PR: ${prId}`, { stage })
}

export function updateReviewStage(prId: string, stage: ReviewStage): void {
  const existing = reviewStates.get(prId)
  if (!existing || existing.status !== 'in_progress') return
  
  reviewStates.set(prId, {
    ...existing,
    stage,
    progress: STAGE_PROGRESS[stage],
  })
  debug(`Review stage updated for PR: ${prId}`, { stage })
}

export function setReviewCompleted(prId: string, result: ReviewResult): void {
  const existing = reviewStates.get(prId)
  const duration = existing?.startedAt 
    ? Date.now() - existing.startedAt.getTime() 
    : 0
  
  reviewStates.set(prId, {
    prId,
    status: 'completed',
    progress: 100,
    result,
    completedAt: new Date(),
  })
  debug(`Review completed for PR: ${prId}`, { durationMs: duration })
}

export function setReviewFailed(prId: string, error: string): void {
  const existing = reviewStates.get(prId)
  reviewStates.set(prId, {
    ...existing,
    prId,
    status: 'failed',
    error,
    completedAt: new Date(),
  })
  debug(`Review failed for PR: ${prId}`, { error })
}

export function setReviewCancelled(prId: string): boolean {
  const existing = reviewStates.get(prId)
  if (!existing || existing.status !== 'in_progress') return false
  
  reviewStates.set(prId, {
    ...existing,
    prId,
    status: 'cancelled',
    completedAt: new Date(),
  })
  debug(`Review cancelled for PR: ${prId}`)
  return true
}

export function clearReview(prId: string): boolean {
  return reviewStates.delete(prId)
}

export function clearAllReviews(): void {
  reviewStates.clear()
}

export function getAllReviewStates(): ReviewState[] {
  return Array.from(reviewStates.values())
}

export function getPendingReviews(): ReviewState[] {
  return getAllReviewStates().filter((s) => s.status === 'pending')
}

export function getCompletedReviews(): ReviewState[] {
  return getAllReviewStates().filter((s) => s.status === 'completed')
}

export function hasReview(prId: string): boolean {
  return reviewStates.has(prId)
}

export function isReviewInProgress(prId: string): boolean {
  return reviewStates.get(prId)?.status === 'in_progress'
}

export function setInlineComments(prId: string, comments: InlineCommentState[]): void {
  const existing = reviewStates.get(prId)
  if (!existing) return

  reviewStates.set(prId, { ...existing, inlineComments: comments })
  debug(`Inline comments set for PR: ${prId}`, { count: comments.length })
}

export function getInlineComments(prId: string): InlineCommentState[] {
  return reviewStates.get(prId)?.inlineComments ?? []
}
