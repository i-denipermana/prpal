/** Inline comment preparer - validates AI issues against diff and prepares InlineCommentState[] */

import type { PRFile } from '../../types/pr.js'
import type { ReviewIssue, InlineCommentState } from '../../types/review.js'
import { validateLine } from './diffParser.js'

/** Prepare inline comments from AI review issues */
export function prepareInlineComments(
  issues: ReviewIssue[],
  files: PRFile[]
): InlineCommentState[] {
  const fileMap = new Map(files.map((f) => [f.filename, f]))
  const comments: InlineCommentState[] = []

  issues.forEach((issue, index) => {
    const comment = prepareComment(issue, index, fileMap)
    if (comment) comments.push(comment)
  })

  return comments
}

function prepareComment(
  issue: ReviewIssue,
  issueIndex: number,
  fileMap: Map<string, PRFile>
): InlineCommentState | null {
  // Skip issues without file or line
  if (!issue.file || !issue.line) return null

  const file = fileMap.get(issue.file)

  // File not found in PR
  if (!file) {
    return createInvalidComment(issue, issueIndex, 'File not in this PR')
  }

  // Binary file or no patch
  if (!file.patch) {
    return createInvalidComment(issue, issueIndex, 'Binary file, no diff available')
  }

  // Validate line against diff
  const validation = validateLine(issue.line, file.patch)

  return {
    issue,
    file: issue.file,
    requestedLine: issue.line,
    actualLine: validation.actualLine,
    isValid: validation.isValid,
    warning: validation.warning,
    selected: validation.isValid, // Only pre-select valid comments
    issueIndex,
  }
}

function createInvalidComment(
  issue: ReviewIssue,
  issueIndex: number,
  warning: string
): InlineCommentState {
  return {
    issue,
    file: issue.file!,
    requestedLine: issue.line!,
    actualLine: issue.line!,
    isValid: false,
    warning,
    selected: false,
    issueIndex,
  }
}

/** Get comments grouped by file for UI rendering */
export function groupCommentsByFile(
  comments: InlineCommentState[]
): Map<string, InlineCommentState[]> {
  const grouped = new Map<string, InlineCommentState[]>()

  for (const comment of comments) {
    const existing = grouped.get(comment.file) ?? []
    existing.push(comment)
    grouped.set(comment.file, existing)
  }

  return grouped
}

/** Get files that have inline comments (for auto-expand) */
export function getFilesWithComments(comments: InlineCommentState[]): Set<string> {
  return new Set(comments.map((c) => c.file))
}
