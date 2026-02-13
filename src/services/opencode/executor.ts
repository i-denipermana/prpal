/** OpenCode CLI executor - spawns opencode process */

import { spawn, type ChildProcess } from 'node:child_process'
import type { ReviewAgent } from '../../types/agent.js'
import { parseOpenCodeError, createTimeoutError } from './errorHandler.js'
import { debug, info, error as logError } from '../../utils/logger.js'

// Track running processes for cancellation
const runningProcesses = new Map<string, ChildProcess>()

export interface ExecuteOptions {
  prompt: string
  agent: ReviewAgent
  timeoutMs?: number
  model?: string
  prId?: string
}

export interface ExecuteResult {
  stdout: string
  stderr: string
  exitCode: number
}

// 5 minutes default - AI reviews can take time for large PRs
const DEFAULT_TIMEOUT = 300000

export function abortExecution(prId: string): boolean {
  const proc = runningProcesses.get(prId)
  if (proc) {
    info(`Aborting OpenCode execution for PR: ${prId}`)
    proc.kill('SIGTERM')
    setTimeout(() => proc.kill('SIGKILL'), 2000)
    runningProcesses.delete(prId)
    return true
  }
  return false
}

export async function executeOpenCode(
  options: ExecuteOptions,
  opencodePath = 'opencode'
): Promise<ExecuteResult> {
  const { prompt, agent, timeoutMs = DEFAULT_TIMEOUT, model, prId } = options
  const startTime = Date.now()
  
  const effectiveModel = model || agent.model
  const provider = extractProvider(effectiveModel)

  info('[OpenCode] Starting AI execution', {
    agent: agent.id,
    model: effectiveModel,
    provider,
    timeout: timeoutMs,
    prId,
  })

  const args = buildArgs(prompt, agent, effectiveModel)
  const env = buildEnv(agent)
  
  // Log full command for debugging
  info('[OpenCode] Executing command', { 
    path: opencodePath,
    args: args,
    model: effectiveModel,
  })

  return new Promise((resolve, reject) => {
    const proc = spawn(opencodePath, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    if (!proc.pid) {
      info('[OpenCode] WARNING: Process may not have started properly')
    }
    
    // Write prompt to stdin to avoid shell escaping issues with long prompts
    info('[OpenCode] Writing prompt to stdin', { promptLength: prompt.length })
    proc.stdin.write(prompt)
    proc.stdin.end()
    
    info('[OpenCode] Process spawned', { 
      pid: proc.pid, 
      model: effectiveModel,
      promptLength: prompt.length,
      command: `${opencodePath} ${args.join(' ').slice(0, 100)}...`,
    })

    if (prId) {
      runningProcesses.set(prId, proc)
    }

    let stdout = ''
    let stderr = ''
    let killed = false
    let cancelled = false
    let lastLogTime = Date.now()

    const timeoutId = setTimeout(() => {
      killed = true
      info('[OpenCode] Timeout reached, terminating process', { 
        timeoutMs, 
        timeoutMin: Math.round(timeoutMs / 60000),
        elapsed: Date.now() - startTime,
        model: effectiveModel,
      })
      proc.kill('SIGTERM')
      setTimeout(() => proc.kill('SIGKILL'), 5000)
    }, timeoutMs)

    // Log status every 30 seconds to show progress
    const statusInterval = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      const remaining = Math.round((timeoutMs - (Date.now() - startTime)) / 1000)
      info('[OpenCode] Still processing...', {
        elapsed: elapsed + 's',
        remaining: remaining + 's',
        outputBytes: stdout.length,
        model: effectiveModel,
        provider,
      })
    }, 30000)

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
      const now = Date.now()
      // Log progress every 5 seconds to avoid spam
      if (now - lastLogTime > 5000) {
        const elapsed = Math.round((now - startTime) / 1000)
        info('[OpenCode] Receiving AI response...', { 
          totalBytes: stdout.length,
          elapsed: elapsed + 's',
          model: effectiveModel,
        })
        lastLogTime = now
      }
      debug(`[OpenCode] stdout chunk: ${data.length} bytes`)
    })

    proc.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString()
      stderr += chunk
      // Log stderr immediately as it often contains progress info
      if (chunk.trim()) {
        info('[OpenCode] stderr output:', { message: chunk.trim().slice(0, 500) })
      }
    })

    proc.on('close', (exitCode) => {
      clearTimeout(timeoutId)
      clearInterval(statusInterval)
      if (prId) runningProcesses.delete(prId)
      
      const duration = Date.now() - startTime

      if (cancelled) {
        info('[OpenCode] Execution cancelled', { 
          duration, 
          durationSec: Math.round(duration / 1000) + 's',
          model: effectiveModel,
        })
        reject(new Error('Review cancelled'))
        return
      }

      if (killed) {
        info('[OpenCode] Execution timed out', { 
          duration, 
          durationSec: Math.round(duration / 1000) + 's',
          timeoutMs, 
          model: effectiveModel,
        })
        reject(createTimeoutError(timeoutMs))
        return
      }

      const code = exitCode ?? 1

      if (code !== 0) {
        logError('[OpenCode] Execution failed', { 
          exitCode: code, 
          stderr: stderr.slice(0, 500),
          duration,
          durationSec: Math.round(duration / 1000) + 's',
          model: effectiveModel,
        })
        reject(parseOpenCodeError(code, stdout, stderr))
        return
      }

      info('[OpenCode] Execution completed successfully', { 
        duration,
        durationSec: Math.round(duration / 1000) + 's',
        outputBytes: stdout.length,
        model: effectiveModel,
        provider,
      })
      resolve({ stdout, stderr, exitCode: code })
    })

    proc.on('error', (err) => {
      clearTimeout(timeoutId)
      clearInterval(statusInterval)
      if (prId) runningProcesses.delete(prId)
      
      if (err.message.includes('SIGTERM')) {
        cancelled = true
        info('[OpenCode] Process terminated', { model: effectiveModel })
        reject(new Error('Review cancelled'))
        return
      }
      
      logError('[OpenCode] Spawn error', { 
        error: err.message, 
        model: effectiveModel 
      })
      reject(err)
    })
  })
}

function extractProvider(model: string): string {
  if (model.includes('/')) {
    return model.split('/')[0]
  }
  if (model.startsWith('claude')) return 'anthropic'
  if (model.startsWith('gpt')) return 'openai'
  if (model.startsWith('gemini')) return 'google'
  if (model.startsWith('llama')) return 'meta'
  if (model.startsWith('mistral')) return 'mistral'
  return 'unknown'
}

function buildArgs(_prompt: string, _agent: ReviewAgent, model?: string): string[] {
  // Use opencode run - prompt will be sent via stdin
  // This avoids issues with shell escaping for long prompts
  const args = ['run', '--format', 'json']

  if (model) {
    args.push('--model', model)
  }

  return args
}

function buildEnv(_agent: ReviewAgent): Record<string, string> {
  // No custom environment needed - we pass everything via command args
  return {}
}
