/** Configuration types */

import { z } from 'zod'

export const GitHubConfigSchema = z.object({
  pat: z.string().min(1, 'GitHub PAT is required'),
  username: z.string().min(1, 'GitHub username is required'),
  org: z.string().min(1, 'GitHub organization is required'),
})

export const PollingConfigSchema = z.object({
  intervalMs: z.number().min(30000).default(300000),
})

export const ServerConfigSchema = z.object({
  port: z.number().min(1024).max(65535).default(3847),
  host: z.string().default('127.0.0.1'),
})

export const OpenCodeConfigSchema = z.object({
  enabled: z.boolean().default(true),
  model: z.string().default('anthropic/claude-sonnet-4-20250514'),
  timeoutMs: z.number().min(10000).default(120000),
  path: z.string().optional(),
  autoReview: z.boolean().default(true),
  skillsFolder: z.string().optional(),
  memoriesFolder: z.string().optional(),
})

export const ReviewFormatConfigSchema = z.object({
  style: z.enum(['minimal', 'standard', 'detailed']).default('standard'),
  attribution: z.enum(['none', 'subtle', 'full']).default('subtle'),
  signature: z.string().optional(),
})

export const NotificationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  sound: z.boolean().default(true),
})

export const AppConfigSchema = z.object({
  github: GitHubConfigSchema,
  polling: PollingConfigSchema.optional(),
  server: ServerConfigSchema.optional(),
  opencode: OpenCodeConfigSchema.optional(),
  reviewFormat: ReviewFormatConfigSchema.optional(),
  notification: NotificationConfigSchema.optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
})

export type GitHubConfig = z.infer<typeof GitHubConfigSchema>
export type PollingConfig = z.infer<typeof PollingConfigSchema>
export type ServerConfig = z.infer<typeof ServerConfigSchema>
export type OpenCodeConfig = z.infer<typeof OpenCodeConfigSchema>
export type ReviewFormatConfig = z.infer<typeof ReviewFormatConfigSchema>
export type NotificationConfig = z.infer<typeof NotificationConfigSchema>
export type AppConfig = z.infer<typeof AppConfigSchema>

/** Resolved config with all defaults applied */
export interface ResolvedConfig {
  github: GitHubConfig
  polling: Required<PollingConfig>
  server: Required<ServerConfig>
  opencode: Required<Omit<OpenCodeConfig, 'path' | 'skillsFolder' | 'memoriesFolder'>> & { 
    path?: string
    skillsFolder?: string
    memoriesFolder?: string
  }
  reviewFormat: Required<Omit<ReviewFormatConfig, 'signature'>> & { signature?: string }
  notification: Required<NotificationConfig>
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export interface AppSettings {
  config: ResolvedConfig
  agents: import('./agent.js').ReviewAgent[]
  defaultAgentId: string
}

export function resolveConfig(config: AppConfig): ResolvedConfig {
  return {
    github: config.github,
    polling: {
      intervalMs: config.polling?.intervalMs ?? 300000,
    },
    server: {
      port: config.server?.port ?? 3847,
      host: config.server?.host ?? '127.0.0.1',
    },
    opencode: {
      enabled: config.opencode?.enabled ?? true,
      model: config.opencode?.model ?? 'anthropic/claude-sonnet-4-20250514',
      timeoutMs: config.opencode?.timeoutMs ?? 120000,
      path: config.opencode?.path,
      autoReview: config.opencode?.autoReview ?? true,
      skillsFolder: config.opencode?.skillsFolder,
      memoriesFolder: config.opencode?.memoriesFolder,
    },
    reviewFormat: {
      style: config.reviewFormat?.style ?? 'standard',
      attribution: config.reviewFormat?.attribution ?? 'subtle',
      signature: config.reviewFormat?.signature,
    },
    notification: {
      enabled: config.notification?.enabled ?? true,
      sound: config.notification?.sound ?? true,
    },
    logLevel: config.logLevel ?? 'info',
  }
}
