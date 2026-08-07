import type { ChatMessage, CompletionRequest, CompletionResponse } from '@shared/types/ai'

export interface ModelAdapter {
  readonly provider: string
  readonly displayName: string
  completion(request: CompletionRequest): Promise<CompletionResponse>
  streamCompletion(request: CompletionRequest): AsyncIterable<string>
  validateConfig(): Promise<boolean>
}

export interface ModelConfig {
  provider: string
  apiKey?: string
  endpoint?: string
  modelName: string
  temperature?: number
  maxTokens?: number
}

export interface ModelRoute {
  model: string
  adapter: string
  priority: number
  weight: number
}