/** Tests for PR review filtering */

import { describe, it, expect } from 'vitest'
import { filterPRsForReview } from '../../../services/github/reviewFilter.js'
import type { PullRequest } from '../../../types/pr.js'
import type { GitHubUser, GitHubTeam } from '../../../types/github.js'
import type { UserTeams } from '../../../services/github/teamDetector.js'

const createMockUser = (login: string): GitHubUser => ({
  login,
  id: 1,
  avatar_url: 'https://example.com/avatar.png',
  html_url: `https://github.com/${login}`,
})

const createMockTeam = (slug: string): GitHubTeam => ({
  id: 1,
  slug,
  name: slug,
  description: null,
  permission: 'push',
  html_url: `https://github.com/orgs/org/teams/${slug}`,
  organization: { login: 'org', id: 1 },
})

const createMockPR = (overrides: Partial<PullRequest> = {}): PullRequest => ({
  id: 'owner/repo#1',
  number: 1,
  title: 'Test PR',
  body: 'Test body',
  author: createMockUser('author'),
  repository: { owner: 'owner', name: 'repo', fullName: 'owner/repo' },
  htmlUrl: 'https://github.com/owner/repo/pull/1',
  state: 'open',
  draft: false,
  head: { ref: 'feature', sha: 'abc123' },
  base: { ref: 'main', sha: 'def456' },
  requestedReviewers: [],
  requestedTeams: [],
  labels: [],
  stats: { additions: 10, deletions: 5, changedFiles: 2, comments: 0, reviewComments: 0 },
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const createUserTeams = (teamSlugs: string[] = []): UserTeams => ({
  teams: teamSlugs.map(createMockTeam),
  teamSlugs,
})

describe('filterPRsForReview', () => {
  const username = 'testuser'

  it('should include PRs where user is a requested reviewer', () => {
    const prs = [
      createMockPR({
        requestedReviewers: [createMockUser('testuser')],
      }),
    ]

    const result = filterPRsForReview(prs, { username, userTeams: createUserTeams() })

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe('owner/repo#1')
  })

  it('should include PRs where user team is requested', () => {
    const prs = [
      createMockPR({
        requestedTeams: [createMockTeam('frontend-team')],
      }),
    ]

    const result = filterPRsForReview(prs, {
      username,
      userTeams: createUserTeams(['frontend-team']),
    })

    expect(result).toHaveLength(1)
  })

  it('should exclude PRs authored by the user', () => {
    const prs = [
      createMockPR({
        author: createMockUser('testuser'),
        requestedReviewers: [createMockUser('testuser')],
      }),
    ]

    const result = filterPRsForReview(prs, { username, userTeams: createUserTeams() })

    expect(result).toHaveLength(0)
  })

  it('should exclude draft PRs', () => {
    const prs = [
      createMockPR({
        draft: true,
        requestedReviewers: [createMockUser('testuser')],
      }),
    ]

    const result = filterPRsForReview(prs, { username, userTeams: createUserTeams() })

    expect(result).toHaveLength(0)
  })

  it('should exclude PRs where user is not requested', () => {
    const prs = [
      createMockPR({
        requestedReviewers: [createMockUser('otheruser')],
      }),
    ]

    const result = filterPRsForReview(prs, { username, userTeams: createUserTeams() })

    expect(result).toHaveLength(0)
  })

  it('should handle empty PR list', () => {
    const result = filterPRsForReview([], { username, userTeams: createUserTeams() })

    expect(result).toHaveLength(0)
  })

  it('should filter multiple PRs correctly', () => {
    const prs = [
      createMockPR({
        id: 'repo#1',
        requestedReviewers: [createMockUser('testuser')],
      }),
      createMockPR({
        id: 'repo#2',
        requestedReviewers: [createMockUser('otheruser')],
      }),
      createMockPR({
        id: 'repo#3',
        requestedTeams: [createMockTeam('my-team')],
      }),
    ]

    const result = filterPRsForReview(prs, {
      username,
      userTeams: createUserTeams(['my-team']),
    })

    expect(result).toHaveLength(2)
    expect(result.map((p) => p.id)).toEqual(['repo#1', 'repo#3'])
  })
})
