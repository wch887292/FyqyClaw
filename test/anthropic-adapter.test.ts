import { describe, it, expect, vi, afterEach } from 'vitest'
import { AnthropicAdapter } from '@model-adapter/adapters/anthropic'
import type { CompletionRequest } from '@shared/types/ai'

describe('AnthropicAdapter 真实调用', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('completion 调用 /v1/messages 且使用 x-api-key 头，正确解析文本', async () => {
    const calls: any[] = []
    vi.stubGlobal('fetch', async (url: string, init: any) => {
      calls.push({ url, init })
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'msg_1', model: 'claude-sonnet-4-20250514',
          content: [{ type: 'text', text: '你好，我是 Claude' }],
          usage: { input_tokens: 5, output_tokens: 3 },
        }),
      }
    })

    const adapter = new AnthropicAdapter({ provider: 'anthropic', modelName: 'claude-sonnet-4-20250514', apiKey: 'sk-ant-xxx', endpoint: 'https://api.anthropic.com/v1' })
    const req: CompletionRequest = {
      messages: [
        { role: 'system', content: '你是助手' },
        { role: 'user', content: '你好' },
      ],
      model: 'claude-sonnet-4-20250514',
    }
    const res = await adapter.completion(req)

    expect(calls[0].url).toBe('https://api.anthropic.com/v1/messages')
    expect(calls[0].init.headers['x-api-key']).toBe('sk-ant-xxx')
    expect(calls[0].init.headers['anthropic-version']).toBe('2023-06-01')
    const body = JSON.parse(calls[0].init.body)
    expect(body.system).toBe('你是助手')
    expect(body.messages).toHaveLength(1)
    expect(body.messages[0].role).toBe('user')
    expect(res.content).toBe('你好，我是 Claude')
    expect(res.usage?.totalTokens).toBe(8)
  })

  it('失败时抛出含状态码的错误', async () => {
    vi.stubGlobal('fetch', async () => ({
      ok: false, status: 401, statusText: 'Unauthorized', text: async () => 'invalid x-api-key',
    }))
    const adapter = new AnthropicAdapter({ provider: 'anthropic', modelName: 'claude-3-5-sonnet-20241022', apiKey: 'bad' })
    await expect(adapter.completion({ messages: [{ role: 'user', content: 'hi' }], model: 'claude-3-5-sonnet-20241022' }))
      .rejects.toThrow(/401/)
  })
})
