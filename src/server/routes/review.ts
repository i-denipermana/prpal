/** Review routes - AI review and posting endpoints */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { PostReviewRequest, ReviewResult } from '../../types/review.js'
import type { GitHubClient } from '../../services/github/client.js'
import { getPRState, updatePRStatus } from '../../services/state/prStore.js'
import {
  getReviewState,
  setReviewInProgress,
  setReviewCompleted,
  setReviewFailed,
  setReviewCancelled,
  updateReviewStage,
  setInlineComments,
  getInlineComments,
} from '../../services/state/reviewStore.js'
import { getAgent, getDefaultAgent } from '../../services/state/agentStore.js'
import { getConfiguredModel, getReviewTimeout } from '../../services/state/settingsStore.js'
import { reviewPullRequest, cancelReview } from '../../services/opencode/reviewer.js'
import { fetchPRDiff, fetchPRFiles } from '../../services/github/diffFetcher.js'
import { prepareInlineComments } from '../../services/github/inlineCommentPreparer.js'
import { postReviewToGitHub } from '../../services/github/reviewPoster.js'
import { info } from '../../utils/logger.js'

interface ReviewContext {
  client: GitHubClient | null
}

const context: ReviewContext = { client: null }

export function setReviewClient(client: GitHubClient): void {
  context.client = client
}

export function registerReviewRoutes(server: FastifyInstance): void {
  server.post('/api/review/:prId', handleStartReview)
  server.get('/api/review/:prId', handleGetReview)
  server.post('/api/review/:prId/cancel', handleCancelReview)
  server.post('/api/review/:prId/post', handlePostReview)
}

interface ReviewParams {
  prId: string
}

interface StartReviewBody {
  agentId?: string
}

async function handleStartReview(
  request: FastifyRequest<{ Params: ReviewParams; Body: StartReviewBody }>,
  reply: FastifyReply
): Promise<void> {
  const prId = decodeURIComponent(request.params.prId)
  const state = getPRState(prId)

  if (!state) {
    void reply.status(404).send({ error: 'PR not found' })
    return
  }

  if (!context.client) {
    void reply.status(500).send({ error: 'GitHub client not initialized' })
    return
  }

  const agentId = request.body?.agentId
  const agent = agentId ? getAgent(agentId) : getDefaultAgent()

  if (!agent) {
    void reply.status(400).send({ error: 'Agent not found' })
    return
  }

  const result = await executeReview(prId, agent, context.client)
  void reply.send(result)
}

async function executeReview(
  prId: string,
  agent: ReturnType<typeof getAgent>,
  client: GitHubClient
): Promise<ReviewResult> {
  const prState = getPRState(prId)!
  const pr = prState.pr
  const { owner, name } = pr.repository

  // Use model from settings, fallback to agent's model
  const configuredModel = getConfiguredModel()
  const timeoutMs = getReviewTimeout()

  info(`[Review] Starting review for PR #${pr.number}`, { 
    prId, 
    repo: pr.repository.fullName,
    agent: agent!.id,
    agentName: agent!.name,
    model: configuredModel,
    agentModel: agent!.model,
    timeoutMs,
  })
  setReviewInProgress(prId, 'starting')
  updatePRStatus(prId, 'reviewing')

  try {
    // Stage: Fetching diff
    info(`[Review] Fetching diff for PR #${pr.number}`)
    updateReviewStage(prId, 'fetching_diff')
    const diff = await fetchPRDiff(client, owner, name, pr.number)
    info(`[Review] Diff fetched`, { 
      prNumber: pr.number,
      diffBytes: diff.length,
      diffLines: diff.split('\n').length,
    })

    // Stage: Analyzing with AI
    info(`[Review] Starting AI analysis`, {
      prNumber: pr.number,
      model: configuredModel,
      agent: agent!.id,
    })
    updateReviewStage(prId, 'analyzing')
    
    const result = await reviewPullRequest(pr, { 
      agent: agent!, 
      diff,
      model: configuredModel,
      timeoutMs,
      onProgress: (stage) => {
        info(`[Review] Progress: ${stage}`, { prNumber: pr.number, model: configuredModel })
        if (stage === 'generating') updateReviewStage(prId, 'generating')
        if (stage === 'parsing') updateReviewStage(prId, 'parsing')
      },
    })

    info(`[Review] Completed for PR #${pr.number}`, { 
      model: configuredModel,
      verdict: result.output.verdict,
      issues: result.output.issues.length,
      suggestions: result.output.suggestions.length,
      duration: result.duration,
      durationSec: Math.round(result.duration / 1000) + 's',
    })
    setReviewCompleted(prId, result)
    updatePRStatus(prId, 'reviewed')

    // Prepare inline comments from issues
    const files = await fetchPRFiles(client, owner, name, pr.number)
    const inlineComments = prepareInlineComments(result.output.issues, files)
    setInlineComments(prId, inlineComments)
    info(`[Review] Inline comments prepared`, {
      prNumber: pr.number,
      total: inlineComments.length,
      valid: inlineComments.filter((c) => c.isValid).length,
    })

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Review failed'
    if (message === 'Review cancelled') {
      info(`[Review] Cancelled for PR #${pr.number}`, { model: configuredModel })
      setReviewCancelled(prId)
    } else {
      info(`[Review] Failed for PR #${pr.number}`, { error: message, model: configuredModel })
      setReviewFailed(prId, message)
    }
    throw error
  }
}

function handleCancelReview(
  request: FastifyRequest<{ Params: ReviewParams }>,
  reply: FastifyReply
): void {
  const prId = decodeURIComponent(request.params.prId)
  info(`[Review] Cancel requested for PR: ${prId}`)
  
  const cancelled = cancelReview(prId)
  if (cancelled) {
    setReviewCancelled(prId)
    void reply.send({ success: true, message: 'Review cancelled' })
  } else {
    void reply.status(400).send({ error: 'No active review to cancel' })
  }
}

function handleGetReview(
  request: FastifyRequest<{ Params: ReviewParams }>,
  reply: FastifyReply
): void {
  const prId = decodeURIComponent(request.params.prId)
  const reviewState = getReviewState(prId)

  if (!reviewState) {
    void reply.status(404).send({ error: 'No review found' })
    return
  }

  void reply.send(reviewState)
}

async function handlePostReview(
  request: FastifyRequest<{ Params: ReviewParams; Body: PostReviewRequest }>,
  reply: FastifyReply
): Promise<void> {
  const prId = decodeURIComponent(request.params.prId)
  const prState = getPRState(prId)

  if (!prState) {
    void reply.status(404).send({ error: 'PR not found' })
    return
  }

  if (!context.client) {
    void reply.status(500).send({ error: 'GitHub client not initialized' })
    return
  }

  const { review, action, formatOptions, editedBody, includeInlineComments, selectedCommentIndices } = request.body

  // Get inline comments from store
  const inlineComments = includeInlineComments ? getInlineComments(prId) : undefined
  const selectedIndices = includeInlineComments ? selectedCommentIndices : undefined

  const posted = await postReviewToGitHub(
    context.client,
    prState.pr,
    review,
    action,
    formatOptions,
    editedBody,
    inlineComments,
    selectedIndices
  )

  void reply.send(posted)
}
