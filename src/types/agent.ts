/** Review Agent types */

import type { ReviewFocus } from './review.js'

/** Skill IDs that can be assigned to agents */
export type SkillId =
  | 'security'
  | 'performance'
  | 'code-quality'
  | 'testing'
  | 'documentation'
  | 'accessibility'
  | 'typescript'
  | 'react'
  | 'nodejs'
  | 'database'
  | 'api-design'
  | 'error-handling'

/** Skill definition */
export interface Skill {
  id: SkillId
  name: string
  description: string
  icon: string
  promptAddition: string
}

export interface ReviewAgent {
  id: string
  name: string
  description: string
  model: string
  temperature: number
  prompt: string
  isDefault: boolean
  isBuiltIn: boolean
  createdAt: Date
  updatedAt: Date
  maxSteps?: number
  focus?: ReviewFocus[]
  skills?: string[]  // SkillId for built-in, 'custom:id' for custom skills
}

export interface AgentTemplate {
  id: string
  name: string
  description: string
  icon: string
  defaultPrompt: string
  defaultModel: string
  defaultTemperature: number
  focus: ReviewFocus[]
}

export interface CreateAgentRequest {
  name: string
  description: string
  model: string
  temperature: number
  prompt: string
  isDefault?: boolean
  maxSteps?: number
  focus?: ReviewFocus[]
  skills?: string[]
}

export interface UpdateAgentRequest {
  name?: string
  description?: string
  model?: string
  temperature?: number
  prompt?: string
  isDefault?: boolean
  maxSteps?: number
  focus?: ReviewFocus[]
  skills?: string[]
}

export interface OpenCodeAgentConfig {
  description: string
  mode: 'subagent'
  model: string
  temperature: number
  prompt: string
  tools: {
    write: boolean
    edit: boolean
    bash: boolean
  }
  permission: {
    edit: 'deny'
    bash: Record<string, 'allow' | 'deny'>
  }
}

export function agentToOpenCodeConfig(agent: ReviewAgent): OpenCodeAgentConfig {
  return {
    description: agent.description,
    mode: 'subagent',
    model: agent.model,
    temperature: agent.temperature,
    prompt: agent.prompt,
    tools: {
      write: false,
      edit: false,
      bash: false,
    },
    permission: {
      edit: 'deny',
      bash: {
        '*': 'deny',
        'git diff*': 'allow',
        'git log*': 'allow',
        'git show*': 'allow',
      },
    },
  }
}

export function agentToMarkdown(agent: ReviewAgent): string {
  const frontmatter = [
    '---',
    `description: ${agent.description}`,
    'mode: subagent',
    `model: ${agent.model}`,
    `temperature: ${agent.temperature}`,
    'tools:',
    '  write: false',
    '  edit: false',
    '  bash: false',
    'permission:',
    '  edit: deny',
    '  bash:',
    '    "*": deny',
    '    "git diff*": allow',
    '    "git log*": allow',
    '---',
    '',
  ].join('\n')

  return frontmatter + agent.prompt
}
