/** Tests for retry utilities */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry, isRetryableError } from '../../utils/retry.js'

// Mock logger to prevent console output during tests
vi.mock('../../utils/logger.js', () => ({
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

describe('retry utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('withRetry', () => {
    it('returns result on first successful attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success')

      const result = await withRetry(fn)

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries on failure and succeeds', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockResolvedValue('success')

      const promise = withRetry(fn, { baseDelayMs: 100, maxDelayMs: 1000 })

      // First failure
      await vi.advanceTimersByTimeAsync(0)
      // Wait for first retry delay
      await vi.advanceTimersByTimeAsync(100)
      // Wait for second retry delay (exponential: 200ms)
      await vi.advanceTimersByTimeAsync(200)

      const result = await promise

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(3)
    })

    it('throws after max retries exceeded', async () => {
      const error = new Error('persistent failure')
      const fn = vi.fn().mockRejectedValue(error)

      // Run with real timers for this test to avoid unhandled rejection warnings
      vi.useRealTimers()

      await expect(
        withRetry(fn, { maxRetries: 2, baseDelayMs: 10, maxDelayMs: 100 })
      ).rejects.toThrow('persistent failure')

      expect(fn).toHaveBeenCalledTimes(3) // initial + 2 retries

      // Restore fake timers for other tests
      vi.useFakeTimers()
    })

    it('respects shouldRetry callback', async () => {
      const nonRetryableError = new Error('do not retry')
      const fn = vi.fn().mockRejectedValue(nonRetryableError)

      const shouldRetry = vi.fn().mockReturnValue(false)

      await expect(withRetry(fn, { maxRetries: 3, shouldRetry })).rejects.toThrow('do not retry')

      expect(fn).toHaveBeenCalledTimes(1)
      expect(shouldRetry).toHaveBeenCalledWith(nonRetryableError)
    })

    it('uses exponential backoff', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail 1'))
        .mockRejectedValueOnce(new Error('fail 2'))
        .mockRejectedValueOnce(new Error('fail 3'))
        .mockResolvedValue('success')

      const promise = withRetry(fn, {
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
      })

      // Initial call fails immediately
      await vi.advanceTimersByTimeAsync(0)

      // First retry after 1000ms (1000 * 2^0)
      await vi.advanceTimersByTimeAsync(1000)

      // Second retry after 2000ms (1000 * 2^1)
      await vi.advanceTimersByTimeAsync(2000)

      // Third retry after 4000ms (1000 * 2^2)
      await vi.advanceTimersByTimeAsync(4000)

      const result = await promise
      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(4)
    })

    it('caps delay at maxDelayMs', async () => {
      const fn = vi.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('success')

      const promise = withRetry(fn, {
        baseDelayMs: 10000,
        maxDelayMs: 5000,
      })

      await vi.advanceTimersByTimeAsync(0)
      // Should cap at 5000ms instead of 10000ms
      await vi.advanceTimersByTimeAsync(5000)

      const result = await promise
      expect(result).toBe('success')
    })
  })

  describe('isRetryableError', () => {
    it('returns true for timeout errors', () => {
      expect(isRetryableError(new Error('Request timeout'))).toBe(true)
      expect(isRetryableError(new Error('TIMEOUT exceeded'))).toBe(true)
    })

    it('returns true for network errors', () => {
      expect(isRetryableError(new Error('Network error occurred'))).toBe(true)
      expect(isRetryableError(new Error('NETWORK_FAILED'))).toBe(true)
    })

    it('returns true for connection refused errors', () => {
      expect(isRetryableError(new Error('ECONNREFUSED'))).toBe(true)
      expect(isRetryableError(new Error('connect ECONNREFUSED'))).toBe(true)
    })

    it('returns true for connection reset errors', () => {
      expect(isRetryableError(new Error('ECONNRESET'))).toBe(true)
      expect(isRetryableError(new Error('socket hang up ECONNRESET'))).toBe(true)
    })

    it('returns false for non-retryable errors', () => {
      expect(isRetryableError(new Error('Not found'))).toBe(false)
      expect(isRetryableError(new Error('Invalid input'))).toBe(false)
      expect(isRetryableError(new Error('Unauthorized'))).toBe(false)
    })

    it('returns false for non-Error objects', () => {
      expect(isRetryableError('string error')).toBe(false)
      expect(isRetryableError(null)).toBe(false)
      expect(isRetryableError(undefined)).toBe(false)
      expect(isRetryableError({ message: 'timeout' })).toBe(false)
    })
  })
})
