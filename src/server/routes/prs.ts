/** Pull Request routes */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { PRListItem, PRWithDetails, PullRequest } from '../../types/pr.js'
import {
  getPRState,
  updatePRStatus,
  getMyReviewPRs,
  getOtherPRs,
  getUserTeams,
} from '../../services/state/prStore.js'
import { getReviewState } from '../../services/state/reviewStore.js'
import { fetchPRDiff, fetchPRFiles, fetchPRChecks } from '../../services/github/diffFetcher.js'
import type { GitHubClient } from '../../services/github/client.js'

interface PRContext {
  client: GitHubClient | null
}

const context: PRContext = { client: null }

export function setGitHubClient(client: GitHubClient): void {
  context.client = client
}

export function registerPRRoutes(server: FastifyInstance): void {
  server.get('/api/prs', handleListPRs)
  server.get('/api/prs/:id', handleGetPR)
  server.post('/api/prs/:id/seen', handleMarkSeen)
  server.post('/api/prs/:id/dismiss', handleDismiss)
  server.post('/api/prs/:id/reviewed', handleMarkReviewed)
}

function handleListPRs(_request: FastifyRequest, reply: FastifyReply): void {
  const myReviewStates = getMyReviewPRs()
  const otherStates = getOtherPRs()
  const userTeams = getUserTeams()
  
  const myReviewItems = myReviewStates.map(mapToListItem)
  const otherItems = otherStates.map(mapToListItem)
  const allItems = [...myReviewItems, ...otherItems]
  
  // Filter "my team" PRs - PRs requesting review from user's teams (but not directly from user)
  const myReviewIds = new Set(myReviewItems.map(p => p.id))
  const myTeamItems = otherItems.filter(pr => {
    if (myReviewIds.has(pr.id)) return false // Already in myReview
    return pr.requestedTeams.some(team => userTeams.includes(team))
  })
  const myTeamIds = new Set(myTeamItems.map(p => p.id))
  
  // "Other" is now PRs not in myReview or myTeam
  const remainingOther = otherItems.filter(pr => !myTeamIds.has(pr.id))
  
  // Extract unique values for filters
  const repositories = [...new Set(allItems.map((p) => p.repository))].sort()
  const reviewers = [...new Set(allItems.flatMap((p) => p.requestedReviewers))].sort()
  const teams = [...new Set(allItems.flatMap((p) => p.requestedTeams))].sort()
  
  void reply.send({ 
    prs: allItems,
    myReview: myReviewItems,
    myTeam: myTeamItems,
    other: remainingOther,
    total: allItems.length,
    myReviewCount: myReviewItems.length,
    myTeamCount: myTeamItems.length,
    userTeams,
    filters: {
      repositories,
      reviewers,
      teams,
    }
  })
}

function mapToListItem(state: ReturnType<typeof getPRState>): PRListItem {
  const pr = state!.pr
  const review = getReviewState(pr.id)

  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    author: pr.author.login,
    authorAvatar: pr.author.avatar_url,
    repository: pr.repository.fullName,
    updatedAt: pr.updatedAt,
    reviewStatus: mapReviewStatus(state!.status, review?.status),
    hasNewActivity: state!.status === 'new',
    needsMyReview: state!.needsMyReview,
    htmlUrl: pr.htmlUrl,
    requestedReviewers: pr.requestedReviewers.map((r) => r.login),
    requestedTeams: pr.requestedTeams.map((t) => t.slug),
  }
}

type PRStatus = 'pending' | 'reviewing' | 'reviewed'
type StateStatus = 'new' | 'seen' | 'reviewing' | 'reviewed' | 'dismissed'
type ReviewStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | undefined

function mapReviewStatus(prStatus: StateStatus, reviewStatus: ReviewStatus): PRStatus {
  if (reviewStatus === 'in_progress') return 'reviewing'
  if (reviewStatus === 'completed' || prStatus === 'reviewed') return 'reviewed'
  return 'pending'
}

interface PRParams {
  id: string
}

async function handleGetPR(
  request: FastifyRequest<{ Params: PRParams }>,
  reply: FastifyReply
): Promise<void> {
  const { id } = request.params
  const state = getPRState(decodeURIComponent(id))

  if (!state) {
    void reply.status(404).send({ error: 'PR not found' })
    return
  }

  const details = await fetchPRDetails(state.pr)
  void reply.send(details)
}

async function fetchPRDetails(
  pr: NonNullable<ReturnType<typeof getPRState>>['pr']
): Promise<PRWithDetails> {
  if (!context.client) {
    return createBasicDetails(pr)
  }

  const { owner, name } = pr.repository
  const [files, diff, checks] = await Promise.all([
    fetchPRFiles(context.client, owner, name, pr.number),
    fetchPRDiff(context.client, owner, name, pr.number),
    fetchPRChecks(context.client, owner, name, pr.head.sha),
  ])

  return { ...pr, files, diff, checks }
}

function createBasicDetails(pr: PullRequest): PRWithDetails {
  return { ...pr, files: [], diff: '', checks: [] }
}

function handleMarkSeen(
  request: FastifyRequest<{ Params: PRParams }>,
  reply: FastifyReply
): void {
  const { id } = request.params
  updatePRStatus(decodeURIComponent(id), 'seen')
  void reply.send({ success: true })
}

function handleDismiss(
  request: FastifyRequest<{ Params: PRParams }>,
  reply: FastifyReply
): void {
  const { id } = request.params
  updatePRStatus(decodeURIComponent(id), 'dismissed')
  void reply.send({ success: true })
}

function handleMarkReviewed(
  request: FastifyRequest<{ Params: PRParams }>,
  reply: FastifyReply
): void {
  const { id } = request.params
  updatePRStatus(decodeURIComponent(id), 'reviewed')
  void reply.send({ success: true })
}
