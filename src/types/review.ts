/** AI Review types */

export type ReviewSeverity = 'critical' | 'warning' | 'info'
export type ReviewVerdict = 'approve' | 'request_changes' | 'comment'
export type ReviewFocus =
  | 'code-quality'
  | 'security'
  | 'performance'
  | 'best-practices'
  | 'documentation'
  | 'testing'

export interface ReviewIssue {
  severity: ReviewSeverity
  file?: string
  line?: number
  endLine?: number
  message: string
  suggestion?: string
}

export interface ReviewSuggestion {
  file?: string
  line?: number
  message: string
  code?: string
}

export interface AIReviewOutput {
  summary: string
  verdict: ReviewVerdict
  issues: ReviewIssue[]
  suggestions: ReviewSuggestion[]
  positives?: string[]
}

export interface ReviewResult {
  id: string
  prId: string
  prNumber: number
  agentId: string
  output: AIReviewOutput
  rawResponse: string
  createdAt: Date
  duration: number
}

export type ReviewStage = 
  | 'starting'
  | 'fetching_diff'
  | 'analyzing'
  | 'generating'
  | 'parsing'

export interface ReviewState {
  prId: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  stage?: ReviewStage
  progress?: number
  result?: ReviewResult
  error?: string
  startedAt?: Date
  completedAt?: Date
  inlineComments?: InlineCommentState[]
}

export type ReviewStyle = 'minimal' | 'standard' | 'detailed'
export type ReviewAttribution = 'none' | 'subtle' | 'full'

export interface ReviewFormatOptions {
  style: ReviewStyle
  attribution: ReviewAttribution
  signature?: string
}

export interface PostReviewRequest {
  prId: string
  review: AIReviewOutput
  action: ReviewVerdict
  formatOptions: ReviewFormatOptions
  includeInlineComments: boolean
  editedBody?: string
  selectedCommentIndices?: number[]
}

export interface PostedReview {
  id: number
  htmlUrl: string
  state: string
  postedAt: Date
}

/** State for an inline comment prepared from AI review issues */
export interface InlineCommentState {
  issue: ReviewIssue
  file: string
  requestedLine: number
  actualLine: number
  isValid: boolean
  warning?: string
  selected: boolean
  issueIndex: number
}
