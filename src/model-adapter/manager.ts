import type { ModelAdapter, ModelConfig } from './types'
import type { CompletionRequest, CompletionResponse } from '@shared/types/ai'
import { OpenAIAdapter, OpenAICompatibleAdapter } from './adapters'
import { ModelRouter } from './router'
import { MODEL_PRESETS } from './presets'

export class ModelAdapterManager {
  private adapters: Map<string, ModelAdapter> = new Map()
  private router: ModelRouter = new ModelRouter()
  private defaultModel: string = 'gpt-4o'

  constructor() {
    this.registerDefaultAdapters()
  }

  private registerDefaultAdapters(): void {
    // Register default OpenAI adapter
    const openaiConfig: ModelConfig = {
      provider: 'openai',
      modelName: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
    }
    const openai = new OpenAIAdapter(openaiConfig)
    this.registerAdapter(openai)

    // Register routes from presets
    for (const preset of MODEL_PRESETS) {
      for (const model of preset.models) {
        const config: ModelConfig = {
          provider: preset.provider,
          endpoint: preset.endpoint,
          modelName: model.id,
          temperature: 0.7,
          maxTokens: model.maxTokens,
        }
        const adapter = preset.provider === 'openai'
          ? new OpenAIAdapter(config)
          : new OpenAICompatibleAdapter(config)
        this.registerAdapter(adapter, model.id)

        this.router.registerRoute({
          model: model.id,
          adapter: model.id,
          priority: model.id === 'gpt-4o' ? 100 : 80,
          weight: 1,
        })
      }
    }
  }

  registerAdapter(adapter: ModelAdapter, modelName?: string): void {
    const key = modelName || adapter.provider
    this.adapters.set(key, adapter)
  }

  getAdapter(provider: string): ModelAdapter | undefined {
    return this.adapters.get(provider)
  }

  setDefaultModel(model: string): void {
    this.defaultModel = model
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const model = request.model || this.defaultModel
    const adapterName = this.router.selectAdapter(model)

    if (!adapterName) {
      throw new Error(`No adapter found for model: ${model}`)
    }

    const adapter = this.adapters.get(adapterName)
    if (!adapter) {
      throw new Error(`Adapter not registered: ${adapterName}`)
    }

    return adapter.completion({ ...request, model })
  }

  async *streamComplete(request: CompletionRequest): AsyncIterable<string> {
    const model = request.model || this.defaultModel
    const adapterName = this.router.selectAdapter(model)

    if (!adapterName) {
      throw new Error(`No adapter found for model: ${model}`)
    }

    const adapter = this.adapters.get(adapterName)
    if (!adapter) {
      throw new Error(`Adapter not registered: ${adapterName}`)
    }

    yield* adapter.streamCompletion({ ...request, model })
  }

  configureCustomModel(config: ModelConfig): void {
    const adapter = new OpenAICompatibleAdapter(config)
    this.registerAdapter(adapter, config.modelName)
    this.router.registerRoute({
      model: config.modelName,
      adapter: config.modelName,
      priority: 80,
      weight: 1,
    })
  }
}