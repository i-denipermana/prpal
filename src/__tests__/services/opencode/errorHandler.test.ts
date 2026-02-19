/** Tests for OpenCode error handler */

import { describe, it, expect } from 'vitest'
import {
  parseOpenCodeError,
  createTimeoutError,
  createNotInstalledError,
  getErrorAction,
} from '../../../services/opencode/errorHandler.js'
import { OpenCodeErrorType } from '../../../types/errors.js'

describe('OpenCode error handler', () => {
  describe('parseOpenCodeError', () => {
    it('detects API key errors', () => {
      const error = parseOpenCodeError(1, '', 'Error: API key not found')
      expect(error.errorType).toBe(OpenCodeErrorType.API_KEY_MISSING)
      expect(error.message).toContain('API key')
    })

    it('detects unauthorized errors as API key errors', () => {
      const error = parseOpenCodeError(1, '', 'Unauthorized: invalid credentials')
      expect(error.errorType).toBe(OpenCodeErrorType.API_KEY_MISSING)
    })

    it('detects 401 errors as API key errors', () => {
      const error = parseOpenCodeError(1, '', 'HTTP 401 response')
      expect(error.errorType).toBe(OpenCodeErrorType.API_KEY_MISSING)
    })

    it('detects rate limit errors', () => {
      const error = parseOpenCodeError(1, '', 'Rate limit exceeded')
      expect(error.errorType).toBe(OpenCodeErrorType.RATE_LIMITED)
      expect(error.message).toContain('rate limit')
    })

    it('detects 429 errors as rate limit', () => {
      const error = parseOpenCodeError(1, '', 'HTTP 429 Too Many Requests')
      expect(error.errorType).toBe(OpenCodeErrorType.RATE_LIMITED)
    })

    it('detects too many requests as rate limit', () => {
      const error = parseOpenCodeError(1, '', 'too many requests')
      expect(error.errorType).toBe(OpenCodeErrorType.RATE_LIMITED)
    })

    it('detects model not found errors', () => {
      const error = parseOpenCodeError(1, '', 'Model not found: gpt-5-turbo')
      expect(error.errorType).toBe(OpenCodeErrorType.MODEL_NOT_FOUND)
      expect(error.message).toContain('model')
    })

    it('detects invalid model errors', () => {
      const error = parseOpenCodeError(1, '', 'Invalid model specified')
      expect(error.errorType).toBe(OpenCodeErrorType.MODEL_NOT_FOUND)
    })

    it('detects context too long errors', () => {
      const error = parseOpenCodeError(1, '', 'Context length exceeded')
      expect(error.errorType).toBe(OpenCodeErrorType.CONTEXT_TOO_LONG)
      expect(error.message).toContain('large')
    })

    it('detects token limit errors as context errors', () => {
      const error = parseOpenCodeError(1, '', 'Token limit exceeded')
      expect(error.errorType).toBe(OpenCodeErrorType.CONTEXT_TOO_LONG)
    })

    it('detects too long errors as context errors', () => {
      const error = parseOpenCodeError(1, '', 'Input too long')
      expect(error.errorType).toBe(OpenCodeErrorType.CONTEXT_TOO_LONG)
    })

    it('detects network errors', () => {
      const error = parseOpenCodeError(1, '', 'Network error occurred')
      expect(error.errorType).toBe(OpenCodeErrorType.NETWORK_ERROR)
      expect(error.message).toContain('Network')
    })

    it('detects ECONNREFUSED as network error', () => {
      const error = parseOpenCodeError(1, '', 'connect ECONNREFUSED')
      expect(error.errorType).toBe(OpenCodeErrorType.NETWORK_ERROR)
    })

    it('detects ECONNRESET as network error', () => {
      const error = parseOpenCodeError(1, '', 'socket hang up ECONNRESET')
      expect(error.errorType).toBe(OpenCodeErrorType.NETWORK_ERROR)
    })

    it('detects timeout as network error', () => {
      const error = parseOpenCodeError(1, '', 'Request timeout')
      expect(error.errorType).toBe(OpenCodeErrorType.NETWORK_ERROR)
    })

    it('returns unknown error for unrecognized errors', () => {
      const error = parseOpenCodeError(42, 'Some output', 'Unknown failure')
      expect(error.errorType).toBe(OpenCodeErrorType.UNKNOWN)
      expect(error.message).toContain('42')
    })

    it('truncates long error details', () => {
      const longError = 'a'.repeat(1000)
      const error = parseOpenCodeError(1, '', longError)
      expect(error.details?.length ?? 0).toBeLessThanOrEqual(500)
    })

    it('checks both stdout and stderr', () => {
      const error = parseOpenCodeError(1, 'API key missing', '')
      expect(error.errorType).toBe(OpenCodeErrorType.API_KEY_MISSING)
    })

    it('is case insensitive', () => {
      const error = parseOpenCodeError(1, '', 'API KEY NOT CONFIGURED')
      expect(error.errorType).toBe(OpenCodeErrorType.API_KEY_MISSING)
    })
  })

  describe('createTimeoutError', () => {
    it('creates timeout error with correct type', () => {
      const error = createTimeoutError(300000)
      expect(error.errorType).toBe(OpenCodeErrorType.TIMEOUT)
      expect(error.message).toContain('timed out')
    })

    it('includes duration in minutes', () => {
      const error = createTimeoutError(300000) // 5 minutes
      expect(error.details).toContain('5 minute')
    })

    it('handles singular minute', () => {
      const error = createTimeoutError(60000) // 1 minute
      expect(error.details).not.toContain('minutes')
    })

    it('includes retry action', () => {
      const error = createTimeoutError(300000)
      expect(error.action).toBeDefined()
      expect(error.action?.actionType).toBe('retry')
    })
  })

  describe('createNotInstalledError', () => {
    it('creates not installed error with correct type', () => {
      const error = createNotInstalledError()
      expect(error.errorType).toBe(OpenCodeErrorType.NOT_INSTALLED)
      expect(error.message).toContain('not installed')
    })

    it('includes installation instructions', () => {
      const error = createNotInstalledError()
      expect(error.details).toContain('curl')
    })

    it('includes open URL action', () => {
      const error = createNotInstalledError()
      expect(error.action).toBeDefined()
      expect(error.action?.actionType).toBe('open_url')
      expect(error.action?.payload).toContain('opencode.ai')
    })
  })

  describe('getErrorAction', () => {
    it('returns action from error', () => {
      const error = createTimeoutError(300000)
      const action = getErrorAction(error)
      expect(action).toBeDefined()
      expect(action?.label).toBe('Retry')
    })

    it('returns undefined for errors without action', () => {
      const error = parseOpenCodeError(1, '', 'Unknown error')
      const action = getErrorAction(error)
      expect(action).toBeUndefined()
    })
  })

  describe('error actions', () => {
    it('API key error has open settings action', () => {
      const error = parseOpenCodeError(1, '', 'API key missing')
      expect(error.action?.actionType).toBe('open_settings')
    })

    it('rate limit error has retry action', () => {
      const error = parseOpenCodeError(1, '', 'Rate limit exceeded')
      expect(error.action?.actionType).toBe('retry')
    })

    it('model error has open settings action', () => {
      const error = parseOpenCodeError(1, '', 'Model not found')
      expect(error.action?.actionType).toBe('open_settings')
    })

    it('context error has retry action', () => {
      const error = parseOpenCodeError(1, '', 'Context too long')
      expect(error.action?.actionType).toBe('retry')
    })

    it('network error has retry action', () => {
      const error = parseOpenCodeError(1, '', 'Network error')
      expect(error.action?.actionType).toBe('retry')
    })
  })
})
