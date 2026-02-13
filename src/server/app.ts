/** Fastify server factory */

import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { info, error as logError } from '../utils/logger.js'
import { registerHealthRoutes } from './routes/health.js'
import { registerPRRoutes } from './routes/prs.js'
import { registerReviewRoutes } from './routes/review.js'
import { registerOnboardingRoutes } from './routes/onboarding.js'
import { registerSettingsRoutes } from './routes/settings.js'
import { registerModelsRoutes } from './routes/models.js'
import { registerAgentRoutes } from './routes/agents.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface ServerOptions {
  port: number
  host: string
}

export async function createServer(_options: ServerOptions): Promise<FastifyInstance> {
  const server = Fastify({
    logger: false,
  })

  await registerPlugins(server)
  registerRoutes(server)
  registerErrorHandler(server)

  return server
}

async function registerPlugins(server: FastifyInstance): Promise<void> {
  await server.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  })

  // Serve static files from renderer directory
  await server.register(fastifyStatic, {
    root: join(__dirname, '../renderer'),
    prefix: '/',
  })

  // Serve assets (icons, images) from assets directory
  await server.register(fastifyStatic, {
    root: join(__dirname, '../../assets'),
    prefix: '/assets/',
    decorateReply: false,
  })
}

function registerRoutes(server: FastifyInstance): void {
  registerHealthRoutes(server)
  registerPRRoutes(server)
  registerReviewRoutes(server)
  registerOnboardingRoutes(server)
  registerSettingsRoutes(server)
  registerModelsRoutes(server)
  registerAgentRoutes(server)
}

interface FastifyError extends Error {
  statusCode?: number
}

function registerErrorHandler(server: FastifyInstance): void {
  server.setErrorHandler((error: FastifyError, _request, reply) => {
    logError('Request error', { error: error.message, stack: error.stack })

    const statusCode = error.statusCode ?? 500
    const message = statusCode >= 500 ? 'Internal server error' : error.message

    void reply.status(statusCode).send({
      error: message,
      statusCode,
    })
  })
}

export async function startServer(
  server: FastifyInstance,
  options: ServerOptions
): Promise<string> {
  const address = await server.listen({ port: options.port, host: options.host })
  info(`Server listening on ${address}`)
  return address
}

export async function stopServer(server: FastifyInstance): Promise<void> {
  await server.close()
  info('Server stopped')
}
