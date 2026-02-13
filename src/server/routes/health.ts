/** Health check routes */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { isPolling, getLastPollTime, getPollCount } from '../../services/polling/index.js'
import { getPRCount, getNewPRCount } from '../../services/state/prStore.js'

interface HealthResponse {
  status: 'ok' | 'degraded'
  timestamp: string
  version: string
  polling: {
    active: boolean
    lastPoll: string | null
    pollCount: number
  }
  prs: {
    total: number
    new: number
  }
}

export function registerHealthRoutes(server: FastifyInstance): void {
  server.get('/health', handleHealthCheck)
  server.get('/api/status', handleStatusCheck)
}

function handleHealthCheck(_request: FastifyRequest, reply: FastifyReply): void {
  void reply.send({ status: 'ok' })
}

function handleStatusCheck(_request: FastifyRequest, reply: FastifyReply): void {
  const response = buildHealthResponse()
  void reply.send(response)
}

function buildHealthResponse(): HealthResponse {
  const lastPoll = getLastPollTime()

  return {
    status: isPolling() ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    polling: {
      active: isPolling(),
      lastPoll: lastPoll?.toISOString() ?? null,
      pollCount: getPollCount(),
    },
    prs: {
      total: getPRCount(),
      new: getNewPRCount(),
    },
  }
}
