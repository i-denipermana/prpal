/** Review filter - filters PRs requesting review from user or team */

import type { PullRequest } from '../../types/pr.js'
import type { UserTeams } from './teamDetector.js'
import { debug } from '../../utils/logger.js'

export interface FilterConfig {
  username: string
  userTeams: UserTeams
  showAllPRs?: boolean // If true, show all PRs not authored by user
}

export function filterPRsForReview(
  prs: PullRequest[],
  config: FilterConfig
): PullRequest[] {
  const filtered = prs.filter((pr) => shouldShowPR(pr, config))
  debug(`Filtered ${filtered.length} PRs for review from ${prs.length} total`)
  return filtered
}

function shouldShowPR(pr: PullRequest, config: FilterConfig): boolean {
  // Never show your own PRs or drafts
  if (isAuthor(pr, config.username)) return false
  if (pr.draft) return false

  // If showAllPRs is enabled, show all non-draft PRs from others
  if (config.showAllPRs) return true

  // Otherwise, only show PRs requesting review from user/team
  return isUserRequested(pr, config.username) || isTeamRequested(pr, config.userTeams)
}

export function isReviewRequestedFromUser(
  pr: PullRequest,
  config: FilterConfig
): boolean {
  return shouldShowPR(pr, config)
}

function isAuthor(pr: PullRequest, username: string): boolean {
  return pr.author.login.toLowerCase() === username.toLowerCase()
}

function isUserRequested(pr: PullRequest, username: string): boolean {
  const requestedLogins = pr.requestedReviewers.map((r) => r.login.toLowerCase())
  return requestedLogins.includes(username.toLowerCase())
}

function isTeamRequested(pr: PullRequest, userTeams: UserTeams): boolean {
  const requestedSlugs = pr.requestedTeams.map((t) => t.slug)
  return requestedSlugs.some((slug) => userTeams.teamSlugs.includes(slug))
}

export function groupPRsByRepo(
  prs: PullRequest[]
): Map<string, PullRequest[]> {
  const grouped = new Map<string, PullRequest[]>()

  for (const pr of prs) {
    const key = pr.repository.fullName
    const existing = grouped.get(key) ?? []
    grouped.set(key, [...existing, pr])
  }

  return grouped
}

export function sortPRsByDate(prs: PullRequest[]): PullRequest[] {
  return [...prs].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
}
