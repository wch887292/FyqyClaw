import { AgentEngine } from '@orchestrator/agent/engine'
import { ModelAdapterManager } from '../../model-adapter/manager'
import type { ModelConfig } from '../../model-adapter/types'
import { decryptApiKey } from '../utils/crypto'

export const modelManager = new ModelAdapterManager()
export const agentEngine = new AgentEngine(modelManager)

export function configureAgentEngine(activeModel: {
  provider?: string
  apiKey?: string
  endpoint?: string
  modelId?: string
  modelName?: string
  temperature?: number
  maxTokens?: number
} | null): void {
  if (activeModel) {
    // 解密 API Key 后用于 AI 调用，不回写明文到状态
    const decryptedKey = decryptApiKey(activeModel.apiKey || '')
    const config: ModelConfig = {
      provider: activeModel.provider || 'openai-compatible',
      apiKey: decryptedKey,
      endpoint: activeModel.endpoint,
      modelName: activeModel.modelId || activeModel.modelName || 'default',
      temperature: activeModel.temperature ?? 0.7,
      maxTokens: activeModel.maxTokens ?? 4096,
    }
    agentEngine.configureModel(config)
  }
}