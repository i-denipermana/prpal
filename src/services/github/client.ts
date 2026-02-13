/** GitHub API HTTP client */

import { ofetch } from 'ofetch'
import { GitHubError } from '../../types/errors.js'
import { withRetry, isRetryableError } from '../../utils/retry.js'
import { debug } from '../../utils/logger.js'
import type { GitHubRateLimit } from '../../types/github.js'

const GITHUB_API_BASE = 'https://api.github.com'

export interface GitHubClientConfig {
  token: string
  baseUrl?: string
}

export interface RequestOptions {
  query?: Record<string, string | number | boolean>
}

export interface GitHubClient {
  get: <T>(path: string, options?: RequestOptions) => Promise<T>
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => Promise<T>
  getRateLimit: () => Promise<GitHubRateLimit>
}

function createHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function handleGitHubError(error: unknown, path: string): never {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status
    const message = (error as { message?: string }).message ?? 'GitHub API error'

    if (status === 401) {
      throw new GitHubError('Invalid GitHub token', status)
    }
    if (status === 403) {
      throw new GitHubError('GitHub API forbidden - check permissions', status)
    }
    if (status === 404) {
      throw new GitHubError(`Resource not found: ${path}`, status)
    }
    if (status === 429) {
      throw new GitHubError('GitHub API rate limit exceeded', status)
    }

    throw new GitHubError(message, status)
  }

  throw new GitHubError(String(error))
}

export function createGitHubClient(config: GitHubClientConfig): GitHubClient {
  const baseUrl = config.baseUrl ?? GITHUB_API_BASE
  const headers = createHeaders(config.token)

  const request = async <T>(
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> => {
    const url = `${baseUrl}${path}`
    debug(`GitHub ${method} ${path}`)

    try {
      return await withRetry(
        () =>
          ofetch<T>(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
            query: options?.query,
          }),
        {
          maxRetries: 3,
          shouldRetry: (err) => {
            if (err instanceof GitHubError && err.statusCode === 429) {
              return true
            }
            return isRetryableError(err)
          },
        }
      )
    } catch (error) {
      handleGitHubError(error, path)
    }
  }

  return {
    get: <T>(path: string, options?: RequestOptions) =>
      request<T>('GET', path, undefined, options),

    post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
      request<T>('POST', path, body, options),

    getRateLimit: async (): Promise<GitHubRateLimit> => {
      const response = await request<{ rate: GitHubRateLimit }>('GET', '/rate_limit')
      return response.rate
    },
  }
}
