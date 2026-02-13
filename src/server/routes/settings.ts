/** Settings routes - get and update app configuration */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import {
  getSettings,
  updateGitHubSettings,
  updatePollingSettings,
  updateOpenCodeSettings,
  updateOpenCodeFolders,
  updateNotificationSettings,
  updateReviewFormatSettings,
} from '../../services/state/settingsStore.js'
import { initSkillsAndMemories } from '../../services/opencode/skills.js'
import { info } from '../../utils/logger.js'

export function registerSettingsRoutes(server: FastifyInstance): void {
  server.get('/api/settings', handleGetSettings)
  server.put('/api/settings', handleUpdateSettings)
  server.put('/api/settings/github', handleUpdateGitHub)
  server.put('/api/settings/polling', handleUpdatePolling)
  server.put('/api/settings/opencode', handleUpdateOpenCode)
  server.put('/api/settings/notifications', handleUpdateNotifications)
  server.put('/api/settings/review-format', handleUpdateReviewFormat)
}

function handleGetSettings(_request: FastifyRequest, reply: FastifyReply): void {
  try {
    const settings = getSettings()
    // Don't expose the full PAT, just indicate if it's set
    const safeSettings = {
      ...settings,
      github: {
        ...settings.github,
        pat: settings.github.pat ? '***configured***' : '',
      },
    }
    void reply.send(safeSettings)
  } catch {
    void reply.send({
      github: { pat: '', username: '', org: '' },
      polling: { intervalMs: 300000 },
      opencode: { enabled: true, model: 'anthropic/claude-sonnet-4-20250514', autoReview: true },
      notification: { enabled: true, sound: true },
      reviewFormat: { style: 'standard', attribution: 'subtle' },
    })
  }
}

interface UpdateAllBody {
  github?: { pat?: string; username?: string; org?: string }
  polling?: { intervalMs?: number }
  opencode?: { enabled?: boolean; model?: string; autoReview?: boolean; skillsFolder?: string; memoriesFolder?: string }
  notification?: { enabled?: boolean; sound?: boolean }
  reviewFormat?: { style?: string; attribution?: string }
}

async function handleUpdateSettings(
  request: FastifyRequest<{ Body: UpdateAllBody }>,
  reply: FastifyReply
): Promise<void> {
  const body = request.body

  if (body.github?.pat && body.github?.username && body.github?.org) {
    updateGitHubSettings(body.github.pat, body.github.username, body.github.org)
  }

  if (body.polling?.intervalMs) {
    updatePollingSettings(body.polling.intervalMs)
  }

  if (body.opencode) {
    const current = getSettings().opencode
    updateOpenCodeSettings(
      body.opencode.enabled ?? current.enabled,
      body.opencode.model ?? current.model,
      body.opencode.autoReview ?? current.autoReview
    )
    
    // Handle folder paths separately and reinitialize skills
    if (body.opencode.skillsFolder !== undefined || body.opencode.memoriesFolder !== undefined) {
      const skillsFolder = body.opencode.skillsFolder ?? current.skillsFolder
      const memoriesFolder = body.opencode.memoriesFolder ?? current.memoriesFolder
      updateOpenCodeFolders(skillsFolder, memoriesFolder)
      initSkillsAndMemories(skillsFolder, memoriesFolder)
      info('Skills and memories reloaded from folders')
    }
  }

  if (body.notification) {
    const current = getSettings().notification
    updateNotificationSettings(
      body.notification.enabled ?? current.enabled,
      body.notification.sound ?? current.sound
    )
  }

  if (body.reviewFormat) {
    updateReviewFormatSettings(body.reviewFormat as { style?: 'minimal' | 'standard' | 'detailed'; attribution?: 'none' | 'subtle' | 'full' })
  }

  info('Settings updated via API')
  void reply.send({ success: true })
}

interface GitHubBody {
  pat: string
  username: string
  org: string
}

function handleUpdateGitHub(
  request: FastifyRequest<{ Body: GitHubBody }>,
  reply: FastifyReply
): void {
  const { pat, username, org } = request.body
  updateGitHubSettings(pat, username, org)
  info('GitHub settings updated')
  void reply.send({ success: true })
}

interface PollingBody {
  intervalMs: number
}

function handleUpdatePolling(
  request: FastifyRequest<{ Body: PollingBody }>,
  reply: FastifyReply
): void {
  updatePollingSettings(request.body.intervalMs)
  info('Polling settings updated')
  void reply.send({ success: true })
}

interface OpenCodeBody {
  enabled: boolean
  model: string
  autoReview: boolean
}

function handleUpdateOpenCode(
  request: FastifyRequest<{ Body: OpenCodeBody }>,
  reply: FastifyReply
): void {
  const { enabled, model, autoReview } = request.body
  updateOpenCodeSettings(enabled, model, autoReview)
  info('OpenCode settings updated')
  void reply.send({ success: true })
}

interface NotificationBody {
  enabled: boolean
  sound: boolean
}

function handleUpdateNotifications(
  request: FastifyRequest<{ Body: NotificationBody }>,
  reply: FastifyReply
): void {
  const { enabled, sound } = request.body
  updateNotificationSettings(enabled, sound)
  info('Notification settings updated')
  void reply.send({ success: true })
}

interface ReviewFormatBody {
  style?: 'minimal' | 'standard' | 'detailed'
  attribution?: 'none' | 'subtle' | 'full'
}

function handleUpdateReviewFormat(
  request: FastifyRequest<{ Body: ReviewFormatBody }>,
  reply: FastifyReply
): void {
  updateReviewFormatSettings(request.body)
  info('Review format settings updated')
  void reply.send({ success: true })
}
