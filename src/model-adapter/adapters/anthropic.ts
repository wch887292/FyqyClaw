import type { ChatMessage, CompletionRequest, CompletionResponse } from '@shared/types/ai'
import type { ModelAdapter, ModelConfig } from '../types'

/**
 * Anthropic (Claude) 原生适配器。
 * 之前 anthropic 预设被误当作 OpenAI 兼容接口，向 /v1/chat/completions 发请求导致失败；
 * 此处按 Anthropic Messages API（/v1/messages）真正实现。
 */
export class AnthropicAdapter implements ModelAdapter {
  readonly provider = 'anthropic'
  readonly displayName = 'Anthropic (Claude)'

  private config: ModelConfig
  private baseUrl: string

  constructor(config: ModelConfig) {
    this.config = config
    this.baseUrl = config.endpoint || 'https://api.anthropic.com/v1'
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey || '',
      'anthropic-version': '2023-06-01',
    }
    // 浏览器环境直连需要该头，Electron 渲染进程也属浏览器环境
    if (typeof window !== 'undefined' || typeof navigator !== 'undefined') {
      h['anthropic-dangerous-direct-browser-access'] = 'true'
    }
    return h
  }

  /** 拆分 system 消息与对话消息（Anthropic 不允许 system 出现在 messages 中） */
  private splitSystem(messages: ChatMessage[]): { system?: string; chat: ChatMessage[] } {
    const systemParts: string[] = []
    const chat: ChatMessage[] = []
    for (const m of messages) {
      if (m.role === 'system') {
        systemParts.push(typeof m.content === 'string' ? m.content : JSON.stringify(m.content))
      } else {
        chat.push(m)
      }
    }
    return { system: systemParts.length ? systemParts.join('\n\n') : undefined, chat }
  }

  private buildBody(request: CompletionRequest, stream: boolean): Record<string, unknown> {
    const { system, chat } = this.splitSystem(request.messages)
    const body: Record<string, unknown> = {
      model: this.config.modelName,
      max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
      messages: chat,
      stream,
    }
    if (system) body.system = system
    const temp = request.temperature ?? this.config.temperature
    if (temp !== undefined) body.temperature = temp
    return body
  }

  async completion(request: CompletionRequest): Promise<CompletionResponse> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 60000)
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(this.buildBody(request, false)),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Anthropic API 请求失败 (${response.status}): ${response.statusText}${text ? ' - ' + text : ''}`)
      }

      const data = await response.json()
      const text = (data.content || [])
        .filter((b: { type?: string }) => b.type === 'text')
        .map((b: { text?: string }) => b.text || '')
        .join('')
      return {
        id: data.id,
        content: text,
        model: data.model,
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0),
        } : undefined,
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('请求超时：Anthropic 服务响应过慢或无响应')
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  async *streamCompletion(request: CompletionRequest): AsyncIterable<string> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000)
    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: this.headers(),
        body: JSON.stringify(this.buildBody(request, true)),
        signal: controller.signal,
      })

      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Anthropic API 请求失败 (${response.status}): ${response.statusText}${text ? ' - ' + text : ''}`)
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
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (!data || data === '[DONE]') continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
              yield parsed.delta.text as string
            }
          } catch {
            // 跳过无法解析的事件行
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('流式请求超时：Anthropic 服务响应过慢')
      }
      throw err
    } finally {
      clearTimeout(timeout)
    }
  }

  async validateConfig(): Promise<boolean> {
    if (!this.config.apiKey) return false
    try {
      const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/models`, {
        headers: { 'x-api-key': this.config.apiKey, 'anthropic-version': '2023-06-01' },
      })
      return response.ok
    } catch {
      return false
    }
  }
}
