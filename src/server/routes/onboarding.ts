/** Onboarding routes - handle initial setup */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  needsOnboarding,
  markOnboardingComplete,
  resetOnboarding,
} from '../../services/state/onboardingStore.js'
import {
  updateGitHubSettings,
  isConfigured,
} from '../../services/state/settingsStore.js'
import { detectOpenCode } from '../../services/opencode/detector.js'
import { info } from '../../utils/logger.js'

export function registerOnboardingRoutes(server: FastifyInstance): void {
  server.get('/api/onboarding/status', handleGetStatus)
  server.post('/api/onboarding/complete', handleComplete)
  server.post('/api/onboarding/reset', handleReset)
  server.post('/api/onboarding/verify', handleVerify)
  server.get('/api/onboarding/opencode', handleCheckOpenCode)
}

interface OnboardingStatus {
  needsOnboarding: boolean
  isConfigured: boolean
}

function handleGetStatus(_request: FastifyRequest, reply: FastifyReply): void {
  const status: OnboardingStatus = {
    needsOnboarding: needsOnboarding(),
    isConfigured: isConfigured(),
  }
  void reply.send(status)
}

interface CompleteBody {
  pat: string
  username: string
  org: string
}

async function handleComplete(
  request: FastifyRequest<{ Body: CompleteBody }>,
  reply: FastifyReply
): Promise<void> {
  const { pat, username, org } = request.body

  if (!pat || !username || !org) {
    void reply.status(400).send({ error: 'Missing required fields' })
    return
  }

  updateGitHubSettings(pat, username, org)
  markOnboardingComplete()

  info('Onboarding completed via API')

  void reply.send({ success: true })
}

function handleReset(_request: FastifyRequest, reply: FastifyReply): void {
  resetOnboarding()
  info('Onboarding reset via API')
  void reply.send({ success: true })
}

async function handleCheckOpenCode(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const result = await detectOpenCode()
  void reply.send(result)
}

interface VerifyBody {
  pat: string
  org: string
}

async function handleVerify(
  request: FastifyRequest<{ Body: VerifyBody }>,
  reply: FastifyReply
): Promise<void> {
  const { pat, org } = request.body

  if (!pat || !org) {
    void reply.status(400).send({ error: 'Missing pat or org' })
    return
  }

  try {
    const result = await verifyGitHubAccess(pat, org)
    void reply.send(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed'
    void reply.status(400).send({ error: message })
  }
}

interface VerifyResult {
  tokenValid: boolean
  orgAccess: boolean
  teams: string[]
  username: string
}

async function verifyGitHubAccess(pat: string, org: string): Promise<VerifyResult> {
  const headers = {
    Authorization: `Bearer ${pat}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }

  // Verify token by getting user
  const userResponse = await fetch('https://api.github.com/user', { headers })
  if (!userResponse.ok) {
    throw new Error('Invalid GitHub token')
  }
  const user = (await userResponse.json()) as { login: string }

  // Check org access
  const orgResponse = await fetch(`https://api.github.com/orgs/${org}`, { headers })
  const orgAccess = orgResponse.ok

  // Get teams
  const teamsResponse = await fetch('https://api.github.com/user/teams', { headers })
  const teams: string[] = []

  if (teamsResponse.ok) {
    const teamsData = (await teamsResponse.json()) as Array<{
      slug: string
      organization: { login: string }
    }>
    teams.push(
      ...teamsData
        .filter((t) => t.organization.login.toLowerCase() === org.toLowerCase())
        .map((t) => t.slug)
    )
  }

  return {
    tokenValid: true,
    orgAccess,
    teams,
    username: user.login,
  }
}
