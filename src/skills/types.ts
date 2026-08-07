export interface SkillDefinition {
  id: string
  name: string
  description: string
  version: string
  author: string
  enabled: boolean
  category: 'development' | 'testing' | 'deployment' | 'analysis' | 'utility'
  triggers?: string[]
  dependencies?: string[]
  config?: Record<string, unknown>
  entryPoint: string
}

export interface SkillInput {
  type: 'text' | 'code' | 'file' | 'url' | 'command'
  name: string
  description: string
  required: boolean
  defaultValue?: string
}

export interface SkillOutput {
  type: 'text' | 'code' | 'file' | 'diff' | 'report'
  content: string
  description?: string
  metadata?: Record<string, unknown>
}

export interface SkillInstance {
  definition: SkillDefinition
  execute: (input: Record<string, unknown>) => Promise<SkillOutput>
  validate?: (input: Record<string, unknown>) => string | null
}