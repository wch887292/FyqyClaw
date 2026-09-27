/**
 * 内置模型提供器（可插拔的 model-provider 扩展）。
 *  - EchoProvider：无需联网的演示模型，便于本地独立运行与测试。
 *  - OpenAICompatProvider：对接任意 OpenAI 兼容端点（公有云 / 本地 Ollama / 私有部署）。
 */
import type { ModelChunk, ModelProvider, ModelRequest, RuntimeContext } from '../core/types'

/** 演示用回显模型：把用户最后一条消息回显，不消耗任何外部 API。 */
export class EchoProvider implements ModelProvider {
  readonly kind = 'model-provider'
  readonly id = 'model-echo'
  readonly name = 'Echo Model (demo)'
  readonly version = '1.0.0'
  readonly models = ['echo']

  async *complete(req: ModelRequest, _ctx: RuntimeContext): AsyncIterable<ModelChunk> {
    const last = [...req.messages].reverse().find((m) => m.role === 'user')
    const prompt = last?.content ?? ''
    const reply =
      `【FyqyClaw 本地智能体】已收到您的指令：${prompt}\n` +
      `（这是 Echo 演示模型。生产环境请在配置中接入 OpenAI 兼容提供器，` +
      `或私有部署的本地大模型，数据全程不出本地。）`
    for (const piece of reply.match(/[\s\S]{1,16}/g) ?? [reply]) {
      yield { type: 'text', text: piece }
    }
    yield { type: 'done' }
  }
}

/** OpenAI 兼容提供器：对接标准 /v1/chat/completions（流式）。 */
export class OpenAICompatProvider implements ModelProvider {
  readonly kind = 'model-provider'
  readonly id = 'model-openai-compat'
  readonly name: string
  readonly version = '1.0.0'
  readonly models: string[]

  constructor(
    private readonly endpoint: string,
    models: string[],
    private readonly nameOverride?: string,
  ) {
    this.models = models
    this.name = nameOverride ?? `OpenAI Compatible @ ${endpoint}`
  }

  async *complete(req: ModelRequest, ctx: RuntimeContext): AsyncIterable<ModelChunk> {
    const apiKey =
      (ctx.secrets.get('OPENAI_API_KEY') as string | undefined) ??
      (ctx.config.apiKey as string | undefined)
    try {
      const res = await fetch(`${this.endpoint.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: req.model,
          messages: req.messages,
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 1024,
          stream: true,
        }),
      })
      if (!res.ok || !res.body) {
        yield { type: 'error', error: `upstream ${res.status}: ${await res.text().catch(() => '')}` }
        return
      }
      // 解析 SSE 流
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          const data = trimmed.slice(5).trim()
          if (data === '[DONE]') {
            yield { type: 'done' }
            return
          }
          try {
            const json = JSON.parse(data)
            const delta = json.choices?.[0]?.delta?.content
            if (delta) yield { type: 'text', text: delta }
          } catch {
            /* 忽略心跳/不完整帧 */
          }
        }
      }
      yield { type: 'done' }
    } catch (err) {
      yield { type: 'error', error: (err as Error).message }
    }
  }
}
