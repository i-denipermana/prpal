/** OpenCode response parser */

import type { AIReviewOutput, ReviewIssue, ReviewSuggestion } from '../../types/review.js'
import { warn, info, debug } from '../../utils/logger.js'

export function parseReviewResponse(output: string): AIReviewOutput {
  // First, extract text from OpenCode JSON events if present
  const textContent = extractTextFromEvents(output)
  const contentToParse = textContent || output
  
  info('[Parser] Parsing AI response', { 
    rawLength: output.length,
    extractedLength: contentToParse.length,
    hasEvents: textContent !== null,
  })
  
  // Log the extracted text content for debugging
  if (textContent) {
    info('[Parser] AI Response Text:')
    logMultiline(textContent)
  }
  
  const json = extractJson(contentToParse)
  if (!json) {
    warn('[Parser] Failed to extract JSON from response, using fallback')
    info('[Parser] Raw content preview:', { preview: contentToParse.slice(0, 500) })
    return createFallbackReview(contentToParse)
  }

  // Log the parsed review nicely
  const review = validateAndNormalizeReview(json)
  logParsedReview(review)
  
  return review
}

function logMultiline(text: string): void {
  const lines = text.split('\n')
  for (const line of lines) {
    if (line.trim()) {
      info(`  | ${line}`)
    }
  }
}

function logParsedReview(review: AIReviewOutput): void {
  info('[Parser] ═══════════════════════════════════════════════════════')
  info('[Parser] PARSED REVIEW RESULT')
  info('[Parser] ═══════════════════════════════════════════════════════')
  info(`[Parser] Summary: ${review.summary}`)
  info(`[Parser] Verdict: ${review.verdict.toUpperCase()}`)
  
  if (review.issues.length > 0) {
    info(`[Parser] Issues (${review.issues.length}):`)
    review.issues.forEach((issue, i) => {
      const location = issue.file ? `${issue.file}${issue.line ? ':' + issue.line : ''}` : 'general'
      info(`[Parser]   ${i + 1}. [${issue.severity.toUpperCase()}] ${location}`)
      info(`[Parser]      ${issue.message}`)
      if (issue.suggestion) {
        info(`[Parser]      → ${issue.suggestion}`)
      }
    })
  } else {
    info('[Parser] Issues: None')
  }
  
  if (review.suggestions.length > 0) {
    info(`[Parser] Suggestions (${review.suggestions.length}):`)
    review.suggestions.forEach((sug, i) => {
      const location = sug.file ? `${sug.file}${sug.line ? ':' + sug.line : ''}` : ''
      info(`[Parser]   ${i + 1}. ${sug.message}${location ? ` (${location})` : ''}`)
    })
  }
  
  if (review.positives && review.positives.length > 0) {
    info(`[Parser] Positives (${review.positives.length}):`)
    review.positives.forEach((pos, i) => {
      info(`[Parser]   ${i + 1}. ${pos}`)
    })
  }
  
  info('[Parser] ═══════════════════════════════════════════════════════')
}

function extractTextFromEvents(output: string): string | null {
  // OpenCode outputs JSON events, one per line
  // We need to extract text parts from these events
  const lines = output.split('\n').filter(line => line.trim())
  const textParts: string[] = []
  
  for (const line of lines) {
    try {
      const event = JSON.parse(line)
      // Extract text from text events
      if (event.type === 'text' && event.part?.text) {
        textParts.push(event.part.text)
      }
    } catch {
      // Not a JSON event, might be raw text
      continue
    }
  }
  
  if (textParts.length > 0) {
    debug('[Parser] Extracted text from events', { parts: textParts.length })
    return textParts.join('\n')
  }
  
  return null
}

