/** Agent store - manages custom review agents */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ReviewAgent, CreateAgentRequest, UpdateAgentRequest } from '../../types/agent.js'
import { getConfigDir } from '../../config/env.js'
import { DEFAULT_REVIEW_PROMPT } from '../opencode/prompts.js'
import { debug, info } from '../../utils/logger.js'

const AGENTS_FILE = 'agents.json'

let agents: ReviewAgent[] = []
let defaultAgentId: string = ''

export function initAgentStore(): void {
  loadAgents()
  ensureDefaultAgent()
}

export function getAgents(): ReviewAgent[] {
  return [...agents]
}

export function getAgent(id: string): ReviewAgent | undefined {
  return agents.find((a) => a.id === id)
}

export function getDefaultAgent(): ReviewAgent {
  const agent = agents.find((a) => a.id === defaultAgentId)
  return agent ?? agents[0]!
}

export function setDefaultAgent(id: string): void {
  if (!agents.some((a) => a.id === id)) return
  defaultAgentId = id
  saveAgents()
  info(`Default agent set to: ${id}`)
}

export function createAgent(request: CreateAgentRequest): ReviewAgent {
  const agent: ReviewAgent = {
    id: generateAgentId(request.name),
    name: request.name,
    description: request.description,
    model: request.model,
    temperature: request.temperature,
    prompt: request.prompt,
    isDefault: request.isDefault ?? false,
    isBuiltIn: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    maxSteps: request.maxSteps,
    focus: request.focus,
    skills: request.skills,
  }

  if (agent.isDefault) {
    setAllAgentsNotDefault()
    defaultAgentId = agent.id
  }

  agents.push(agent)
  saveAgents()
  info(`Agent created: ${agent.id}`)

  return agent
}

export function updateAgent(id: string, request: UpdateAgentRequest): ReviewAgent | null {
  const index = agents.findIndex((a) => a.id === id)
  if (index === -1) return null

  const existing = agents[index]!

  const updated: ReviewAgent = {
    ...existing,
    ...request,
    updatedAt: new Date(),
  }

  if (request.isDefault) {
    setAllAgentsNotDefault()
    defaultAgentId = id
  }

  agents[index] = updated
  saveAgents()
  info(`Agent updated: ${id}`)

  return updated
}

export function deleteAgent(id: string): boolean {
  const agent = agents.find((a) => a.id === id)
  if (!agent || agent.isBuiltIn) return false

  agents = agents.filter((a) => a.id !== id)

  if (defaultAgentId === id && agents.length > 0) {
    defaultAgentId = agents[0]!.id
  }

  saveAgents()
  info(`Agent deleted: ${id}`)

  return true
}

function generateAgentId(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const existing = agents.some((a) => a.id === base)
  return existing ? `${base}-${randomUUID().slice(0, 8)}` : base
}

function setAllAgentsNotDefault(): void {
  agents = agents.map((a) => ({ ...a, isDefault: false }))
}

function ensureDefaultAgent(): void {
  if (agents.length === 0) {
    createBuiltInAgent()
  }

  if (!defaultAgentId || !agents.some((a) => a.id === defaultAgentId)) {
    defaultAgentId = agents[0]!.id
  }
}

function createBuiltInAgent(): void {
  const builtIn: ReviewAgent = {
    id: 'pr-reviewer',
    name: 'General Review',
    description: 'Comprehensive code review for quality, security, and best practices',
    model: 'anthropic/claude-sonnet-4-20250514',
    temperature: 0.1,
    prompt: DEFAULT_REVIEW_PROMPT,
    isDefault: true,
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    skills: ['security', 'code-quality', 'performance'],
  }

  agents.push(builtIn)
  defaultAgentId = builtIn.id
  saveAgents()
}

function getAgentsFilePath(): string {
  return join(getConfigDir(), AGENTS_FILE)
}

function loadAgents(): void {
  const filePath = getAgentsFilePath()

  if (!existsSync(filePath)) {
    agents = []
    return
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(content) as { agents: ReviewAgent[]; defaultAgentId: string }
    agents = data.agents.map(parseAgentDates)
    defaultAgentId = data.defaultAgentId
    debug(`Loaded ${agents.length} agents`)
  } catch {
    agents = []
  }
}

function saveAgents(): void {
  const filePath = getAgentsFilePath()
  const dir = getConfigDir()

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const data = { agents, defaultAgentId }
  writeFileSync(filePath, JSON.stringify(data, null, 2))
  debug(`Saved ${agents.length} agents`)
}

function parseAgentDates(agent: ReviewAgent): ReviewAgent {
  return {
    ...agent,
    createdAt: new Date(agent.createdAt),
    updatedAt: new Date(agent.updatedAt),
  }
}
