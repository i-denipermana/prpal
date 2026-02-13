/** Environment-based configuration loader */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { AppConfigSchema, resolveConfig, type ResolvedConfig } from '../types/config.js'
import { ConfigError } from '../types/errors.js'

const CONFIG_DIR = join(homedir(), '.config', 'prpal')
const CONFIG_FILE = join(CONFIG_DIR, 'settings.json')

function getEnvString(key: string): string | undefined {
  return process.env[key]
}

function getEnvNumber(key: string): number | undefined {
  const value = process.env[key]
  if (!value) return undefined
  const num = parseInt(value, 10)
  return isNaN(num) ? undefined : num
}

function getEnvBoolean(key: string): boolean | undefined {
  const value = process.env[key]?.toLowerCase()
  if (!value) return undefined
  return value === 'true' || value === '1'
}

function loadFromEnv(): Record<string, unknown> {
  return {
    github: {
      pat: getEnvString('GITHUB_PAT'),
      username: getEnvString('GITHUB_USERNAME'),
      org: getEnvString('GITHUB_ORG'),
    },
    polling: {
      intervalMs: getEnvNumber('POLL_INTERVAL_MS'),
    },
    server: {
      port: getEnvNumber('SERVER_PORT'),
      host: getEnvString('SERVER_HOST'),
    },
    opencode: {
      enabled: getEnvBoolean('OPENCODE_ENABLED'),
      model: getEnvString('OPENCODE_MODEL'),
      timeoutMs: getEnvNumber('OPENCODE_TIMEOUT_MS'),
      path: getEnvString('OPENCODE_PATH'),
      autoReview: getEnvBoolean('OPENCODE_AUTO_REVIEW'),
    },
    logLevel: getEnvString('LOG_LEVEL'),
  }
}

function loadFromFile(): Record<string, unknown> | null {
  if (!existsSync(CONFIG_FILE)) return null

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8')
    return JSON.parse(content) as Record<string, unknown>
  } catch {
    return null
  }
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
  const result = { ...target }

  for (const key of Object.keys(source)) {
    const sourceVal = source[key]
    const targetVal = target[key]

    if (sourceVal === undefined || sourceVal === null) continue

    if (isObject(sourceVal) && isObject(targetVal)) {
      result[key] = deepMerge(targetVal, sourceVal)
    } else {
      result[key] = sourceVal
    }
  }

  return result
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue

    if (isObject(value)) {
      const cleaned = removeUndefined(value)
      if (Object.keys(cleaned).length > 0) {
        result[key] = cleaned
      }
    } else {
      result[key] = value
    }
  }

  return result
}

export function loadConfig(): ResolvedConfig {
  const fileConfig = loadFromFile() ?? {}
  const envConfig = removeUndefined(loadFromEnv())
  const merged = deepMerge(fileConfig, envConfig)

  const parsed = AppConfigSchema.safeParse(merged)

  if (!parsed.success) {
    const issues = parsed.error.issues ?? []
    const errors = issues.map((e) => `${String(e.path.join('.'))}: ${e.message}`)
    throw new ConfigError('Invalid configuration', errors.join('; '))
  }

  return resolveConfig(parsed.data)
}

export function tryLoadConfig(): ResolvedConfig | null {
  try {
    return loadConfig()
  } catch {
    return null
  }
}

export function hasValidConfig(): boolean {
  return tryLoadConfig() !== null
}

export function getConfigDir(): string {
  return CONFIG_DIR
}

export function getConfigFile(): string {
  return CONFIG_FILE
}
