/** Tests for OpenCode response parser */

import { describe, it, expect } from 'vitest'
import { parseReviewResponse } from '../../../services/opencode/parser.js'

describe('parseReviewResponse', () => {
  it('should parse valid JSON review response', () => {
    const input = JSON.stringify({
      summary: 'Good code with minor issues',
      verdict: 'comment',
      issues: [
        {
          severity: 'warning',
          file: 'src/index.ts',
          line: 10,
          message: 'Consider using const instead of let',
        },
      ],
      suggestions: [
        {
          message: 'Add error handling',
        },
      ],
    })

    const result = parseReviewResponse(input)

    expect(result.summary).toBe('Good code with minor issues')
    expect(result.verdict).toBe('comment')
    expect(result.issues).toHaveLength(1)
    expect(result.issues[0]?.severity).toBe('warning')
    expect(result.suggestions).toHaveLength(1)
  })

  it('should handle response with code blocks', () => {
    const input = `
Here is my analysis:

\`\`\`json
{
  "summary": "Code looks good",
  "verdict": "approve",
  "issues": [],
  "suggestions": []
}
\`\`\`
    `

    const result = parseReviewResponse(input)

    expect(result.summary).toBe('Code looks good')
    expect(result.verdict).toBe('approve')
  })

  it('should extract issues with all fields', () => {
    const input = JSON.stringify({
      summary: 'Review',
      verdict: 'request_changes',
      issues: [
        {
          severity: 'critical',
          file: 'src/auth.ts',
          line: 25,
          endLine: 30,
          message: 'SQL injection vulnerability',
          suggestion: 'Use parameterized queries',
        },
      ],
      suggestions: [],
    })

    const result = parseReviewResponse(input)

    expect(result.issues[0]).toEqual({
      severity: 'critical',
      file: 'src/auth.ts',
      line: 25,
      endLine: 30,
      message: 'SQL injection vulnerability',
      suggestion: 'Use parameterized queries',
    })
  })

  it('should handle empty issues and suggestions', () => {
    const input = JSON.stringify({
      summary: 'LGTM',
      verdict: 'approve',
      issues: [],
      suggestions: [],
    })

    const result = parseReviewResponse(input)

    expect(result.issues).toEqual([])
    expect(result.suggestions).toEqual([])
  })

  it('should include positives when provided', () => {
    const input = JSON.stringify({
      summary: 'Well written',
      verdict: 'approve',
      issues: [],
      suggestions: [],
      positives: ['Good test coverage', 'Clean code structure'],
    })

    const result = parseReviewResponse(input)

    expect(result.positives).toEqual(['Good test coverage', 'Clean code structure'])
  })

  it('should return fallback on invalid JSON', () => {
    const input = 'not valid json'

    const result = parseReviewResponse(input)

    expect(result.summary).toContain('Review completed')
    expect(result.verdict).toBe('comment')
    expect(result.issues).toEqual([])
  })

  it('should handle missing fields with defaults', () => {
    const input = JSON.stringify({
      summary: 'Review',
      // missing verdict, issues, suggestions
    })

    const result = parseReviewResponse(input)

    expect(result.summary).toBe('Review')
    expect(result.verdict).toBe('comment')
    expect(result.issues).toEqual([])
    expect(result.suggestions).toEqual([])
  })

  it('should handle verdict case insensitivity', () => {
    const input = JSON.stringify({
      summary: 'Review',
      verdict: 'APPROVE',
      issues: [],
      suggestions: [],
    })

    const result = parseReviewResponse(input)

    expect(result.verdict).toBe('approve')
  })
})
