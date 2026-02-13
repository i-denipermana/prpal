/** Tests for health routes */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import { registerHealthRoutes } from '../../server/routes/health.js'
import { resetSchedulerState } from '../../services/polling/scheduler.js'
import { clearAllPRs, addPR } from '../../services/state/prStore.js'
import type { PullRequest } from '../../types/pr.js'

const createMockPR = (id: string): PullRequest => ({
  id,
  number: 1,
  title: 'Test PR',
  body: null,
  author: { login: 'author', id: 1, avatar_url: '', html_url: '' },
  repository: { owner: 'owner', name: 'repo', fullName: 'owner/repo' },
  htmlUrl: 'https://github.com/owner/repo/pull/1',
  state: 'open',
  draft: false,
  head: { ref: 'feature', sha: 'abc123' },
  base: { ref: 'main', sha: 'def456' },
  requestedReviewers: [],
  requestedTeams: [],
  labels: [],
  stats: { additions: 0, deletions: 0, changedFiles: 0, comments: 0, reviewComments: 0 },
  createdAt: new Date(),
  updatedAt: new Date(),
})

describe('health routes', () => {
  let server: FastifyInstance

  beforeEach(async () => {
    server = Fastify()
    registerHealthRoutes(server)
    await server.ready()

    clearAllPRs()
    resetSchedulerState()
  })

  afterEach(async () => {
    await server.close()
  })

  describe('GET /health', () => {
    it('should return ok status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      expect(response.json()).toEqual({ status: 'ok' })
    })
  })

  describe('GET /api/status', () => {
    it('should return full status when not polling', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/status',
      })

      expect(response.statusCode).toBe(200)

      const body = response.json()
      expect(body.status).toBe('degraded')
      expect(body.polling.active).toBe(false)
      expect(body.polling.lastPoll).toBeNull()
      expect(body.prs.total).toBe(0)
      expect(body.prs.new).toBe(0)
    })

    it('should include PR counts', async () => {
      addPR(createMockPR('repo#1'))
      addPR(createMockPR('repo#2'))

      const response = await server.inject({
        method: 'GET',
        url: '/api/status',
      })

      const body = response.json()
      expect(body.prs.total).toBe(2)
      expect(body.prs.new).toBe(2)
    })

    it('should include timestamp and version', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/status',
      })

      const body = response.json()
      expect(body.timestamp).toBeDefined()
      expect(body.version).toBe('1.0.0')
    })
  })
})
