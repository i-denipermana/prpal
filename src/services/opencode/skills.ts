/** Skills for review agents - supports both built-in and file-based skills */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, basename, extname } from 'node:path'
import { homedir } from 'node:os'
import type { Skill, SkillId } from '../../types/agent.js'
import { info, warn, debug } from '../../utils/logger.js'

/** Custom skill loaded from file */
export interface CustomSkill {
  id: string
  name: string
  description: string
  icon: string
  content: string
  filePath: string
}

/** Memory loaded from file */
export interface Memory {
  id: string
  name: string
  content: string
  filePath: string
}

let customSkills: CustomSkill[] = []
let memories: Memory[] = []
let skillsFolder: string | undefined
let memoriesFolder: string | undefined

export const SKILLS: Record<SkillId, Skill> = {
  security: {
    id: 'security',
    name: 'Security',
    description: 'Focus on security vulnerabilities and best practices',
    icon: '🔒',
    promptAddition: `
## Security Focus
Pay special attention to:
- SQL injection, XSS, CSRF vulnerabilities
- Authentication and authorization issues
- Sensitive data exposure (API keys, passwords, tokens)
- Input validation and sanitization
- Secure communication (HTTPS, encryption)
- Dependency vulnerabilities
- Rate limiting and DoS protection
- Secure session management
`,
  },

  performance: {
    id: 'performance',
    name: 'Performance',
    description: 'Identify performance bottlenecks and optimization opportunities',
    icon: '⚡',
    promptAddition: `
## Performance Focus
Pay special attention to:
- N+1 query problems
- Unnecessary re-renders in React
- Memory leaks and resource cleanup
- Inefficient algorithms (O(n²) when O(n) is possible)
- Missing caching opportunities
- Large bundle sizes and code splitting
- Lazy loading opportunities
- Database index usage
- Unnecessary computations in loops
`,
  },

  'code-quality': {
    id: 'code-quality',
    name: 'Code Quality',
    description: 'Ensure clean, maintainable, and readable code',
    icon: '✨',
    promptAddition: `
## Code Quality Focus
Pay special attention to:
- SOLID principles adherence
- DRY (Don't Repeat Yourself) violations
- Function and class complexity (cyclomatic complexity)
- Proper naming conventions
- Code organization and structure
- Magic numbers and hardcoded values
- Dead code and unused imports
- Consistent code style
- Proper abstraction levels
`,
  },

  testing: {
    id: 'testing',
    name: 'Testing',
    description: 'Review test coverage and quality',
    icon: '🧪',
    promptAddition: `
## Testing Focus
Pay special attention to:
- Missing test cases for new functionality
- Edge cases not covered
- Test isolation and independence
- Meaningful assertions
- Mock usage and test doubles
- Integration vs unit test balance
- Test naming and organization
- Flaky test patterns
- Coverage of error paths
`,
  },

  documentation: {
    id: 'documentation',
    name: 'Documentation',
    description: 'Ensure proper documentation and comments',
    icon: '📚',
    promptAddition: `
## Documentation Focus
Pay special attention to:
- Missing JSDoc/TSDoc comments on public APIs
- Outdated comments that don't match code
- Complex logic without explanatory comments
- README updates needed
- API documentation completeness
- Type definitions and interfaces
- Example usage in comments
- Changelog updates
`,
  },

  accessibility: {
    id: 'accessibility',
    name: 'Accessibility',
    description: 'Check for accessibility (a11y) issues',
    icon: '♿',
    promptAddition: `
## Accessibility Focus
Pay special attention to:
- Missing ARIA labels and roles
- Keyboard navigation support
- Color contrast issues
- Screen reader compatibility
- Focus management
- Alt text for images
- Form label associations
- Semantic HTML usage
- Skip links and landmarks
`,
  },

  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    description: 'TypeScript best practices and type safety',
    icon: '📘',
    promptAddition: `
## TypeScript Focus
Pay special attention to:
- Proper type definitions (avoid 'any')
- Type inference vs explicit types
- Union types and discriminated unions
- Proper use of generics
- Type guards and narrowing
- Interface vs type usage
- Strict null checks
- Readonly and immutability
- Utility types usage
`,
  },

  react: {
    id: 'react',
    name: 'React',
    description: 'React patterns and best practices',
    icon: '⚛️',
    promptAddition: `
## React Focus
Pay special attention to:
- Proper hook dependencies
- Unnecessary re-renders
- Component composition
- State management patterns
- Event handler cleanup
- Key prop usage in lists
- Controlled vs uncontrolled components
- Error boundaries
- Suspense and lazy loading
- Custom hooks extraction
`,
  },

  nodejs: {
    id: 'nodejs',
    name: 'Node.js',
    description: 'Node.js and server-side best practices',
    icon: '🟢',
    promptAddition: `
## Node.js Focus
Pay special attention to:
- Async/await error handling
- Stream usage for large data
- Event loop blocking
- Memory management
- Proper process signal handling
- Environment variable usage
- Logging best practices
- Graceful shutdown
- Connection pooling
`,
  },

  database: {
    id: 'database',
    name: 'Database',
    description: 'Database queries and schema design',
    icon: '🗄️',
    promptAddition: `
## Database Focus
Pay special attention to:
- Query optimization
- Index usage and design
- N+1 query problems
- Transaction handling
- Data integrity constraints
- Migration safety
- Connection management
- Query injection prevention
- Proper normalization
`,
  },

  'api-design': {
    id: 'api-design',
    name: 'API Design',
    description: 'RESTful API design and best practices',
    icon: '🔌',
    promptAddition: `
## API Design Focus
Pay special attention to:
- RESTful conventions
- HTTP status code usage
- Request/response schema design
- Versioning strategy
- Error response format
- Pagination implementation
- Rate limiting
- Authentication/authorization
- Documentation completeness
`,
  },

  'error-handling': {
    id: 'error-handling',
    name: 'Error Handling',
    description: 'Proper error handling and recovery',
    icon: '🚨',
    promptAddition: `
## Error Handling Focus
Pay special attention to:
- Try-catch block placement
- Error propagation patterns
- User-friendly error messages
- Logging of errors
- Recovery strategies
- Graceful degradation
- Timeout handling
- Retry logic
- Error boundaries (React)
`,
  },
}

