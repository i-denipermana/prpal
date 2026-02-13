/** GitHub API type definitions */

export interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  html_url: string
}

export interface GitHubTeam {
  id: number
  name: string
  slug: string
  description: string | null
  permission: string
  html_url: string
  organization: {
    login: string
    id: number
  }
}

export interface GitHubRepository {
  id: number
  name: string
  full_name: string
  owner: GitHubUser
  html_url: string
  description: string | null
  private: boolean
  default_branch: string
}

export interface GitHubLabel {
  id: number
  name: string
  color: string
  description: string | null
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  draft: boolean
  html_url: string
  user: GitHubUser
  head: {
    ref: string
    sha: string
    repo: GitHubRepository
  }
  base: {
    ref: string
    sha: string
    repo: GitHubRepository
  }
  labels: GitHubLabel[]
  requested_reviewers: GitHubUser[]
  requested_teams: GitHubTeam[]
  created_at: string
  updated_at: string
  merged_at: string | null
  comments: number
  review_comments: number
  additions: number
  deletions: number
  changed_files: number
}

export interface GitHubReviewRequest {
  users: GitHubUser[]
  teams: GitHubTeam[]
}

export interface GitHubFile {
  sha: string
  filename: string
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged'
  additions: number
  deletions: number
  changes: number
  patch?: string
}

export interface GitHubCheckRun {
  id: number
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped' | 'timed_out' | null
  html_url: string
}

export interface GitHubReview {
  id: number
  user: GitHubUser
  body: string
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING'
  html_url: string
  submitted_at: string
}

export interface GitHubReviewComment {
  path: string
  line?: number
  side?: 'LEFT' | 'RIGHT'
  body: string
}

export interface CreateReviewRequest {
  body: string
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'
  comments?: GitHubReviewComment[]
}

export interface GitHubRateLimit {
  limit: number
  remaining: number
  reset: number
  used: number
}
