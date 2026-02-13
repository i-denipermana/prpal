/** PR fetching service - fetches open PRs from organization repos */

import type { GitHubClient } from './client.js'
import type { GitHubPullRequest, GitHubRepository } from '../../types/github.js'
import type { PullRequest } from '../../types/pr.js'
import { mapGitHubPRToPullRequest } from '../../types/pr.js'
import { debug, info } from '../../utils/logger.js'

export interface FetchPRsOptions {
  org: string
  perPage?: number
}

export async function fetchOrgRepos(
  client: GitHubClient,
  org: string
): Promise<GitHubRepository[]> {
  debug('Fetching org repos', { org })
  return client.get<GitHubRepository[]>(`/orgs/${org}/repos`, {
    query: { per_page: 100, sort: 'updated', direction: 'desc' },
  })
}

export async function fetchRepoPRs(
  client: GitHubClient,
  owner: string,
  repo: string
): Promise<GitHubPullRequest[]> {
  debug('Fetching repo PRs', { owner, repo })
  return client.get<GitHubPullRequest[]>(`/repos/${owner}/${repo}/pulls`, {
    query: { state: 'open', per_page: 100 },
  })
}

export async function fetchAllOrgPRs(
  client: GitHubClient,
  options: FetchPRsOptions
): Promise<PullRequest[]> {
  const { org } = options
  info(`Fetching all open PRs from ${org}`)

  const repos = await fetchOrgRepos(client, org)
  const prPromises = repos.map((repo) => fetchRepoPRs(client, org, repo.name))
  const prArrays = await Promise.all(prPromises)
  const allPRs = prArrays.flat()

  info(`Found ${allPRs.length} open PRs across ${repos.length} repos`)

  return allPRs.map(mapGitHubPRToPullRequest)
}

export async function fetchPRDetails(
  client: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPullRequest> {
  debug('Fetching PR details', { owner, repo, prNumber })
  return client.get<GitHubPullRequest>(`/repos/${owner}/${repo}/pulls/${prNumber}`)
}
