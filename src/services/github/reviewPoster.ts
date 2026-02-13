/** Review posting service - formats and posts reviews to GitHub */

import type { GitHubClient } from './client.js'
import type { CreateReviewRequest, GitHubReview, GitHubReviewComment } from '../../types/github.js'
import type { PullRequest } from '../../types/pr.js'
import type {
  AIReviewOutput,
  ReviewFormatOptions,
  ReviewVerdict,
  ReviewIssue,
  PostedReview,
  InlineCommentState,
} from '../../types/review.js'
import { info } from '../../utils/logger.js'

export interface PostReviewOptions {
  review: AIReviewOutput
  action: ReviewVerdict
  formatOptions: ReviewFormatOptions
  editedBody?: string
  inlineComments?: InlineCommentState[]
  selectedIndices?: number[]
}

export async function postReviewToGitHub(
  client: GitHubClient,
  pr: PullRequest,
  review: AIReviewOutput,
  action: ReviewVerdict,
  options: ReviewFormatOptions,
  editedBody?: string,
  inlineComments?: InlineCommentState[],
  selectedIndices?: number[]
): Promise<PostedReview> {
  const event = mapVerdictToEvent(action)

  // Build inline comments for GitHub
  const comments = buildGitHubComments(inlineComments, selectedIndices)

  // Build body, including invalid comments that can't be posted inline
  const invalidComments = getInvalidComments(inlineComments, selectedIndices)
  const body = buildReviewBody(review, options, editedBody, invalidComments)

  info(`Posting review to PR #${pr.number}`, {
    action,
    repo: pr.repository.fullName,
    inlineComments: comments.length,
    invalidComments: invalidComments.length,
  })

  const request: CreateReviewRequest = { body, event }
  if (comments.length > 0) request.comments = comments

  const response = await client.post<GitHubReview>(
    `/repos/${pr.repository.owner}/${pr.repository.name}/pulls/${pr.number}/reviews`,
    request
  )

  return {
    id: response.id,
    htmlUrl: response.html_url,
    state: response.state,
    postedAt: new Date(response.submitted_at),
  }
}

function buildGitHubComments(
  inlineComments?: InlineCommentState[],
  selectedIndices?: number[]
): GitHubReviewComment[] {
  if (!inlineComments || !selectedIndices) return []

  return inlineComments
    .filter((c, i) => c.isValid && selectedIndices.includes(i))
    .map((c) => ({
      path: c.file,
      line: c.actualLine,
      side: 'RIGHT' as const,
      body: formatInlineComment(c.issue),
    }))
}

function getInvalidComments(
  inlineComments?: InlineCommentState[],
  selectedIndices?: number[]
): InlineCommentState[] {
  if (!inlineComments || !selectedIndices) return []

  return inlineComments.filter((c, i) => !c.isValid && selectedIndices.includes(i))
}

function buildReviewBody(
  review: AIReviewOutput,
  options: ReviewFormatOptions,
  editedBody?: string,
  invalidComments?: InlineCommentState[]
): string {
  let body = editedBody ?? formatReviewBody(review, options)

  // Append invalid comments that couldn't be posted inline
  if (invalidComments && invalidComments.length > 0) {
    body += '\n\n---\n**Additional comments (could not be posted inline):**\n'
    invalidComments.forEach((c) => {
      const loc = `\`${c.file}:${c.requestedLine}\``
      body += `\n- ${loc}: ${c.issue.message}`
      if (c.warning) body += ` *(${c.warning})*`
    })
  }

  return body
}

function mapVerdictToEvent(verdict: ReviewVerdict): CreateReviewRequest['event'] {
  const mapping: Record<ReviewVerdict, CreateReviewRequest['event']> = {
    approve: 'APPROVE',
    request_changes: 'REQUEST_CHANGES',
    comment: 'COMMENT',
  }
  return mapping[verdict]
}

function formatInlineComment(issue: ReviewIssue): string {
  const emoji = getSeverityEmoji(issue.severity)
  const label = getSeverityLabel(issue.severity)
  let body = `${emoji} **${label}**: ${issue.message}`

  if (issue.suggestion) {
    body += `\n\n**Suggestion:**\n${issue.suggestion}`
  }

  return body
}

