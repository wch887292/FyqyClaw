export interface MCPServerConfig {
  id: string
  name: string
  transport: 'stdio' | 'http' | 'ws'
  command?: string
  args?: string[]
  endpoint?: string
  apiKey?: string
  enabled: boolean
  auth?: {
    type: 'none' | 'api-key' | 'oauth' | 'basic'
    credentials?: Record<string, string>
  }
  permissions: {
    allowNetwork: boolean
    allowFileAccess: boolean
    allowCommandExecution: boolean
    riskLevel: 'low' | 'medium' | 'high'
  }
}

export interface MCPTool {
  serverId: string
  name: string
  description: string
  inputSchema: Record<string, unknown>
  requiresConfirmation: boolean
}

export interface MCPCallResult {
  success: boolean
  data?: unknown
  error?: string
  executionTime: number
}

export interface MCPResource {
  serverId: string
  uri: string
  name: string
  description?: string
  mimeType?: string
}