export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  timestamp?: number
}

export interface CompletionRequest {
  model: string
  messages: ChatMessage[]
  stream?: boolean
  temperature?: number
  maxTokens?: number
}

export interface CompletionResponse {
  id: string
  content: string
  model: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface CodeGenerationRequest {
  description: string
  language: string
  context?: string
  projectStructure?: string
}

export interface CodeReviewRequest {
  diff: string
  language: string
  filePath: string
}

export interface CodeReviewResult {
  severity: 'error' | 'warning' | 'info'
  line: number
  message: string
  suggestion?: string
}

export interface AgentTask {
  id: string
  description: string
  status: 'pending' | 'planning' | 'executing' | 'reviewing' | 'completed' | 'failed'
  steps: AgentStep[]
  result?: string
  error?: string
}

export interface AgentStep {
  id: string
  description: string
  action: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  output?: string
}

export interface ContextItem {
  type: 'file' | 'folder' | 'snippet' | 'terminal' | 'git' | 'doc' | 'web'
  path?: string
  content: string
  metadata?: Record<string, unknown>
}