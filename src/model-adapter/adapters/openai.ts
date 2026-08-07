import type { ChatMessage, CompletionRequest, CompletionResponse } from '@shared/types/ai'
import type { ModelAdapter, ModelConfig } from '../types'

export class OpenAIAdapter implements ModelAdapter {
  readonly provider: string = 'openai'
  readonly displayName = 'OpenAI 兼容接口'

  private config: ModelConfig
  private baseUrl: string

  constructor(config: ModelConfig) {
    this.config = config
    this.baseUrl = config.endpoint || 'https://api.openai.com/v1'
  }

  async completion(request: CompletionRequest): Promise<CompletionResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000) // 60s timeout
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.modelName,
          messages: request.messages,
          temperature: request.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
          stream: false,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`API 请求失败 (${response.status}): ${response.statusText || '请检查模型服务是否正常运行'}`)
      }

      const data = await response.json()
      return {
        id: data.id,
        content: data.choices[0].message.content,
        model: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('请求超时：模型服务响应过慢或无响应，请检查模型是否正常运行')
      }
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        throw new Error(`无法连接到模型服务 (${this.baseUrl})，请确认服务地址是否正确且服务已启动`)
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  async *streamCompletion(request: CompletionRequest): AsyncIterable<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000) // 120s timeout for stream
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.modelName,
          messages: request.messages,
          temperature: request.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
          stream: true,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`API 请求失败 (${response.status}): ${response.statusText || '请检查模型服务是否正常运行'}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') return

          try {
            const parsed = JSON.parse(data)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) yield content
          } catch {
            // skip malformed chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('流式请求超时：模型服务响应过慢，请检查模型是否正常运行')
      }
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        throw new Error(`无法连接到模型服务 (${this.baseUrl})，请确认服务地址是否正确且服务已启动`)
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) return false
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }
}

export class OpenAICompatibleAdapter extends OpenAIAdapter {
  readonly provider = 'openai-compatible'
  readonly displayName = 'OpenAI 兼容接口'
}