import { describe, it, expect } from 'vitest'
import {
  parseDiffPatch,
  getValidLineNumbers,
  findClosestLineBefore,
  validateLine,
} from '../../../services/github/diffParser.js'

describe('diffParser', () => {
  const samplePatch = `@@ -10,6 +10,8 @@ function hello() {
   const a = 1;
   const b = 2;
+  const c = 3;
+  const d = 4;
   return a + b;
 }
@@ -20,4 +22,5 @@ function world() {
   console.log('hello');
+  console.log('world');
   return true;
 }`

  describe('parseDiffPatch', () => {
    it('returns empty array for empty patch', () => {
      expect(parseDiffPatch('')).toEqual([])
    })

    it('parses hunk headers correctly', () => {
      const result = parseDiffPatch(samplePatch)
      const hunks = result.filter((l) => l.type === 'hunk')
      expect(hunks).toHaveLength(2)
      expect(hunks[0].lineNumber).toBe(10)
      expect(hunks[1].lineNumber).toBe(22)
    })

    it('parses added lines correctly', () => {
      const result = parseDiffPatch(samplePatch)
      const added = result.filter((l) => l.type === 'add')
      expect(added).toHaveLength(3)
      // Line numbers: 12, 13 from first hunk, 23 from second hunk (after context at 22)
      expect(added.map((l) => l.lineNumber)).toEqual([12, 13, 23])
    })

    it('parses context lines correctly', () => {
      const result = parseDiffPatch(samplePatch)
      const context = result.filter((l) => l.type === 'context')
      expect(context.length).toBeGreaterThan(0)
    })
  })

  describe('getValidLineNumbers', () => {
    it('returns empty array for empty patch', () => {
      expect(getValidLineNumbers('')).toEqual([])
    })

    it('returns only add and context lines', () => {
      const result = getValidLineNumbers(samplePatch)
      // Should include context lines (10, 11, 14, 15, 22, 23, 25) and added lines (12, 13, 24)
      expect(result).toContain(10) // context
      expect(result).toContain(12) // add
      expect(result).toContain(13) // add
      expect(result).toContain(23) // add
    })

    it('excludes deleted lines', () => {
      const patchWithDelete = `@@ -1,3 +1,2 @@
 line1
-deleted
 line2`
      const result = getValidLineNumbers(patchWithDelete)
      // Should have line 1 (context), line 2 (context)
      expect(result).toEqual([1, 2])
    })
  })

  describe('findClosestLineBefore', () => {
    const validLines = [10, 12, 15, 20, 25]

    it('returns exact match when line exists', () => {
      expect(findClosestLineBefore(15, validLines)).toBe(15)
    })

    it('returns closest line before when line does not exist', () => {
      expect(findClosestLineBefore(17, validLines)).toBe(15)
      expect(findClosestLineBefore(14, validLines)).toBe(12)
    })

    it('returns null when no line exists before', () => {
      expect(findClosestLineBefore(5, validLines)).toBeNull()
    })

    it('returns the max when multiple lines are before', () => {
      expect(findClosestLineBefore(100, validLines)).toBe(25)
    })
  })

  describe('validateLine', () => {
    it('returns isValid true for exact match', () => {
      const result = validateLine(12, samplePatch)
      expect(result.isValid).toBe(true)
      expect(result.actualLine).toBe(12)
      expect(result.warning).toBeUndefined()
    })

    it('adjusts to closest line before with warning', () => {
      // Line 16 doesn't exist, should adjust to line 15 (context after additions)
      const result = validateLine(16, samplePatch)
      expect(result.isValid).toBe(true)
      expect(result.actualLine).toBeLessThanOrEqual(16)
      expect(result.warning).toBeDefined()
      expect(result.warning).toContain('not in diff')
    })

    it('returns isValid false when no earlier line available', () => {
      const smallPatch = `@@ -50,2 +50,3 @@
 line50
+added
 line51`
      const result = validateLine(10, smallPatch)
      expect(result.isValid).toBe(false)
      expect(result.warning).toContain('no earlier line')
    })
  })
})