function extractJson(output: string): unknown | null {
  // Try multiple strategies to extract JSON
  
  // Strategy 1: Look for ```json code block
  const jsonBlockMatch = output.match(/```json\s*([\s\S]*?)```/)
  if (jsonBlockMatch) {
    try {
      return JSON.parse(jsonBlockMatch[1].trim())
    } catch {
      debug('[Parser] Failed to parse json code block')
    }
  }
  
  // Strategy 2: Look for any ``` code block
  const codeBlockMatch = output.match(/```\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim())
    } catch {
      debug('[Parser] Failed to parse generic code block')
    }
  }
  
  // Strategy 3: Try to parse the whole output as JSON
  try {
    return JSON.parse(output.trim())
  } catch {
    debug('[Parser] Failed to parse whole output as JSON')
  }
  
  // Strategy 4: Find JSON object that starts with {"summary"
  const summaryMatch = output.match(/\{\s*"summary"\s*:\s*"[\s\S]*?\}(?=\s*$|\s*```|$)/)
  if (summaryMatch) {
    try {
      return JSON.parse(summaryMatch[0])
    } catch {
      debug('[Parser] Failed to parse summary-based match')
    }
  }
  
  // Strategy 5: Find the first complete JSON object with balanced braces
  const jsonObj = extractBalancedJson(output)
  if (jsonObj) {
    try {
      return JSON.parse(jsonObj)
    } catch {
      debug('[Parser] Failed to parse balanced JSON')
    }
  }
  
  return null
}

function extractBalancedJson(text: string): string | null {
  // Find the first { and extract balanced JSON
  const startIdx = text.indexOf('{')
  if (startIdx === -1) return null
  
  let depth = 0
  let inString = false
  let escaped = false
  
  for (let i = startIdx; i < text.length; i++) {
    const char = text[i]
    
    if (escaped) {
      escaped = false
      continue
    }
    
    if (char === '\\' && inString) {
      escaped = true
      continue
    }
    
    if (char === '"' && !escaped) {
      inString = !inString
      continue
    }
    
    if (inString) continue
    
    if (char === '{') depth++
    if (char === '}') depth--
    
    if (depth === 0) {
      return text.slice(startIdx, i + 1)
    }
  }
  
  return null
}

function validateAndNormalizeReview(data: unknown): AIReviewOutput {
  if (!isObject(data)) {
    return createFallbackReview(JSON.stringify(data))
  }

  const obj = data as Record<string, unknown>

  return {
    summary: getString(obj.summary) || 'Review completed',
    verdict: normalizeVerdict(obj.verdict),
    issues: normalizeIssues(obj.issues),
    suggestions: normalizeSuggestions(obj.suggestions),
    positives: normalizePositives(obj.positives),
  }
}

function normalizeVerdict(value: unknown): AIReviewOutput['verdict'] {
  const str = String(value).toLowerCase()
  if (str.includes('approve')) return 'approve'
  if (str.includes('request') || str.includes('change')) return 'request_changes'
  return 'comment'
}

function normalizeIssues(value: unknown): ReviewIssue[] {
  if (!Array.isArray(value)) return []

  const issues: ReviewIssue[] = []

  for (const item of value) {
    if (!isObject(item)) continue
    const obj = item as Record<string, unknown>

    const issue: ReviewIssue = {
      severity: normalizeSeverity(obj.severity),
      message: getString(obj.message) || 'Issue detected',
    }

    const file = getOptionalString(obj.file)
    if (file) issue.file = file

    const line = getOptionalNumber(obj.line)
    if (line) issue.line = line

    const endLine = getOptionalNumber(obj.endLine)
    if (endLine) issue.endLine = endLine

    const suggestion = getOptionalString(obj.suggestion)
    if (suggestion) issue.suggestion = suggestion

    issues.push(issue)
  }

  return issues
}

function normalizeSuggestions(value: unknown): ReviewSuggestion[] {
  if (!Array.isArray(value)) return []

  return value.map((item) => {
    if (!isObject(item)) {
      return { message: String(item) }
    }
    const obj = item as Record<string, unknown>

    return {
      file: getOptionalString(obj.file),
      line: getOptionalNumber(obj.line),
      message: getString(obj.message) || String(item),
      code: getOptionalString(obj.code),
    }
  })
}

function normalizePositives(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((v) => String(v))
}

function normalizeSeverity(value: unknown): ReviewIssue['severity'] {
  const str = String(value).toLowerCase()
  if (str.includes('critical') || str.includes('error')) return 'critical'
  if (str.includes('warn')) return 'warning'
  return 'info'
}

function createFallbackReview(rawOutput: string): AIReviewOutput {
  return {
    summary: 'Review completed. See raw output for details.',
    verdict: 'comment',
    issues: [],
    suggestions: [{ message: rawOutput.slice(0, 500) }],
  }
}

function isObject(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function getString(val: unknown): string {
  return typeof val === 'string' ? val : ''
}

function getOptionalString(val: unknown): string | undefined {
  return typeof val === 'string' ? val : undefined
}

function getOptionalNumber(val: unknown): number | undefined {
  return typeof val === 'number' ? val : undefined
}
