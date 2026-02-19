/** Tests for time utilities */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatRelativeTime,
  formatShortDate,
  formatDuration,
  sleep,
  parseISODate,
  isOlderThan,
  isNewerThan,
} from '../../utils/time.js'

describe('time utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('formatRelativeTime', () => {
    it('returns "just now" for times less than 60 seconds ago', () => {
      const date = new Date('2024-06-15T11:59:30Z')
      expect(formatRelativeTime(date)).toBe('just now')
    })

    it('returns minutes ago for times less than 60 minutes', () => {
      const date = new Date('2024-06-15T11:30:00Z')
      expect(formatRelativeTime(date)).toBe('30m ago')
    })

    it('returns hours ago for times less than 24 hours', () => {
      const date = new Date('2024-06-15T06:00:00Z')
      expect(formatRelativeTime(date)).toBe('6h ago')
    })

    it('returns days ago for times less than 7 days', () => {
      const date = new Date('2024-06-12T12:00:00Z')
      expect(formatRelativeTime(date)).toBe('3d ago')
    })

    it('returns formatted date for times 7+ days ago', () => {
      const date = new Date('2024-06-01T12:00:00Z')
      const result = formatRelativeTime(date)
      expect(result).toContain('Jun')
    })
  })

  describe('formatShortDate', () => {
    it('formats date as short month and day', () => {
      const date = new Date('2024-06-15T12:00:00Z')
      const result = formatShortDate(date)
      expect(result).toContain('Jun')
      expect(result).toContain('15')
    })

    it('handles different months', () => {
      const date = new Date('2024-01-05T12:00:00Z')
      const result = formatShortDate(date)
      expect(result).toContain('Jan')
      expect(result).toContain('5')
    })
  })

  describe('formatDuration', () => {
    it('returns milliseconds for durations under 1 second', () => {
      expect(formatDuration(500)).toBe('500ms')
      expect(formatDuration(999)).toBe('999ms')
    })

    it('returns seconds for durations under 1 minute', () => {
      expect(formatDuration(1000)).toBe('1s')
      expect(formatDuration(45000)).toBe('45s')
    })

    it('returns minutes and seconds for longer durations', () => {
      expect(formatDuration(60000)).toBe('1m 0s')
      expect(formatDuration(90000)).toBe('1m 30s')
      expect(formatDuration(125000)).toBe('2m 5s')
    })
  })

  describe('sleep', () => {
    it('resolves after specified milliseconds', async () => {
      const promise = sleep(1000)
      vi.advanceTimersByTime(1000)
      await expect(promise).resolves.toBeUndefined()
    })

    it('does not resolve before specified time', async () => {
      let resolved = false
      sleep(1000).then(() => {
        resolved = true
      })

      vi.advanceTimersByTime(500)
      await Promise.resolve()
      expect(resolved).toBe(false)

      vi.advanceTimersByTime(500)
      await Promise.resolve()
      expect(resolved).toBe(true)
    })
  })

  describe('parseISODate', () => {
    it('parses ISO date strings', () => {
      const result = parseISODate('2024-06-15T12:00:00Z')
      expect(result).toBeInstanceOf(Date)
      expect(result.toISOString()).toBe('2024-06-15T12:00:00.000Z')
    })

    it('handles date-only strings', () => {
      const result = parseISODate('2024-06-15')
      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('isOlderThan', () => {
    it('returns true when date is older than specified duration', () => {
      const oldDate = new Date('2024-06-15T10:00:00Z') // 2 hours ago
      expect(isOlderThan(oldDate, 60 * 60 * 1000)).toBe(true) // older than 1 hour
    })

    it('returns false when date is newer than specified duration', () => {
      const recentDate = new Date('2024-06-15T11:30:00Z') // 30 mins ago
      expect(isOlderThan(recentDate, 60 * 60 * 1000)).toBe(false) // not older than 1 hour
    })
  })

  describe('isNewerThan', () => {
    it('returns true when date is newer than specified duration', () => {
      const recentDate = new Date('2024-06-15T11:30:00Z') // 30 mins ago
      expect(isNewerThan(recentDate, 60 * 60 * 1000)).toBe(true) // newer than 1 hour
    })

    it('returns false when date is older than specified duration', () => {
      const oldDate = new Date('2024-06-15T10:00:00Z') // 2 hours ago
      expect(isNewerThan(oldDate, 60 * 60 * 1000)).toBe(false) // not newer than 1 hour
    })
  })
})