/** Get all available skills */
export function getAllSkills(): Skill[] {
  return Object.values(SKILLS)
}

/** Get a skill by ID */
export function getSkill(id: SkillId): Skill | undefined {
  return SKILLS[id]
}

/** Get skills by IDs */
export function getSkills(ids: SkillId[]): Skill[] {
  return ids.map((id) => SKILLS[id]).filter((s): s is Skill => s !== undefined)
}

/** Build additional prompt content from skills */
export function buildSkillsPrompt(skillIds: SkillId[]): string {
  const skills = getSkills(skillIds)
  if (skills.length === 0) return ''

  const sections = skills.map((s) => s.promptAddition.trim())
  return '\n\n' + sections.join('\n\n')
}

// ============================================
// Custom Skills & Memories from Folder
// ============================================

/** Initialize skills and memories folders */
/** Expand ~ to home directory */
function expandPath(path?: string): string | undefined {
  if (!path) return undefined
  if (path.startsWith('~/')) {
    return join(homedir(), path.slice(2))
  }
  if (path === '~') {
    return homedir()
  }
  return path
}

export function initSkillsAndMemories(skillsFolderPath?: string, memoriesFolderPath?: string): void {
  skillsFolder = expandPath(skillsFolderPath)
  memoriesFolder = expandPath(memoriesFolderPath)
  
  if (skillsFolder) {
    loadCustomSkills(skillsFolder)
  }
  
  if (memoriesFolder) {
    loadMemories(memoriesFolder)
  }
}

/** Load custom skills from folder */
function loadCustomSkills(folder: string): void {
  if (!existsSync(folder)) {
    warn(`[Skills] Folder not found: ${folder}`)
    return
  }

  try {
    const files = readdirSync(folder).filter((f) => f.endsWith('.md'))
    customSkills = []

    for (const file of files) {
      const filePath = join(folder, file)
      const skill = parseSkillFile(filePath)
      if (skill) {
        customSkills.push(skill)
        debug(`[Skills] Loaded: ${skill.name}`)
      }
    }

    info(`[Skills] Loaded ${customSkills.length} custom skills from ${folder}`)
  } catch (error) {
    warn(`[Skills] Failed to load from ${folder}:`, { error })
  }
}

/** Load memories from folder */
function loadMemories(folder: string): void {
  if (!existsSync(folder)) {
    warn(`[Memories] Folder not found: ${folder}`)
    return
  }

  try {
    const files = readdirSync(folder).filter((f) => f.endsWith('.md'))
    memories = []

    for (const file of files) {
      const filePath = join(folder, file)
      const memory = parseMemoryFile(filePath)
      if (memory) {
        memories.push(memory)
        debug(`[Memories] Loaded: ${memory.name}`)
      }
    }

    info(`[Memories] Loaded ${memories.length} memories from ${folder}`)
  } catch (error) {
    warn(`[Memories] Failed to load from ${folder}:`, { error })
  }
}

