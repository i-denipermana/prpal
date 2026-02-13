/** Pull Request domain types */

import type { GitHubFile, GitHubCheckRun, GitHubUser, GitHubTeam } from './github.js'

export interface PullRequest {
  id: string
  number: number
  title: string
  body: string | null
  author: GitHubUser
  repository: {
    owner: string
    name: string
    fullName: string
  }
  htmlUrl: string
  state: 'open' | 'closed'
  draft: boolean
  head: {
    ref: string
    sha: string
  }
  base: {
    ref: string
    sha: string
  }
  requestedReviewers: GitHubUser[]
  requestedTeams: GitHubTeam[]
  labels: string[]
  stats: {
    additions: number
    deletions: number
    changedFiles: number
    comments: number
    reviewComments: number
  }
  createdAt: Date
  updatedAt: Date
}

export interface PRWithDetails extends PullRequest {
  files: PRFile[]
  checks: PRCheck[]
  diff: string
}

export interface PRFile {
  filename: string
  status: GitHubFile['status']
  additions: number
  deletions: number
  patch?: string
}

export interface PRCheck {
  name: string
  status: GitHubCheckRun['status']
  conclusion: GitHubCheckRun['conclusion']
}

export interface PRListItem {
  id: string
  number: number
  title: string
  author: string
  authorAvatar: string
  repository: string
  updatedAt: Date
  reviewStatus: 'pending' | 'reviewing' | 'reviewed'
  hasNewActivity: boolean
  needsMyReview: boolean
  htmlUrl: string
  requestedReviewers: string[]
  requestedTeams: string[]
}

export type PRStatus = 'new' | 'seen' | 'reviewing' | 'reviewed' | 'dismissed'

export interface PRState {
  pr: PullRequest
  status: PRStatus
  needsMyReview: boolean
  seenAt?: Date
  reviewStartedAt?: Date
  reviewCompletedAt?: Date
}

export function mapGitHubPRToPullRequest(
  ghPR: import('./github.js').GitHubPullRequest
): PullRequest {
  return {
    id: `${ghPR.base.repo.full_name}#${ghPR.number}`,
    number: ghPR.number,
    title: ghPR.title,
    body: ghPR.body,
    author: ghPR.user,
    repository: {
      owner: ghPR.base.repo.owner.login,
      name: ghPR.base.repo.name,
      fullName: ghPR.base.repo.full_name,
    },
    htmlUrl: ghPR.html_url,
    state: ghPR.state,
    draft: ghPR.draft,
    head: { ref: ghPR.head.ref, sha: ghPR.head.sha },
    base: { ref: ghPR.base.ref, sha: ghPR.base.sha },
    requestedReviewers: ghPR.requested_reviewers,
    requestedTeams: ghPR.requested_teams,
    labels: ghPR.labels.map((l) => l.name),
    stats: {
      additions: ghPR.additions,
      deletions: ghPR.deletions,
      changedFiles: ghPR.changed_files,
      comments: ghPR.comments,
      reviewComments: ghPR.review_comments,
    },
    createdAt: new Date(ghPR.created_at),
    updatedAt: new Date(ghPR.updated_at),
  }
}
