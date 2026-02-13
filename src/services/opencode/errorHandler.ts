/** OpenCode error classification and handling */

import { OpenCodeErrorType, OpenCodeCLIError, type ErrorAction } from '../../types/errors.js'

export function parseOpenCodeError(
  exitCode: number,
  stdout: string,
  stderr: string
): OpenCodeCLIError {
  const combined = `${stdout}\n${stderr}`.toLowerCase()

  if (isApiKeyError(combined)) {
    return createApiKeyError()
  }

  if (isRateLimitError(combined)) {
    return createRateLimitError()
  }

  if (isModelError(combined)) {
    return createModelError(stderr)
  }

  if (isContextError(combined)) {
    return createContextError()
  }

  if (isNetworkError(combined)) {
    return createNetworkError()
  }

  return createUnknownError(exitCode, stderr || stdout)
}

function isApiKeyError(text: string): boolean {
  return text.includes('api key') || text.includes('unauthorized') || text.includes('401')
}

function isRateLimitError(text: string): boolean {
  return text.includes('rate limit') || text.includes('429') || text.includes('too many')
}

function isModelError(text: string): boolean {
  return text.includes('model') && (text.includes('not found') || text.includes('invalid'))
}

function isContextError(text: string): boolean {
  return text.includes('context') || text.includes('too long') || text.includes('token limit')
}

function isNetworkError(text: string): boolean {
  return (
    text.includes('network') ||
    text.includes('econnrefused') ||
    text.includes('econnreset') ||
    text.includes('timeout')
  )
}

function createApiKeyError(): OpenCodeCLIError {
  return new OpenCodeCLIError(
    OpenCodeErrorType.API_KEY_MISSING,
    'OpenCode API key not configured',
    'Please add your API key. Run: opencode auth login',
    { label: 'Open Settings', actionType: 'open_settings' }
  )
}

function createRateLimitError(): OpenCodeCLIError {
  return new OpenCodeCLIError(
    OpenCodeErrorType.RATE_LIMITED,
    'API rate limit exceeded',
    'Will retry automatically in 60 seconds',
    { label: 'Retry Now', actionType: 'retry' }
  )
}

function createModelError(stderr: string): OpenCodeCLIError {
  return new OpenCodeCLIError(
    OpenCodeErrorType.MODEL_NOT_FOUND,
    'Selected model not available',
    stderr,
    { label: 'Change Model', actionType: 'open_settings' }
  )
}

function createContextError(): OpenCodeCLIError {
  return new OpenCodeCLIError(
    OpenCodeErrorType.CONTEXT_TOO_LONG,
    'PR diff too large for model context',
    'Try reviewing with a smaller diff',
    { label: 'Review Partial', actionType: 'retry' }
  )
}

function createNetworkError(): OpenCodeCLIError {
  return new OpenCodeCLIError(
    OpenCodeErrorType.NETWORK_ERROR,
    'Network error',
    'Check your internet connection',
    { label: 'Retry', actionType: 'retry' }
  )
}

function createUnknownError(exitCode: number, details: string): OpenCodeCLIError {
  return new OpenCodeCLIError(
    OpenCodeErrorType.UNKNOWN,
    `OpenCode exited with code ${exitCode}`,
    details.slice(0, 500)
  )
}

export function createTimeoutError(timeoutMs: number): OpenCodeCLIError {
  const minutes = Math.round(timeoutMs / 60000)
  return new OpenCodeCLIError(
    OpenCodeErrorType.TIMEOUT,
    'Review timed out',
    `Review took longer than ${minutes} minute${minutes > 1 ? 's' : ''}. Try a smaller PR or increase timeout.`,
    { label: 'Retry', actionType: 'retry' }
  )
}

export function createNotInstalledError(): OpenCodeCLIError {
  return new OpenCodeCLIError(
    OpenCodeErrorType.NOT_INSTALLED,
    'OpenCode not installed',
    'Install: curl -fsSL https://opencode.ai/install | bash',
    {
      label: 'Install Instructions',
      actionType: 'open_url',
      payload: 'https://opencode.ai/docs',
    }
  )
}

export function getErrorAction(error: OpenCodeCLIError): ErrorAction | undefined {
  return error.action
}
