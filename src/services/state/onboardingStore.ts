/** Onboarding state management */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigDir } from '../../config/env.js'
import { debug, info } from '../../utils/logger.js'

const ONBOARDING_FILE = 'onboarding.json'

interface OnboardingState {
  completed: boolean
  completedAt?: string
  version: string
}

const DEFAULT_STATE: OnboardingState = {
  completed: false,
  version: '1.0.0',
}

let cachedState: OnboardingState | null = null

export function isOnboardingComplete(): boolean {
  const state = getOnboardingState()
  return state.completed
}

export function getOnboardingState(): OnboardingState {
  if (cachedState) return cachedState

  const filePath = getOnboardingFilePath()

  if (!existsSync(filePath)) {
    debug('No onboarding state found, using default')
    return DEFAULT_STATE
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    cachedState = JSON.parse(content) as OnboardingState
    return cachedState
  } catch {
    debug('Failed to read onboarding state')
    return DEFAULT_STATE
  }
}

export function markOnboardingComplete(): void {
  const state: OnboardingState = {
    completed: true,
    completedAt: new Date().toISOString(),
    version: '1.0.0',
  }

  saveOnboardingState(state)
  info('Onboarding marked as complete')
}

export function resetOnboarding(): void {
  cachedState = null
  saveOnboardingState(DEFAULT_STATE)
  info('Onboarding reset')
}

function saveOnboardingState(state: OnboardingState): void {
  const filePath = getOnboardingFilePath()
  const dir = getConfigDir()

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(filePath, JSON.stringify(state, null, 2))
  cachedState = state
}

function getOnboardingFilePath(): string {
  return join(getConfigDir(), ONBOARDING_FILE)
}

export function needsOnboarding(): boolean {
  return !isOnboardingComplete()
}
