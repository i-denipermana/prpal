/** Models routes - get available AI models */

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { fetchAvailableModels, clearModelsCache } from '../../services/opencode/modelFetcher.js'
import { getOpenCodePath } from '../../services/opencode/detector.js'

export function registerModelsRoutes(server: FastifyInstance): void {
  server.get('/api/models', handleGetModels)
  server.post('/api/models/refresh', handleRefreshModels)
}

interface ModelsQuery {
  provider?: string
}

async function handleGetModels(
  request: FastifyRequest<{ Querystring: ModelsQuery }>,
  reply: FastifyReply
): Promise<void> {
  const opencodePath = await getOpenCodePath()
  const models = await fetchAvailableModels(opencodePath)
  
  const { provider } = request.query
  const filtered = provider 
    ? models.filter(m => m.provider === provider)
    : models

  // Group by provider for easier UI rendering
  const grouped = groupByProvider(filtered)
  
  void reply.send({
    models: filtered,
    grouped,
    providers: [...new Set(models.map(m => m.provider))],
  })
}

async function handleRefreshModels(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  clearModelsCache()
  
  const opencodePath = await getOpenCodePath()
  const models = await fetchAvailableModels(opencodePath, true)
  
  void reply.send({
    models,
    grouped: groupByProvider(models),
    providers: [...new Set(models.map(m => m.provider))],
  })
}

interface GroupedModels {
  [provider: string]: Array<{
    id: string
    name: string
    contextLimit?: number
    hasReasoning?: boolean
  }>
}

function groupByProvider(models: Awaited<ReturnType<typeof fetchAvailableModels>>): GroupedModels {
  const grouped: GroupedModels = {}
  
  for (const model of models) {
    if (!grouped[model.provider]) {
      grouped[model.provider] = []
    }
    grouped[model.provider].push({
      id: model.id,
      name: model.name,
      contextLimit: model.contextLimit,
      hasReasoning: model.hasReasoning,
    })
  }
  
  return grouped
}