/** Parse a skill markdown file */
function parseSkillFile(filePath: string): CustomSkill | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const fileName = basename(filePath, extname(filePath))
    
    // Try to extract frontmatter
    const frontmatter = extractFrontmatter(content)
    const body = removeFrontmatter(content)
    
    return {
      id: fileName.toLowerCase().replace(/\s+/g, '-'),
      name: frontmatter.name || frontmatter.title || formatName(fileName),
      description: frontmatter.description || `Custom skill: ${fileName}`,
      icon: frontmatter.icon || '📝',
      content: body.trim(),
      filePath,
    }
  } catch (error) {
    warn(`[Skills] Failed to parse ${filePath}:`, { error })
    return null
  }
}

/** Parse a memory markdown file */
function parseMemoryFile(filePath: string): Memory | null {
  try {
    const content = readFileSync(filePath, 'utf-8')
    const fileName = basename(filePath, extname(filePath))
    
    const frontmatter = extractFrontmatter(content)
    const body = removeFrontmatter(content)
    
    return {
      id: fileName.toLowerCase().replace(/\s+/g, '-'),
      name: frontmatter.name || frontmatter.title || formatName(fileName),
      content: body.trim(),
      filePath,
    }
  } catch (error) {
    warn(`[Memories] Failed to parse ${filePath}:`, { error })
    return null
  }
}

/** Extract YAML frontmatter from markdown */
function extractFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/)
  if (!match) return {}
  
  const frontmatter: Record<string, string> = {}
  const lines = match[1].split('\n')
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim()
      const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '')
      frontmatter[key] = value
    }
  }
  
  return frontmatter
}

/** Remove frontmatter from markdown content */
function removeFrontmatter(content: string): string {
  return content.replace(/^---\n[\s\S]*?\n---\n*/, '')
}

/** Format filename to display name */
function formatName(fileName: string): string {
  return fileName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Get all custom skills */
export function getCustomSkills(): CustomSkill[] {
  return [...customSkills]
}

/** Get all memories */
export function getMemories(): Memory[] {
  return [...memories]
}

/** Get a custom skill by ID */
export function getCustomSkill(id: string): CustomSkill | undefined {
  return customSkills.find((s) => s.id === id)
}

/** Get a memory by ID */
export function getMemory(id: string): Memory | undefined {
  return memories.find((m) => m.id === id)
}

/** Reload skills from folder */
export function reloadSkills(): void {
  if (skillsFolder) {
    loadCustomSkills(skillsFolder)
  }
}

/** Reload memories from folder */
export function reloadMemories(): void {
  if (memoriesFolder) {
    loadMemories(memoriesFolder)
  }
}

/** Build prompt with custom skills (accepts IDs without 'custom:' prefix) */
export function buildCustomSkillsPrompt(skillIds: string[]): string {
  const skills = skillIds
    .map((id) => getCustomSkill(id))
    .filter((s): s is CustomSkill => s !== undefined)
  
  if (skills.length === 0) return ''
  
  return '\n\n## Custom Review Focus\n\n' + skills.map((s) => s.content).join('\n\n')
}

/** Build prompt with ALL loaded memories (for context) */
export function buildAllMemoriesPrompt(): string {
  if (memories.length === 0) return ''
  
  return '\n\n## Project Context & Memories\n\n' + memories.map((m) => m.content).join('\n\n')
}

/** Build prompt with memories */
export function buildMemoriesPrompt(memoryIds: string[]): string {
  const mems = memoryIds
    .map((id) => getMemory(id))
    .filter((m): m is Memory => m !== undefined)
  
  if (mems.length === 0) return ''
  
  return '\n\n## Context & Memories\n\n' + mems.map((m) => m.content).join('\n\n')
}

/** Get combined list of built-in and custom skills for UI */
export function getAllSkillsForUI(): Array<{ id: string; name: string; description: string; icon: string; isCustom: boolean }> {
  const builtIn = Object.values(SKILLS).map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    icon: s.icon,
    isCustom: false,
  }))
  
  const custom = customSkills.map((s) => ({
    id: `custom:${s.id}`,
    name: s.name,
    description: s.description,
    icon: s.icon,
    isCustom: true,
  }))
  
  return [...builtIn, ...custom]
}

/** Get skills folder path */
export function getSkillsFolder(): string | undefined {
  return skillsFolder
}

/** Get memories folder path */
export function getMemoriesFolder(): string | undefined {
  return memoriesFolder
}
