/** OpenCode installation detector */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { debug, warn } from '../../utils/logger.js'

const execAsync = promisify(exec)

export interface OpenCodeInfo {
  installed: boolean
  version?: string
  path?: string
}

const COMMON_PATHS = [
  join(homedir(), '.opencode/bin/opencode'),
  join(homedir(), '.local/bin/opencode'),
  '/usr/local/bin/opencode',
  '/opt/homebrew/bin/opencode',
]

export async function detectOpenCode(customPath?: string): Promise<OpenCodeInfo> {
  // Try custom path first
  if (customPath) {
    return tryDetectAt(customPath)
  }

  // Try PATH
  const pathResult = await tryDetectAt('opencode')
  if (pathResult.installed) return pathResult

  // Try common installation paths
  for (const path of COMMON_PATHS) {
    if (existsSync(path)) {
      const result = await tryDetectAt(path)
      if (result.installed) return result
    }
  }

  warn('OpenCode not found')
  return { installed: false }
}

async function tryDetectAt(command: string): Promise<OpenCodeInfo> {
  try {
    const { stdout } = await execAsync(`${command} --version`)
    const version = parseVersion(stdout)
    const path = command.startsWith('/') ? command : await findOpenCodePath(command)

    debug('OpenCode detected', { version, path })
    return { installed: true, version, path }
  } catch {
    return { installed: false }
  }
}

export async function isOpenCodeInstalled(customPath?: string): Promise<boolean> {
  const info = await detectOpenCode(customPath)
  return info.installed
}

export async function getOpenCodeVersion(customPath?: string): Promise<string | null> {
  const info = await detectOpenCode(customPath)
  return info.version ?? null
}

export async function getOpenCodePath(customPath?: string): Promise<string> {
  const info = await detectOpenCode(customPath)
  return info.path ?? 'opencode'
}

async function findOpenCodePath(command: string): Promise<string | undefined> {
  try {
    const { stdout } = await execAsync(`which ${command}`)
    return stdout.trim()
  } catch {
    return undefined
  }
}

function parseVersion(output: string): string | undefined {
  // Output format: "opencode version x.x.x" or just "x.x.x"
  const match = output.match(/(\d+\.\d+\.\d+)/)
  return match?.[1]
}

export function getInstallInstructions(): string {
  return 'Install OpenCode: curl -fsSL https://opencode.ai/install | bash'
}
