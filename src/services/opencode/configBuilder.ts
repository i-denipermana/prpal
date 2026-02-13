/** OpenCode config builder - generates config with custom agent */

import type { ReviewAgent, OpenCodeAgentConfig } from '../../types/agent.js'
import { agentToOpenCodeConfig } from '../../types/agent.js'

export interface OpenCodeRuntimeConfig {
  agent: Record<string, OpenCodeAgentConfig>
}

export function buildOpenCodeConfig(agent: ReviewAgent): OpenCodeRuntimeConfig {
  const agentConfig = agentToOpenCodeConfig(agent)

  return {
    agent: {
      [agent.id]: agentConfig,
    },
  }
}

export function configToJson(config: OpenCodeRuntimeConfig): string {
  return JSON.stringify(config)
}

export function buildConfigEnv(agent: ReviewAgent): Record<string, string> {
  const config = buildOpenCodeConfig(agent)
  return {
    OPENCODE_CONFIG_CONTENT: configToJson(config),
  }
}
