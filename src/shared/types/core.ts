// Core types for FyqyClaw

export type DevelopmentMode = 'ide' | 'solo'

export interface AppConfig {
  version: string
  mode: DevelopmentMode
  modelConfig: ModelConfig
  securityConfig: SecurityConfig
  workspaceConfig: WorkspaceConfig
  gitConfig: GitConfig
}

export interface ModelConfig {
  provider: string
  apiKey?: string
  endpoint?: string
  modelName: string
  temperature: number
  maxTokens: number
}

export interface SecurityConfig {
  privacyMode: boolean
  sandboxEnabled: boolean
  restrictedPaths: string[]
}

export interface WorkspaceConfig {
  localPath?: string
  remoteSSH?: string
  remoteWSL?: string
}

export interface GitConfig {
  username: string
  email: string
  commitTemplate: string
}

export interface ApiResponse<T = unknown> {
  code: number
  msg: string
  data: T
}