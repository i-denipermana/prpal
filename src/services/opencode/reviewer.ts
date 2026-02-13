/** OpenCode reviewer - orchestrates PR reviews */

import { randomUUID } from 'node:crypto'
import type { PullRequest } from '../../types/pr.js'
import type { ReviewAgent } from '../../types/agent.js'
import type { ReviewResult, AIReviewOutput, ReviewStage } from '../../types/review.js'
import { isOpenCodeInstalled, getOpenCodePath } from './detector.js'
import { executeOpenCode, abortExecution } from './executor.js'
import { buildReviewPrompt } from './prompts.js'
import { parseReviewResponse } from './parser.js'
import { createNotInstalledError } from './errorHandler.js'
import { info } from '../../utils/logger.js'

// Track active reviews for cancellation
const activeReviews = new Map<string, AbortController>()

export interface ReviewOptions {
  agent: ReviewAgent
  diff: string
  model?: string
  timeoutMs?: number
  opencodePath?: string
  onProgress?: (stage: ReviewStage) => void
}

export function cancelReview(prId: string): boolean {
  const controller = activeReviews.get(prId)
  if (controller) {
    info(`Cancelling review for PR: ${prId}`)
    controller.abort()
    activeReviews.delete(prId)
    abortExecution(prId)
    return true
  }
  return false
}

export async function reviewPullRequest(
  pr: PullRequest,
  options: ReviewOptions
): Promise<ReviewResult> {
  const startTime = Date.now()
  const controller = new AbortController()
  activeReviews.set(pr.id, controller)
  
  const effectiveModel = options.model || options.agent.model
  const provider = extractProvider(effectiveModel)

  info('[Reviewer] Starting PR review', {
    prNumber: pr.number,
    prTitle: pr.title.slice(0, 50),
    repo: pr.repository.fullName,
    author: pr.author.login,
    agent: options.agent.id,
    agentName: options.agent.name,
    model: effectiveModel,
    provider,
    diffSize: options.diff.length,
  })

  try {
    checkAborted(controller)
    
    info('[Reviewer] Checking OpenCode installation...')
    const opencodePath = options.opencodePath || await getOpenCodePath()
    info('[Reviewer] OpenCode path:', { path: opencodePath })
    
    const installed = await isOpenCodeInstalled(opencodePath)
    if (!installed) {
      throw createNotInstalledError()
    }
    info('[Reviewer] OpenCode is available')

    checkAborted(controller)
    info('[Reviewer] Building review prompt...', {
      diffLines: options.diff.split('\n').length,
      agentSkills: options.agent.skills?.length || 0,
    })
    const prompt = buildReviewPrompt(pr, options.diff, { agent: options.agent })
    info('[Reviewer] Prompt built', { promptLength: prompt.length })

    checkAborted(controller)
    options.onProgress?.('generating')
    info('[Reviewer] Sending to AI for analysis...', {
      model: effectiveModel,
      provider,
      agent: options.agent.id,
      opencodePath,
    })
    
    const result = await executeOpenCode(
      {
        prompt,
        agent: options.agent,
        model: options.model,
        timeoutMs: options.timeoutMs,
        prId: pr.id,
      },
      opencodePath
    )

    checkAborted(controller)
    options.onProgress?.('parsing')
    info('[Reviewer] Parsing AI response...', {
      responseLength: result.stdout.length,
    })
    const output = parseReviewResponse(result.stdout)
    const duration = Date.now() - startTime

    info('[Reviewer] Review completed', {
      prNumber: pr.number,
      duration,
      durationSec: Math.round(duration / 1000) + 's',
      model: effectiveModel,
      provider,
      verdict: output.verdict,
      issueCount: output.issues.length,
      suggestionCount: output.suggestions.length,
      hasPositives: (output.positives?.length || 0) > 0,
    })

    return createReviewResult(pr, options.agent, output, result.stdout, duration)
  } finally {
    activeReviews.delete(pr.id)
  }
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

function checkAborted(controller: AbortController): void {
  if (controller.signal.aborted) {
    throw new Error('Review cancelled')
  }
}

function createReviewResult(
  pr: PullRequest,
  agent: ReviewAgent,
  output: AIReviewOutput,
  rawResponse: string,
  duration: number
): ReviewResult {
  return {
    id: randomUUID(),
    prId: pr.id,
    prNumber: pr.number,
    agentId: agent.id,
    output,
    rawResponse,
    createdAt: new Date(),
    duration,
  }
}

export async function canReview(opencodePath?: string): Promise<boolean> {
  try {
    return await isOpenCodeInstalled(opencodePath)
  } catch {
    return false
  }
}
