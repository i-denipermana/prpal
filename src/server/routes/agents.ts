/** Agent routes - CRUD operations for review agents */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { CreateAgentRequest, UpdateAgentRequest } from '../../types/agent.js'
import {
  getAgents,
  getAgent,
  getDefaultAgent,
  setDefaultAgent,
  createAgent,
  updateAgent,
  deleteAgent,
} from '../../services/state/agentStore.js'
import {
  getAllSkillsForUI,
  getCustomSkills,
  getMemories,
  getSkillsFolder,
  getMemoriesFolder,
  reloadSkills,
  reloadMemories,
  initSkillsAndMemories,
} from '../../services/opencode/skills.js'

export function registerAgentRoutes(server: FastifyInstance): void {
  server.get('/api/agents', handleListAgents)
  server.get('/api/agents/:id', handleGetAgent)
  server.post('/api/agents', handleCreateAgent)
  server.put('/api/agents/:id', handleUpdateAgent)
  server.delete('/api/agents/:id', handleDeleteAgent)
  server.post('/api/agents/:id/default', handleSetDefault)
  server.get('/api/skills', handleListSkills)
  server.post('/api/skills/reload', handleReloadSkills)
}

function handleListAgents(_request: FastifyRequest, reply: FastifyReply): void {
  const agents = getAgents()
  const defaultAgent = getDefaultAgent()

  void reply.send({
    agents,
    defaultAgentId: defaultAgent.id,
  })
}

interface AgentParams {
  id: string
}

function handleGetAgent(
  request: FastifyRequest<{ Params: AgentParams }>,
  reply: FastifyReply
): void {
  const agent = getAgent(request.params.id)

  if (!agent) {
    void reply.status(404).send({ error: 'Agent not found' })
    return
  }

  void reply.send(agent)
}

function handleCreateAgent(
  request: FastifyRequest<{ Body: CreateAgentRequest }>,
  reply: FastifyReply
): void {
  const body = request.body

  if (!body.name || !body.model || !body.prompt) {
    void reply.status(400).send({ error: 'Missing required fields: name, model, prompt' })
    return
  }

  const agent = createAgent(body)
  void reply.status(201).send(agent)
}

function handleUpdateAgent(
  request: FastifyRequest<{ Params: AgentParams; Body: UpdateAgentRequest }>,
  reply: FastifyReply
): void {
  const agent = updateAgent(request.params.id, request.body)

  if (!agent) {
    void reply.status(404).send({ error: 'Agent not found' })
    return
  }

  void reply.send(agent)
}

function handleDeleteAgent(
  request: FastifyRequest<{ Params: AgentParams }>,
  reply: FastifyReply
): void {
  const agent = getAgent(request.params.id)

  if (!agent) {
    void reply.status(404).send({ error: 'Agent not found' })
    return
  }

  if (agent.isBuiltIn) {
    void reply.status(400).send({ error: 'Cannot delete built-in agent' })
    return
  }

  const deleted = deleteAgent(request.params.id)

  if (!deleted) {
    void reply.status(500).send({ error: 'Failed to delete agent' })
    return
  }

  void reply.send({ success: true })
}

function handleSetDefault(
  request: FastifyRequest<{ Params: AgentParams }>,
  reply: FastifyReply
): void {
  const agent = getAgent(request.params.id)

  if (!agent) {
    void reply.status(404).send({ error: 'Agent not found' })
    return
  }

  setDefaultAgent(request.params.id)
  void reply.send({ success: true, defaultAgentId: request.params.id })
}

function handleListSkills(_request: FastifyRequest, reply: FastifyReply): void {
  const skills = getAllSkillsForUI()
  const customSkills = getCustomSkills()
  const memories = getMemories()

  void reply.send({
    skills,
    customSkillsCount: customSkills.length,
    memoriesCount: memories.length,
    skillsFolder: getSkillsFolder(),
    memoriesFolder: getMemoriesFolder(),
  })
}

interface ReloadSkillsBody {
  skillsFolder?: string
  memoriesFolder?: string
}

function handleReloadSkills(
  request: FastifyRequest<{ Body: ReloadSkillsBody }>,
  reply: FastifyReply
): void {
  const { skillsFolder, memoriesFolder } = request.body || {}

  // If new paths provided, reinitialize with them
  if (skillsFolder !== undefined || memoriesFolder !== undefined) {
    initSkillsAndMemories(skillsFolder, memoriesFolder)
  } else {
    // Just reload from existing paths
    reloadSkills()
    reloadMemories()
  }

  const skills = getAllSkillsForUI()
  const customSkills = getCustomSkills()
  const memories = getMemories()

  void reply.send({
    skills,
    customSkillsCount: customSkills.length,
    memoriesCount: memories.length,
    skillsFolder: getSkillsFolder(),
    memoriesFolder: getMemoriesFolder(),
  })
}
