/** Tests for GitHub API client */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createGitHubClient, type GitHubClient } from '../../../services/github/client.js'

// Mock ofetch
vi.mock('ofetch', () => ({
  ofetch: vi.fn(),
}))

import { ofetch } from 'ofetch'

const mockOfetch = vi.mocked(ofetch)

describe('createGitHubClient', () => {
  let client: GitHubClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = createGitHubClient({ token: 'test-token' })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('get', () => {
    it('should make GET request with correct headers', async () => {
      const mockData = { id: 1, name: 'test' }
      mockOfetch.mockResolvedValueOnce(mockData)

      const result = await client.get('/repos/owner/repo')

      expect(mockOfetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            Accept: 'application/vnd.github+json',
          }),
        })
      )
      expect(result).toEqual(mockData)
    })

    it('should pass query parameters', async () => {
      mockOfetch.mockResolvedValueOnce([])

      await client.get('/repos', { query: { per_page: 100 } })

      expect(mockOfetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: { per_page: 100 },
        })
      )
    })
  })

  describe('post', () => {
    it('should make POST request with body', async () => {
      const mockResponse = { id: 123 }
      mockOfetch.mockResolvedValueOnce(mockResponse)

      const body = { title: 'Test PR' }
      const result = await client.post('/repos/owner/repo/pulls', body)

      expect(mockOfetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/pulls',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        })
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getRateLimit', () => {
    it('should fetch rate limit', async () => {
      const mockRateLimit = {
        rate: {
          limit: 5000,
          remaining: 4999,
          reset: 1234567890,
          used: 1,
        },
      }
      mockOfetch.mockResolvedValueOnce(mockRateLimit)

      const result = await client.getRateLimit()

      expect(mockOfetch).toHaveBeenCalledWith(
        'https://api.github.com/rate_limit',
        expect.any(Object)
      )
      expect(result).toEqual(mockRateLimit.rate)
    })
  })

  describe('custom base URL', () => {
    it('should use custom base URL when provided', async () => {
      const customClient = createGitHubClient({
        token: 'test-token',
        baseUrl: 'https://github.example.com/api/v3',
      })

      mockOfetch.mockResolvedValueOnce({})

      await customClient.get('/user')

      expect(mockOfetch).toHaveBeenCalledWith(
        'https://github.example.com/api/v3/user',
        expect.any(Object)
      )
    })
  })
})
