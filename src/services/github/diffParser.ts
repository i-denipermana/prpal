/** Diff parser - extracts valid line numbers from diff patches */

export interface DiffLineInfo {
  lineNumber: number
  type: 'add' | 'delete' | 'context' | 'hunk'
}

export interface LineValidation {
  requestedLine: number
  isValid: boolean
  actualLine: number
  warning?: string
}

/** Parse a diff patch and extract line information */
export function parseDiffPatch(patch: string): DiffLineInfo[] {
  if (!patch) return []

  const lines = patch.split('\n')
  const result: DiffLineInfo[] = []
  let newLine = 0

  for (const line of lines) {
    const parsed = parseSingleLine(line, newLine)
    if (parsed) {
      result.push(parsed.info)
      newLine = parsed.nextNewLine
    }
  }

  return result
}

interface ParsedLine {
  info: DiffLineInfo
  nextNewLine: number
}

function parseSingleLine(line: string, currentNewLine: number): ParsedLine | null {
  // Hunk header: @@ -10,6 +20,8 @@
  if (line.startsWith('@@')) {
    const match = line.match(/@@ -\d+,?\d* \+(\d+),?\d* @@/)
    const newStart = match ? parseInt(match[1], 10) : currentNewLine
    return { info: { lineNumber: newStart, type: 'hunk' }, nextNewLine: newStart }
  }

  // Skip file headers
  if (line.startsWith('---') || line.startsWith('+++')) return null
  if (line.startsWith('\\')) return null // "No newline at end of file"

  // Added line
  if (line.startsWith('+')) {
    return {
      info: { lineNumber: currentNewLine, type: 'add' },
      nextNewLine: currentNewLine + 1,
    }
  }

  // Deleted line (doesn't increment new line counter)
  if (line.startsWith('-')) {
    return {
      info: { lineNumber: currentNewLine, type: 'delete' },
      nextNewLine: currentNewLine,
    }
  }

  // Context line
  return {
    info: { lineNumber: currentNewLine, type: 'context' },
    nextNewLine: currentNewLine + 1,
  }
}

/** Get all valid line numbers for inline comments (add + context lines only) */
export function getValidLineNumbers(patch: string): number[] {
  const lines = parseDiffPatch(patch)
  return lines
    .filter((l) => l.type === 'add' || l.type === 'context')
    .map((l) => l.lineNumber)
}

/** Find the closest valid line at or before the requested line */
export function findClosestLineBefore(line: number, validLines: number[]): number | null {
  const candidates = validLines.filter((l) => l <= line)
  if (candidates.length === 0) return null
  return Math.max(...candidates)
}

/** Validate a line number against a diff patch */
export function validateLine(line: number, patch: string): LineValidation {
  const validLines = getValidLineNumbers(patch)

  // Exact match
  if (validLines.includes(line)) {
    return { requestedLine: line, isValid: true, actualLine: line }
  }

  // Find closest line before
  const closest = findClosestLineBefore(line, validLines)

  if (closest === null) {
    return {
      requestedLine: line,
      isValid: false,
      actualLine: line,
      warning: `Line ${line} not in diff, no earlier line available`,
    }
  }

  return {
    requestedLine: line,
    isValid: true,
    actualLine: closest,
    warning: `Line ${line} not in diff, using line ${closest}`,
  }
}
