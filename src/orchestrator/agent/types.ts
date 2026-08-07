import type { AgentTask, AgentStep } from '@shared/types/ai'

export interface AgentCapability {
  name: string
  description: string
  execute(params: Record<string, unknown>): Promise<string>
  retryable?: boolean
  timeout?: number
}

export interface ExecutionPlan {
  taskId: string
  steps: ExecutionStep[]
  estimatedComplexity: 'low' | 'medium' | 'high'
  parallelGroups?: string[][] // Steps that can run in parallel
}

export interface ExecutionStep {
  id: string
  description: string
  action: 'analyze' | 'generate' | 'modify' | 'test' | 'review' | 'fix'
  target?: string
  params: Record<string, unknown>
  dependsOn: string[]
  canParallel?: boolean
}

export type AgentStatus = 'idle' | 'planning' | 'executing' | 'reviewing' | 'completed' | 'error'

export interface SelfHealingConfig {
  maxRetries: number
  retryDelayMs: number
  enableAutoFix: boolean
  fallbackStrategy: 'abort' | 'skip' | 'retry' | 'alternative'
}

export interface ErrorReport {
  stepId: string
  error: string
  errorType: 'timeout' | 'runtime' | 'dependency' | 'permission' | 'unknown'
  timestamp: number
  context: Record<string, unknown>
}

export interface ChangeSummary {
  taskId: string
  description: string
  filesChanged: string[]
  changes: ChangeEntry[]
  statistics: ChangeStatistics
  generatedAt: number
}

export interface ChangeEntry {
  file: string
  type: 'created' | 'modified' | 'deleted' | 'renamed'
  summary: string
  linesAdded?: number
  linesRemoved?: number
}

export interface ChangeStatistics {
  totalFiles: number
  totalLinesAdded: number
  totalLinesRemoved: number
  languages: string[]
  estimatedEffort: string
}