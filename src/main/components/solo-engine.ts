import { AgentEngine } from '@orchestrator/agent/engine'
import { ModelAdapterManager } from '../../model-adapter/manager'
import type { ModelConfig } from '../../model-adapter/types'
import { decryptApiKey } from '../utils/crypto'
import { useAppStore } from '../stores/app-store'

export const modelManager = new ModelAdapterManager()
export const agentEngine = new AgentEngine(modelManager)

// SOLO 生成的代码写入用户当前打开的项目目录（资源管理器里打开的文件夹）
agentEngine.setWorkspaceResolver(() => useAppStore.getState().rootPath || undefined)

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