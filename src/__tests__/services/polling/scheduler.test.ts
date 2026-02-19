/** Tests for polling scheduler */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  startPolling,
  stopPolling,
  isPolling,
  getLastPollTime,
  getPollCount,
  resetSchedulerState,
  type PollCallback,
} from '../../../services/polling/scheduler.js'
import type { GitHubClient } from '../../../services/github/client.js'
import type { UserTeams } from '../../../services/github/teamDetector.js'

// Mock dependencies
vi.mock('../../../services/github/prFetcher.js', () => ({
  fetchAllOrgPRs: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../services/github/reviewFilter.js', () => ({
  filterPRsForReview: vi.fn().mockReturnValue([]),
}))

vi.mock('../../../services/state/prStore.js', () => ({
  syncPRs: vi.fn().mockReturnValue({ added: [], removed: [] }),
  getNewPRs: vi.fn().mockReturnValue([]),
  setUserTeams: vi.fn(),
}))

vi.mock('../../../utils/logger.js', () => ({
  info: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
}))

import { fetchAllOrgPRs } from '../../../services/github/prFetcher.js'
import { filterPRsForReview } from '../../../services/github/reviewFilter.js'
import { syncPRs, getNewPRs } from '../../../services/state/prStore.js'

describe('polling scheduler', () => {
  let mockClient: GitHubClient
  let mockUserTeams: UserTeams
  let mockCallback: PollCallback

  beforeEach(() => {
    vi.useFakeTimers()
    resetSchedulerState()

    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      getRateLimit: vi.fn(),
    } as unknown as GitHubClient

    mockUserTeams = {
      teams: [],
      teamSlugs: ['team-a', 'team-b'],
    }

    mockCallback = vi.fn() as unknown as PollCallback

    vi.mocked(fetchAllOrgPRs).mockResolvedValue([])
    vi.mocked(filterPRsForReview).mockReturnValue([])
    vi.mocked(syncPRs).mockReturnValue({ added: [], removed: [] })
    vi.mocked(getNewPRs).mockReturnValue([])
  })

  afterEach(() => {
    resetSchedulerState()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('startPolling', () => {
    it('starts polling and runs immediately', async () => {
      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 60000, mockCallback)

      await vi.advanceTimersByTimeAsync(0)

      expect(isPolling()).toBe(true)
      expect(fetchAllOrgPRs).toHaveBeenCalledTimes(1)
      expect(mockCallback).toHaveBeenCalledTimes(1)
    })

    it('polls at specified interval', async () => {
      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 30000, mockCallback)

      await vi.advanceTimersByTimeAsync(0)
      expect(fetchAllOrgPRs).toHaveBeenCalledTimes(1)

      await vi.advanceTimersByTimeAsync(30000)
      expect(fetchAllOrgPRs).toHaveBeenCalledTimes(2)

      await vi.advanceTimersByTimeAsync(30000)
      expect(fetchAllOrgPRs).toHaveBeenCalledTimes(3)
    })

    it('does not start if already running', async () => {
      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 60000, mockCallback)
      await vi.advanceTimersByTimeAsync(0)

      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 60000, mockCallback)
      await vi.advanceTimersByTimeAsync(0)

      // Should only have polled once (first start)
      expect(fetchAllOrgPRs).toHaveBeenCalledTimes(1)
    })

    it('updates poll count after each poll', async () => {
      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 10000, mockCallback)

      await vi.advanceTimersByTimeAsync(0)
      expect(getPollCount()).toBe(1)

      await vi.advanceTimersByTimeAsync(10000)
      expect(getPollCount()).toBe(2)

      await vi.advanceTimersByTimeAsync(10000)
      expect(getPollCount()).toBe(3)
    })

    it('updates last poll time', async () => {
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))

      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 60000, mockCallback)
      await vi.advanceTimersByTimeAsync(0)

      const lastPollTime = getLastPollTime()
      expect(lastPollTime).toBeInstanceOf(Date)
      expect(lastPollTime?.toISOString()).toBe('2024-06-15T12:00:00.000Z')
    })
  })

  describe('stopPolling', () => {
    it('stops polling', async () => {
      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 10000, mockCallback)
      await vi.advanceTimersByTimeAsync(0)

      stopPolling()

      expect(isPolling()).toBe(false)

      // Should not poll after stop
      await vi.advanceTimersByTimeAsync(10000)
      expect(fetchAllOrgPRs).toHaveBeenCalledTimes(1)
    })
  })

  describe('isPolling', () => {
    it('returns false initially', () => {
      expect(isPolling()).toBe(false)
    })

    it('returns true when polling', async () => {
      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 60000, mockCallback)
      await vi.advanceTimersByTimeAsync(0)

      expect(isPolling()).toBe(true)
    })

    it('returns false after stop', async () => {
      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 60000, mockCallback)
      await vi.advanceTimersByTimeAsync(0)
      stopPolling()

      expect(isPolling()).toBe(false)
    })
  })

  describe('getLastPollTime', () => {
    it('returns null initially', () => {
      expect(getLastPollTime()).toBeNull()
    })
  })

  describe('getPollCount', () => {
    it('returns 0 initially', () => {
      expect(getPollCount()).toBe(0)
    })
  })

  describe('resetSchedulerState', () => {
    it('resets all state', async () => {
      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 10000, mockCallback)
      await vi.advanceTimersByTimeAsync(0)

      resetSchedulerState()

      expect(isPolling()).toBe(false)
      expect(getLastPollTime()).toBeNull()
      expect(getPollCount()).toBe(0)
    })
  })

  describe('error handling', () => {
    it('continues polling after fetch error', async () => {
      vi.mocked(fetchAllOrgPRs)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValue([])

      startPolling(mockClient, 'test-org', 'testuser', mockUserTeams, 10000, mockCallback)

      await vi.advanceTimersByTimeAsync(0)
      expect(fetchAllOrgPRs).toHaveBeenCalledTimes(1)
      expect(isPolling()).toBe(true)

      await vi.advanceTimersByTimeAsync(10000)
      expect(fetchAllOrgPRs).toHaveBeenCalledTimes(2)
    })
  })
})
