/** Retry utility with exponential backoff */

import { warn } from './logger.js'

export interface RetryOptions {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
  shouldRetry?: (error: unknown) => boolean
}

const defaultOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function calculateDelay(attempt: number, options: RetryOptions): number {
  const delay = options.baseDelayMs * Math.pow(2, attempt)
  return Math.min(delay, options.maxDelayMs)
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let lastError: unknown = null

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      const shouldRetry = opts.shouldRetry?.(error) ?? true
      const hasMoreAttempts = attempt < opts.maxRetries

      if (!shouldRetry || !hasMoreAttempts) {
        throw error
      }

      const delay = calculateDelay(attempt, opts)
      warn(`Retry ${attempt + 1}/${opts.maxRetries} in ${delay}ms`, {
        error: String(error),
      })

      await sleep(delay)
    }
  }

  throw lastError
}

export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('timeout') ||
      msg.includes('network') ||
      msg.includes('econnrefused') ||
      msg.includes('econnreset')
    )
  }
  return false
}
