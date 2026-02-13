/** Settings store - manages app configuration persistence */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import type { ResolvedConfig, ReviewFormatConfig } from '../../types/config.js'
import { tryLoadConfig, getConfigDir, getConfigFile } from '../../config/env.js'
import { debug, info } from '../../utils/logger.js'

let currentConfig: ResolvedConfig | null = null

const DEFAULT_CONFIG: ResolvedConfig = {
  github: { pat: '', username: '', org: '' },
  polling: { intervalMs: 300000 },
  server: { port: 3847, host: '127.0.0.1' },
  opencode: {
    enabled: true,
    model: 'anthropic/claude-sonnet-4-20250514',
    timeoutMs: 300000, // 5 minutes
    autoReview: true,
  },
  reviewFormat: { style: 'standard', attribution: 'subtle' },
  notification: { enabled: true, sound: true },
  logLevel: 'info',
}

export function initSettingsStore(): ResolvedConfig {
  currentConfig = tryLoadConfig() ?? DEFAULT_CONFIG
  info('Settings loaded')
  return currentConfig
}

export function getSettings(): ResolvedConfig {
  if (!currentConfig) {
    return initSettingsStore()
  }
  return currentConfig
}

export function updateGitHubSettings(
  pat: string,
  username: string,
  org: string
): ResolvedConfig {
  if (!currentConfig) {
    currentConfig = tryLoadConfig() ?? { ...DEFAULT_CONFIG }
  }

  currentConfig = {
    ...currentConfig,
    github: { pat, username, org },
  }

  saveSettings()
  return currentConfig
}

export function updatePollingSettings(intervalMs: number): ResolvedConfig {
  ensureConfig()
  currentConfig = { ...currentConfig!, polling: { intervalMs } }
  saveSettings()
  return currentConfig!
}

export function updateOpenCodeSettings(
  enabled: boolean,
  model: string,
  autoReview: boolean
): ResolvedConfig {
  ensureConfig()
  currentConfig = {
    ...currentConfig!,
    opencode: { ...currentConfig!.opencode, enabled, model, autoReview },
  }
  saveSettings()
  return currentConfig!
}

export function updateOpenCodeFolders(
  skillsFolder?: string,
  memoriesFolder?: string
): ResolvedConfig {
  ensureConfig()
  currentConfig = {
    ...currentConfig!,
    opencode: {
      ...currentConfig!.opencode,
      skillsFolder: skillsFolder || undefined,
      memoriesFolder: memoriesFolder || undefined,
    },
  }
  saveSettings()
  return currentConfig!
}

export function updateReviewFormatSettings(
  format: Partial<ReviewFormatConfig>
): ResolvedConfig {
  ensureConfig()
  currentConfig = {
    ...currentConfig!,
    reviewFormat: { ...currentConfig!.reviewFormat, ...format },
  }
  saveSettings()
  return currentConfig!
}

export function updateNotificationSettings(
  enabled: boolean,
  sound: boolean
): ResolvedConfig {
  ensureConfig()
  currentConfig = { ...currentConfig!, notification: { enabled, sound } }
  saveSettings()
  return currentConfig!
}

function ensureConfig(): void {
  if (!currentConfig) {
    currentConfig = tryLoadConfig() ?? { ...DEFAULT_CONFIG }
  }
}

function saveSettings(): void {
  if (!currentConfig) return

  const configDir = getConfigDir()
  const configFile = getConfigFile()

  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true })
  }

  // Save only user-configurable settings (not full resolved config)
  const settingsToSave = {
    github: currentConfig.github,
    polling: currentConfig.polling,
    opencode: currentConfig.opencode,
    reviewFormat: currentConfig.reviewFormat,
    notification: currentConfig.notification,
    logLevel: currentConfig.logLevel,
  }

  writeFileSync(configFile, JSON.stringify(settingsToSave, null, 2))
  debug('Settings saved')
}

export function isConfigured(): boolean {
  try {
    const settings = getSettings()
    return Boolean(settings.github.pat && settings.github.username && settings.github.org)
  } catch {
    return false
  }
}

export function getGitHubToken(): string {
  return getSettings().github.pat
}

export function getGitHubUsername(): string {
  return getSettings().github.username
}

export function getGitHubOrg(): string {
  return getSettings().github.org
}

export function isOpenCodeEnabled(): boolean {
  return getSettings().opencode.enabled
}

export function isAutoReviewEnabled(): boolean {
  return getSettings().opencode.autoReview
}

export function getPollingInterval(): number {
  return getSettings().polling.intervalMs
}

export function getConfiguredModel(): string {
  return getSettings().opencode.model
}

export function getReviewTimeout(): number {
  return getSettings().opencode.timeoutMs
}
