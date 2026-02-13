/** Review prompt templates */

import type { PullRequest } from '../../types/pr.js'
import type { ReviewAgent, SkillId } from '../../types/agent.js'
import { buildSkillsPrompt, buildCustomSkillsPrompt, buildAllMemoriesPrompt } from './skills.js'

export const DEFAULT_REVIEW_PROMPT = `You are an expert code reviewer. When reviewing a pull request, analyze:

## Code Quality
- Clean code principles and readability
- Proper naming conventions
- Code duplication and DRY violations
- Function/method length and complexity

## Potential Bugs
- Edge cases and error handling
- Null/undefined checks
- Race conditions and async issues
- Off-by-one errors

## Security
- Input validation and sanitization
- Authentication/authorization issues
- SQL injection, XSS, CSRF risks
- Sensitive data exposure
- Dependency vulnerabilities

## Performance
- Unnecessary computations
- N+1 queries
- Memory leaks
- Inefficient algorithms

## Best Practices
- TypeScript/JavaScript patterns
- React/Node.js conventions
- Testing coverage
- Documentation needs

## Output Format
Provide your review as JSON with this structure:
{
  "summary": "Brief overview of changes (2-3 sentences)",
  "verdict": "approve" | "request_changes" | "comment",
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "file": "path/to/file.ts",
      "line": 42,
      "message": "Description of the issue",
      "suggestion": "How to fix (optional)"
    }
  ],
  "suggestions": [
    {
      "message": "Constructive improvement suggestion"
    }
  ],
  "positives": ["Things done well (optional)"]
}

Be constructive, specific, and provide code examples where helpful.`

export interface PromptOptions {
  agent?: ReviewAgent
  includeMemories?: boolean
}

export function buildReviewPrompt(pr: PullRequest, diff: string, options?: PromptOptions): string {
  const basePrompt = options?.agent?.prompt || DEFAULT_REVIEW_PROMPT
  const skillsSection = buildAgentSkillsPrompt(options?.agent)
  // Always include memories if they exist (project context)
  const memoriesSection = buildAllMemoriesPrompt()

  return `${basePrompt}${skillsSection}${memoriesSection}

---

Review this pull request:

## PR #${pr.number}: ${pr.title}
**Author:** ${pr.author.login}
**Repository:** ${pr.repository.fullName}
**Base:** ${pr.base.ref} <- ${pr.head.ref}

### Description
${pr.body || 'No description provided'}

### Changes
- Files changed: ${pr.stats.changedFiles}
- Additions: +${pr.stats.additions}
- Deletions: -${pr.stats.deletions}

### Diff
\`\`\`diff
${diff}
\`\`\`

Provide your review as JSON with the structure specified above.`
}

function buildAgentSkillsPrompt(agent?: ReviewAgent): string {
  if (!agent?.skills || agent.skills.length === 0) return ''

  const builtInSkills: SkillId[] = []
  const customSkillIds: string[] = []

  for (const skillId of agent.skills) {
    if (skillId.startsWith('custom:')) {
      customSkillIds.push(skillId.replace('custom:', ''))
    } else {
      builtInSkills.push(skillId as SkillId)
    }
  }

  const builtInPrompt = buildSkillsPrompt(builtInSkills)
  const customPrompt = buildCustomSkillsPrompt(customSkillIds)

  return builtInPrompt + customPrompt
}

export function buildQuickReviewPrompt(pr: PullRequest, diff: string): string {
  return `Review PR #${pr.number}: ${pr.title}

Changes:
\`\`\`diff
${diff}
\`\`\`

Respond with JSON: { summary, verdict, issues[], suggestions[] }`
}
