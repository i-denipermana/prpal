/** Tests for PR state store */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getPRState,
  getAllPRStates,
  getPRsByStatus,
  getNewPRs,
  addPR,
  updatePRStatus,
  removePR,
  syncPRs,
  clearAllPRs,
  addChangeListener,
  getPRCount,
  getNewPRCount,
} from '../../../services/state/prStore.js'
import type { PullRequest } from '../../../types/pr.js'

const createMockPR = (id: string, number: number): PullRequest => ({
  id,
  number,
  title: `Test PR #${number}`,
  body: 'Test body',
  author: { login: 'author', id: 1, avatar_url: '', html_url: '' },
  repository: { owner: 'owner', name: 'repo', fullName: 'owner/repo' },
  htmlUrl: `https://github.com/owner/repo/pull/${number}`,
  state: 'open',
  draft: false,
  head: { ref: 'feature', sha: 'abc123' },
  base: { ref: 'main', sha: 'def456' },
  requestedReviewers: [],
  requestedTeams: [],
  labels: [],
  stats: { additions: 10, deletions: 5, changedFiles: 2, comments: 0, reviewComments: 0 },
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('prStore', () => {
  beforeEach(() => {
    clearAllPRs()
  })

  describe('addPR', () => {
    it('should add a new PR with status "new"', () => {
      const pr = createMockPR('repo#1', 1)
      
      const state = addPR(pr)

      expect(state.status).toBe('new')
      expect(state.pr).toEqual(pr)
    })

    it('should update existing PR without changing status', () => {
      const pr = createMockPR('repo#1', 1)
      addPR(pr)
      updatePRStatus('repo#1', 'seen')

      const updatedPR = { ...pr, title: 'Updated Title' }
      const state = addPR(updatedPR)

      expect(state.status).toBe('seen')
      expect(state.pr.title).toBe('Updated Title')
    })
  })

  describe('getPRState', () => {
    it('should return undefined for unknown PR', () => {
      expect(getPRState('unknown')).toBeUndefined()
    })

    it('should return state for known PR', () => {
      const pr = createMockPR('repo#1', 1)
      addPR(pr)

      const state = getPRState('repo#1')

      expect(state).toBeDefined()
      expect(state?.pr.id).toBe('repo#1')
    })
  })

  describe('getAllPRStates', () => {
    it('should return empty array when no PRs', () => {
      expect(getAllPRStates()).toEqual([])
    })

    it('should return all PR states', () => {
      addPR(createMockPR('repo#1', 1))
      addPR(createMockPR('repo#2', 2))

      const states = getAllPRStates()

      expect(states).toHaveLength(2)
    })
  })

  describe('updatePRStatus', () => {
    it('should update status and set timestamp', () => {
      const pr = createMockPR('repo#1', 1)
      addPR(pr)

      updatePRStatus('repo#1', 'seen')

      const state = getPRState('repo#1')
      expect(state?.status).toBe('seen')
      expect(state?.seenAt).toBeDefined()
    })

    it('should do nothing for unknown PR', () => {
      updatePRStatus('unknown', 'seen')

      expect(getPRState('unknown')).toBeUndefined()
    })

    it('should set reviewStartedAt when status is reviewing', () => {
      addPR(createMockPR('repo#1', 1))

      updatePRStatus('repo#1', 'reviewing')

      expect(getPRState('repo#1')?.reviewStartedAt).toBeDefined()
    })

    it('should set reviewCompletedAt when status is reviewed', () => {
      addPR(createMockPR('repo#1', 1))

      updatePRStatus('repo#1', 'reviewed')

      expect(getPRState('repo#1')?.reviewCompletedAt).toBeDefined()
    })
  })

  describe('removePR', () => {
    it('should remove existing PR', () => {
      addPR(createMockPR('repo#1', 1))

      const result = removePR('repo#1')

      expect(result).toBe(true)
      expect(getPRState('repo#1')).toBeUndefined()
    })

    it('should return false for unknown PR', () => {
      const result = removePR('unknown')

      expect(result).toBe(false)
    })
  })

  describe('syncPRs', () => {
    it('should add new PRs', () => {
      const prs = [createMockPR('repo#1', 1), createMockPR('repo#2', 2)]

      const { added, removed } = syncPRs({ prs, myReviewPRIds: new Set(['repo#1']) })

      expect(added).toEqual(['repo#1', 'repo#2'])
      expect(removed).toEqual([])
      expect(getPRCount()).toBe(2)
    })

    it('should remove PRs not in list', () => {
      addPR(createMockPR('repo#1', 1))
      addPR(createMockPR('repo#2', 2))

      const { removed } = syncPRs({ prs: [createMockPR('repo#1', 1)], myReviewPRIds: new Set() })

      expect(removed).toEqual(['repo#2'])
      expect(getPRCount()).toBe(1)
    })

    it('should update existing PRs', () => {
      addPR(createMockPR('repo#1', 1))
      updatePRStatus('repo#1', 'seen')

      const updatedPR = { ...createMockPR('repo#1', 1), title: 'New Title' }
      syncPRs({ prs: [updatedPR], myReviewPRIds: new Set() })

      const state = getPRState('repo#1')
      expect(state?.pr.title).toBe('New Title')
      expect(state?.status).toBe('seen')
    })

    it('should track needsMyReview correctly', () => {
      const prs = [createMockPR('repo#1', 1), createMockPR('repo#2', 2)]
      syncPRs({ prs, myReviewPRIds: new Set(['repo#1']) })

      const state1 = getPRState('repo#1')
      const state2 = getPRState('repo#2')
      expect(state1?.needsMyReview).toBe(true)
      expect(state2?.needsMyReview).toBe(false)
    })
  })

  describe('getPRsByStatus', () => {
    it('should filter by status', () => {
      addPR(createMockPR('repo#1', 1))
      addPR(createMockPR('repo#2', 2))
      updatePRStatus('repo#2', 'seen')

      expect(getPRsByStatus('new')).toHaveLength(1)
      expect(getPRsByStatus('seen')).toHaveLength(1)
      expect(getPRsByStatus('reviewed')).toHaveLength(0)
    })
  })

  describe('getNewPRs', () => {
    it('should return only new PRs', () => {
      addPR(createMockPR('repo#1', 1))
      addPR(createMockPR('repo#2', 2))
      updatePRStatus('repo#2', 'seen')

      expect(getNewPRs()).toHaveLength(1)
      expect(getNewPRs()[0]?.pr.id).toBe('repo#1')
    })
  })

  describe('listeners', () => {
    it('should notify listeners on state change', () => {
      const listener = vi.fn()
      addChangeListener(listener)

      addPR(createMockPR('repo#1', 1))

      expect(listener).toHaveBeenCalledWith('repo#1', expect.any(Object))
    })

    it('should allow unsubscribing', () => {
      const listener = vi.fn()
      const unsubscribe = addChangeListener(listener)

      unsubscribe()
      addPR(createMockPR('repo#1', 1))

      expect(listener).not.toHaveBeenCalled()
    })
  })

  describe('counts', () => {
    it('should return correct PR count', () => {
      addPR(createMockPR('repo#1', 1))
      addPR(createMockPR('repo#2', 2))

      expect(getPRCount()).toBe(2)
    })

    it('should return correct new PR count', () => {
      addPR(createMockPR('repo#1', 1))
      addPR(createMockPR('repo#2', 2))
      updatePRStatus('repo#2', 'seen')

      expect(getNewPRCount()).toBe(1)
    })
  })
})