function getSeverityEmoji(severity: ReviewIssue['severity']): string {
  const map = { critical: '🔴', warning: '🟠', info: '🟡' }
  return map[severity]
}

function getSeverityLabel(severity: ReviewIssue['severity']): string {
  const map = { critical: 'Critical', warning: 'Warning', info: 'Info' }
  return map[severity]
}

export function formatReviewBody(
  review: AIReviewOutput,
  options: ReviewFormatOptions
): string {
  switch (options.style) {
    case 'minimal':
      return formatMinimalReview(review, options)
    case 'detailed':
      return formatDetailedReview(review, options)
    default:
      return formatStandardReview(review, options)
  }
}

function formatMinimalReview(review: AIReviewOutput, options: ReviewFormatOptions): string {
  const parts = [review.summary]

  if (review.issues.length > 0) {
    parts.push('\n**Issues:**')
    review.issues.forEach((i) => {
      const loc = i.file ? `\`${i.file}${i.line ? `:${i.line}` : ''}\`` : ''
      parts.push(`- ${loc} ${i.message}`)
    })
  }

  if (review.suggestions.length > 0) {
    parts.push('\n**Suggestions:**')
    review.suggestions.forEach((s) => parts.push(`- ${s.message}`))
  }

  return addAttribution(parts.join('\n'), options)
}

function formatStandardReview(review: AIReviewOutput, options: ReviewFormatOptions): string {
  const sections = ['## Code Review\n', `### Summary\n${review.summary}\n`]

  if (review.issues.length > 0) {
    sections.push('### Issues\n' + formatIssuesBySeverity(review.issues))
  }

  if (review.suggestions.length > 0) {
    sections.push('### Suggestions\n')
    review.suggestions.forEach((s) => sections.push(`- ${s.message}`))
  }

  sections.push('\n---\n' + formatVerdict(review.verdict))

  return addAttribution(sections.join('\n'), options)
}

function formatDetailedReview(review: AIReviewOutput, options: ReviewFormatOptions): string {
  // Detailed is similar to standard but with more verbose formatting
  return formatStandardReview(review, options)
}

function formatIssuesBySeverity(issues: ReviewIssue[]): string {
  const critical = issues.filter((i) => i.severity === 'critical')
  const warning = issues.filter((i) => i.severity === 'warning')
  const infoIssues = issues.filter((i) => i.severity === 'info')

  const parts: string[] = []

  if (critical.length > 0) {
    parts.push(`**🔴 Critical (${critical.length})**\n`)
    critical.forEach((i) => parts.push(formatIssueItem(i)))
  }

  if (warning.length > 0) {
    parts.push(`\n**🟠 Needs Attention (${warning.length})**\n`)
    warning.forEach((i) => parts.push(formatIssueItem(i)))
  }

  if (infoIssues.length > 0) {
    parts.push(`\n**🟡 Info (${infoIssues.length})**\n`)
    infoIssues.forEach((i) => parts.push(formatIssueItem(i)))
  }

  return parts.join('')
}

function formatIssueItem(issue: ReviewIssue): string {
  const loc = issue.file ? `\`${issue.file}${issue.line ? `:${issue.line}` : ''}\`` : ''
  return `- ${loc} - ${issue.message}\n`
}

function formatVerdict(verdict: ReviewVerdict): string {
  const map: Record<ReviewVerdict, string> = {
    approve: '**Verdict:** ✅ Looks good to merge!',
    request_changes: '**Verdict:** ⚠️ Please address the issues above.',
    comment: '**Verdict:** 💬 Review complete.',
  }
  return map[verdict]
}

function addAttribution(body: string, options: ReviewFormatOptions): string {
  let result = body

  if (options.attribution === 'subtle') {
    result += '\n\n---\n*Assisted by AI review*'
  } else if (options.attribution === 'full') {
    result += '\n\n---\n*This review was assisted by OpenCode AI*'
  }

  if (options.signature) {
    result += `\n\n${options.signature}`
  }

  return result
}
