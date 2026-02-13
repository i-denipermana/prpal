/** Main entry point for PRPal */

import { loadConfig, tryLoadConfig, hasValidConfig } from './config/env.js'
import { createGitHubClient } from './services/github/client.js'
import { detectUserTeams } from './services/github/teamDetector.js'
import { initAgentStore } from './services/state/agentStore.js'
import { startPolling, stopPolling } from './services/polling/index.js'
import {
  notifyNewPR,
  notifyMultiplePRs,
  onNotificationClick,
} from './services/notification/native.js'
import {
  createServer,
  startServer,
  setGitHubClient,
  setReviewClient,
  setPollContext,
} from './server/index.js'
import { info, warn, error as logError, setLogLevel } from './utils/logger.js'
import { needsOnboarding } from './services/state/onboardingStore.js'
import type { ResolvedConfig } from './types/config.js'

async function main(): Promise<void> {
  info('Starting PRPal...')

  // Start server first (needed for onboarding API)
  const serverConfig = { port: 3847, host: '127.0.0.1' }
  const server = await createServer(serverConfig)
  await startServer(server, serverConfig)

  // Check if we need onboarding or have valid config
  const config = tryLoadConfig()

  if (!config || needsOnboarding()) {
    warn('Configuration incomplete - waiting for onboarding')
    info('Server running at http://localhost:3847 - complete onboarding to start')
    setupShutdownHandlers(server)
    startConfigWatcher(server)
    return
  }

  // Full startup with valid config
  await initializeWithConfig(config, server)
}

async function initializeWithConfig(
  config: ResolvedConfig,
  server: { close: () => Promise<void> }
): Promise<void> {
  setLogLevel(config.logLevel)
  initAgentStore()

  const client = createGitHubClient({ token: config.github.pat })
  setGitHubClient(client)
  setReviewClient(client)

  const userTeams = await detectUserTeams(client, config.github.org)
  info(`Detected ${userTeams.teams.length} teams for user`)

  setupPolling(client, config, userTeams)
  setupNotificationHandler()
  setupShutdownHandlers(server)

  info('PRPal is running')
}

function startConfigWatcher(server: { close: () => Promise<void> }): void {
  // Check for config every 2 seconds until onboarding completes
  const checkInterval = setInterval(async () => {
    if (hasValidConfig() && !needsOnboarding()) {
      clearInterval(checkInterval)
      info('Configuration detected, initializing...')

      const config = loadConfig()
      await initializeWithConfig(config, server)
    }
  }, 2000)
}

function setupPolling(
  client: ReturnType<typeof createGitHubClient>,
  config: ReturnType<typeof loadConfig>,
  userTeams: Awaited<ReturnType<typeof detectUserTeams>>
): void {
  const { org, username } = config.github
  const { intervalMs } = config.polling
  const notificationOpts = { sound: config.notification.sound }

  // Set poll context for manual refresh API
  setPollContext(org, username, userTeams)

  startPolling(client, org, username, userTeams, intervalMs, (newPRs) => {
    if (newPRs.length === 0) return

    if (newPRs.length === 1) {
      notifyNewPR(newPRs[0]!, notificationOpts)
    } else {
      notifyMultiplePRs(newPRs.length, notificationOpts)
    }
  })
}

function setupNotificationHandler(): void {
  onNotificationClick(() => {
    info('Notification clicked - opening app window')
    // Menu bar app will handle this when integrated
  })
}

interface ServerLike {
  close: () => Promise<void>
}

function setupShutdownHandlers(server: ServerLike): void {
  const shutdown = createShutdownHandler(server)
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

function createShutdownHandler(server: ServerLike): () => Promise<void> {
  return async () => {
    info('Shutting down...')
    stopPolling()
    await server.close()
    process.exit(0)
  }
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err)
  logError('Failed to start application', { error: message })
  process.exit(1)
})
