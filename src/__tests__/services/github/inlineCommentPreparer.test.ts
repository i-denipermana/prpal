/** Tests for inline comment preparer */

import { describe, it, expect } from 'vitest'
import {
  prepareInlineComments,
  groupCommentsByFile,
  getFilesWithComments,
} from '../../../services/github/inlineCommentPreparer.js'
import type { PRFile } from '../../../types/pr.js'
import type { ReviewIssue } from '../../../types/review.js'

describe('inlineCommentPreparer', () => {
  const samplePatch = `@@ -10,6 +10,8 @@ function hello() {
   const a = 1;
   const b = 2;
+  const c = 3;
+  const d = 4;
   return a + b;
 }`

  const createFile = (filename: string, patch?: string): PRFile => ({
    filename,
    status: 'modified',
    additions: 2,
    deletions: 0,
    patch,
  })

  const createIssue = (
    file: string | undefined,
    line: number | undefined,
    message: string
  ): ReviewIssue => ({
    severity: 'warning',
    message,
    file,
    line,
  })

  describe('prepareInlineComments', () => {
    it('returns empty array for empty issues', () => {
      const result = prepareInlineComments([], [])
      expect(result).toEqual([])
    })

    it('skips issues without file', () => {
      const issues = [createIssue(undefined, 10, 'Issue without file')]
      const files = [createFile('src/test.ts', samplePatch)]

      const result = prepareInlineComments(issues, files)

      expect(result).toHaveLength(0)
    })

    it('skips issues without line', () => {
      const issues = [createIssue('src/test.ts', undefined, 'Issue without line')]
      const files = [createFile('src/test.ts', samplePatch)]

      const result = prepareInlineComments(issues, files)

      expect(result).toHaveLength(0)
    })

    it('creates invalid comment for file not in PR', () => {
      const issues = [createIssue('src/missing.ts', 10, 'Issue for missing file')]
      const files = [createFile('src/test.ts', samplePatch)]

      const result = prepareInlineComments(issues, files)

      expect(result).toHaveLength(1)
      expect(result[0].isValid).toBe(false)
      expect(result[0].warning).toContain('not in this PR')
      expect(result[0].selected).toBe(false)
    })

    it('creates invalid comment for binary file', () => {
      const issues = [createIssue('image.png', 10, 'Issue for binary file')]
      const files = [createFile('image.png', undefined)] // No patch = binary

      const result = prepareInlineComments(issues, files)

      expect(result).toHaveLength(1)
      expect(result[0].isValid).toBe(false)
      expect(result[0].warning).toContain('Binary file')
      expect(result[0].selected).toBe(false)
    })

    it('creates valid comment for valid line in diff', () => {
      const issues = [createIssue('src/test.ts', 12, 'Valid issue')]
      const files = [createFile('src/test.ts', samplePatch)]

      const result = prepareInlineComments(issues, files)

      expect(result).toHaveLength(1)
      expect(result[0].isValid).toBe(true)
      expect(result[0].actualLine).toBe(12)
      expect(result[0].selected).toBe(true)
    })

    it('adjusts line number when not in diff', () => {
      // Line 16 is not in the diff, should adjust to closest valid line
      const issues = [createIssue('src/test.ts', 16, 'Issue on invalid line')]
      const files = [createFile('src/test.ts', samplePatch)]

      const result = prepareInlineComments(issues, files)

      expect(result).toHaveLength(1)
      expect(result[0].requestedLine).toBe(16)
      expect(result[0].actualLine).toBeLessThanOrEqual(16)
      expect(result[0].warning).toBeDefined()
    })

    it('preserves issue index', () => {
      const issues = [
        createIssue('src/test.ts', 12, 'First issue'),
        createIssue('src/test.ts', 13, 'Second issue'),
      ]
      const files = [createFile('src/test.ts', samplePatch)]

      const result = prepareInlineComments(issues, files)

      expect(result).toHaveLength(2)
      expect(result[0].issueIndex).toBe(0)
      expect(result[1].issueIndex).toBe(1)
    })

    it('handles multiple files', () => {
      const issues = [
        createIssue('src/a.ts', 12, 'Issue in file A'),
        createIssue('src/b.ts', 12, 'Issue in file B'),
      ]
      const files = [createFile('src/a.ts', samplePatch), createFile('src/b.ts', samplePatch)]

      const result = prepareInlineComments(issues, files)

      expect(result).toHaveLength(2)
      expect(result[0].file).toBe('src/a.ts')
      expect(result[1].file).toBe('src/b.ts')
    })
  })

  describe('groupCommentsByFile', () => {
    it('returns empty map for empty comments', () => {
      const result = groupCommentsByFile([])
      expect(result.size).toBe(0)
    })

    it('groups comments by file', () => {
      const issues = [
        createIssue('src/a.ts', 12, 'Issue 1 in A'),
        createIssue('src/a.ts', 13, 'Issue 2 in A'),
        createIssue('src/b.ts', 10, 'Issue 1 in B'),
      ]
      const files = [createFile('src/a.ts', samplePatch), createFile('src/b.ts', samplePatch)]

      const comments = prepareInlineComments(issues, files)
      const grouped = groupCommentsByFile(comments)

      expect(grouped.size).toBe(2)
      expect(grouped.get('src/a.ts')).toHaveLength(2)
      expect(grouped.get('src/b.ts')).toHaveLength(1)
    })
  })

  describe('getFilesWithComments', () => {
    it('returns empty set for empty comments', () => {
      const result = getFilesWithComments([])
      expect(result.size).toBe(0)
    })

    it('returns unique file names', () => {
      const issues = [
        createIssue('src/a.ts', 12, 'Issue 1'),
        createIssue('src/a.ts', 13, 'Issue 2'),
        createIssue('src/b.ts', 10, 'Issue 3'),
      ]
      const files = [createFile('src/a.ts', samplePatch), createFile('src/b.ts', samplePatch)]

      const comments = prepareInlineComments(issues, files)
      const filesWithComments = getFilesWithComments(comments)

      expect(filesWithComments.size).toBe(2)
      expect(filesWithComments.has('src/a.ts')).toBe(true)
      expect(filesWithComments.has('src/b.ts')).toBe(true)
    })
  })
})
