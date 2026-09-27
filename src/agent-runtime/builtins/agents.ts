/**
 * 内置智能体：SOLO Agent（可插拔的 agent 扩展）。
 *
 * 编排逻辑（体现「可独立 / 可对接」）：
 *  1. 解析意图 → 2. 必要时调用技能（知识库） → 3. 调用模型提供器生成回复
 *     → 4. 必要时通过连接器把对话外发到企业平台（无人值守运营）
 * 不绑定任何 UI / Electron，可在 CLI、网关、嵌入场景中复用。
 */
import type { Agent, AgentEvent, AgentRunInput, RuntimeContext } from '../core/types'

export class SoloAgent implements Agent {
  readonly kind = 'agent'
  readonly id = 'agent-solo'
  readonly name = 'SOLO 自主智能体'
  readonly version = '1.0.0'
  readonly capabilities = ['chat', 'knowledge', 'notify']

  async *run(input: AgentRunInput, ctx: RuntimeContext): AsyncIterable<AgentEvent> {
    const { sessionId, message } = input
    yield { type: 'session.start', sessionId }

    // 1) 选择模型提供器（可配置）
    const providerId = (ctx.config.modelProvider as string) ?? 'model-echo'
    const provider =
      ctx.runtime.getExtension('model-provider', providerId) ??
      ctx.runtime.getExtensions('model-provider')[0]
    if (!provider) {
      yield { type: 'error', sessionId, error: 'no model provider available' }
      return
    }

    // 2) 知识库增强（可插拔技能）
    const knowledge = ctx.runtime.getExtension('skill', 'skill-knowledge')
    let kbContext = ''
    if (knowledge) {
      yield { type: 'skill.call', sessionId, skillId: knowledge.id, input: { question: message } }
      const r = await knowledge.execute({ question: message }, ctx)
      kbContext = r.ok ? String(r.output ?? '') : ''
      yield { type: 'skill.result', sessionId, skillId: knowledge.id, ok: r.ok, output: r.output }
    }

    // 3) 模型生成
    yield { type: 'agent.think', sessionId, text: '正在生成回复…' }
    const messages = [
      ...input.history.filter((m) => m.role !== 'tool'),
      ...(kbContext
        ? [{ role: 'system' as const, content: `企业知识库参考：${kbContext}` }]
        : []),
    ]
    for await (const chunk of provider.complete(
      { model: provider.models[0], messages, temperature: 0.7 },
      ctx,
    )) {
      if (chunk.type === 'text') {
        yield { type: 'agent.message', sessionId, text: chunk.text ?? '' }
      } else if (chunk.type === 'error') {
        yield { type: 'error', sessionId, error: chunk.error ?? 'model error' }
      }
    }

    // 4) 可对接：把本轮对话外发到企业AI一站式平台（若配置了 HTTP 连接器）
    const http = ctx.runtime.getExtension('connector', 'connector-http')
    if (http) {
      yield { type: 'connector.call', sessionId, connectorId: http.id, action: 'sync' }
      const r = await http.call('sync', { sessionId, message }, ctx)
      yield { type: 'connector.result', sessionId, connectorId: http.id, ok: r.ok, data: r.data }
    }

    yield { type: 'session.end', sessionId }
  }
}
