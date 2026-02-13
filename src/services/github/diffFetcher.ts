/** Diff fetching service - fetches PR diffs and file changes */

import type { GitHubClient } from './client.js'
import type { GitHubFile, GitHubCheckRun } from '../../types/github.js'
import type { PRFile, PRCheck } from '../../types/pr.js'
import { debug } from '../../utils/logger.js'

export async function fetchPRDiff(
  client: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number
): Promise<string> {
  debug('Fetching PR diff', { owner, repo, prNumber })

  // GitHub returns diff when Accept header is set to diff format
  // We'll fetch files with patches instead for more control
  const files = await fetchPRFiles(client, owner, repo, prNumber)
  return formatFilesAsDiff(files)
}

export async function fetchPRFiles(
  client: GitHubClient,
  owner: string,
  repo: string,
  prNumber: number
): Promise<PRFile[]> {
  debug('Fetching PR files', { owner, repo, prNumber })

  const files = await client.get<GitHubFile[]>(
    `/repos/${owner}/${repo}/pulls/${prNumber}/files`
  )

  return files.map(mapGitHubFileToPRFile)
}

export async function fetchPRChecks(
  client: GitHubClient,
  owner: string,
  repo: string,
  ref: string
): Promise<PRCheck[]> {
  debug('Fetching PR checks', { owner, repo, ref })

  const response = await client.get<{ check_runs: GitHubCheckRun[] }>(
    `/repos/${owner}/${repo}/commits/${ref}/check-runs`
  )

  return response.check_runs.map(mapGitHubCheckToPRCheck)
}

function mapGitHubFileToPRFile(file: GitHubFile): PRFile {
  return {
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch,
  }
}

function mapGitHubCheckToPRCheck(check: GitHubCheckRun): PRCheck {
  return {
    name: check.name,
    status: check.status,
    conclusion: check.conclusion,
  }
}

function formatFilesAsDiff(files: PRFile[]): string {
  return files
    .filter((f) => f.patch)
    .map((f) => `--- a/${f.filename}\n+++ b/${f.filename}\n${f.patch}`)
    .join('\n\n')
}
