/** Error types */

export enum OpenCodeErrorType {
  NOT_INSTALLED = 'NOT_INSTALLED',
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  API_KEY_MISSING = 'API_KEY_MISSING',
  API_KEY_INVALID = 'API_KEY_INVALID',
  RATE_LIMITED = 'RATE_LIMITED',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  CONTEXT_TOO_LONG = 'CONTEXT_TOO_LONG',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  PROCESS_CRASHED = 'PROCESS_CRASHED',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export interface ErrorAction {
  label: string
  actionType: 'open_settings' | 'retry' | 'open_url' | 'dismiss'
  payload?: string
}

export interface OpenCodeError {
  type: OpenCodeErrorType
  message: string
  details?: string
  recoverable: boolean
  action?: ErrorAction
}

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly recoverable: boolean = false,
    public readonly details?: string
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class GitHubError extends AppError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly rateLimitReset?: Date
  ) {
    super(message, 'GITHUB_ERROR', statusCode === 429)
    this.name = 'GitHubError'
  }
}

export class OpenCodeCLIError extends AppError {
  constructor(
    public readonly errorType: OpenCodeErrorType,
    message: string,
    details?: string,
    public readonly action?: ErrorAction
  ) {
    const recoverable = [
      OpenCodeErrorType.TIMEOUT,
      OpenCodeErrorType.NETWORK_ERROR,
      OpenCodeErrorType.RATE_LIMITED,
    ].includes(errorType)

    super(message, errorType, recoverable, details)
    this.name = 'OpenCodeCLIError'
  }
}

export class ConfigError extends AppError {
  constructor(message: string, details?: string) {
    super(message, 'CONFIG_ERROR', false, details)
    this.name = 'ConfigError'
  }
}

export function isOpenCodeError(error: unknown): error is OpenCodeCLIError {
  return error instanceof OpenCodeCLIError
}

export function isGitHubError(error: unknown): error is GitHubError {
  return error instanceof GitHubError
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
