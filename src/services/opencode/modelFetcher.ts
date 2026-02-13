/** Model fetcher - gets available models from OpenCode CLI */

import { spawn } from 'node:child_process'
import { info, debug, error as logError } from '../../utils/logger.js'

export interface ModelInfo {
  id: string
  provider: string
  name: string
  contextLimit?: number
  outputLimit?: number
  inputCost?: number
  outputCost?: number
  hasReasoning?: boolean
}

interface ModelCache {
  models: ModelInfo[]
  fetchedAt: number
}

let cache: ModelCache | null = null
const CACHE_TTL = 3600000 // 1 hour

export async function fetchAvailableModels(
  opencodePath = 'opencode',
  refresh = false
): Promise<ModelInfo[]> {
  if (!refresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    debug('[Models] Returning cached models', { count: cache.models.length })
    return cache.models
  }

  info('[Models] Fetching available models from OpenCode...')

  try {
    const output = await executeModelsCommand(opencodePath, refresh)
    const models = parseModelsOutput(output)
    
    cache = { models, fetchedAt: Date.now() }
    info('[Models] Fetched models', { count: models.length })
    
    return models
  } catch (err) {
    logError('[Models] Failed to fetch models', { 
      error: err instanceof Error ? err.message : String(err) 
    })
    return cache?.models ?? getDefaultModels()
  }
}

function executeModelsCommand(opencodePath: string, refresh: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = ['models', '--verbose']
    if (refresh) args.push('--refresh')

    const proc = spawn(opencodePath, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (exitCode) => {
      if (exitCode !== 0) {
        reject(new Error(`Models command failed: ${stderr}`))
        return
      }
      resolve(stdout)
    })

    proc.on('error', reject)

    setTimeout(() => {
      proc.kill()
      reject(new Error('Models command timed out'))
    }, 30000)
  })
}

function parseModelsOutput(output: string): ModelInfo[] {
  const models: ModelInfo[] = []
  const lines = output.split('\n')
  
  let currentModelId = ''
  let jsonBuffer = ''
  let inJson = false

  for (const line of lines) {
    // Model ID line (e.g., "anthropic/claude-3-5-sonnet-20241022")
    if (line.match(/^[a-z0-9-]+\/[a-z0-9.-]+$/i)) {
      if (currentModelId && jsonBuffer) {
        const model = parseModelJson(currentModelId, jsonBuffer)
        if (model) models.push(model)
      }
      currentModelId = line.trim()
      jsonBuffer = ''
      inJson = false
      continue
    }

    // Start of JSON
    if (line.trim() === '{') {
      inJson = true
      jsonBuffer = '{'
      continue
    }

    // Accumulate JSON
    if (inJson) {
      jsonBuffer += line
      if (line.trim() === '}') {
        inJson = false
      }
    }
  }

  // Handle last model
  if (currentModelId && jsonBuffer) {
    const model = parseModelJson(currentModelId, jsonBuffer)
    if (model) models.push(model)
  }

  return models
}

function parseModelJson(modelId: string, json: string): ModelInfo | null {
  try {
    const data = JSON.parse(json)
    const [provider] = modelId.split('/')
    
    return {
      id: modelId,
      provider,
      name: data.name || modelId.split('/')[1],
      contextLimit: data.limit?.context,
      outputLimit: data.limit?.output,
      inputCost: data.cost?.input,
      outputCost: data.cost?.output,
      hasReasoning: data.capabilities?.reasoning,
    }
  } catch {
    // Fallback for simple model IDs without JSON
    const [provider] = modelId.split('/')
    return {
      id: modelId,
      provider,
      name: modelId.split('/')[1],
    }
  }
}

function getDefaultModels(): ModelInfo[] {
  return [
    { id: 'anthropic/claude-sonnet-4-5', provider: 'anthropic', name: 'Claude Sonnet 4.5' },
    { id: 'anthropic/claude-3-5-sonnet-20241022', provider: 'anthropic', name: 'Claude 3.5 Sonnet' },
    { id: 'anthropic/claude-3-5-haiku-latest', provider: 'anthropic', name: 'Claude 3.5 Haiku' },
    { id: 'openai/gpt-4o', provider: 'openai', name: 'GPT-4o' },
    { id: 'openai/gpt-4o-mini', provider: 'openai', name: 'GPT-4o Mini' },
  ]
}

export function getModelsByProvider(models: ModelInfo[]): Map<string, ModelInfo[]> {
  const byProvider = new Map<string, ModelInfo[]>()
  
  for (const model of models) {
    const list = byProvider.get(model.provider) ?? []
    list.push(model)
    byProvider.set(model.provider, list)
  }
  
  return byProvider
}

export function clearModelsCache(): void {
  cache = null
  debug('[Models] Cache cleared')
}
