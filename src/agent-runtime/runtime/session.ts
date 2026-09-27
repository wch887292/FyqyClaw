/**
 * AgentSession —— 一次智能体对话会话。
 *
 * send() 返回一个异步可迭代的事件流（AgentEvent），同时把每个事件通过
 * runtime.emit 广播给所有 Transport（可独立呈现 / 可对接转发）。
 * 会话自行维护历史，供智能体获取上下文。
 */
import type { Agent, AgentEvent, AgentMessage } from '../core/types'
import type { AgentRuntime } from './agent-runtime'

export interface AgentSessionOptions {
  agent: Agent
  sessionId: string
  runtime: AgentRuntime
}

export class AgentSession {
  readonly sessionId: string
  readonly agentId: string
  private readonly agent: Agent
  private readonly runtime: AgentRuntime
  private history: AgentMessage[] = []

  constructor(opts: AgentSessionOptions) {
    this.sessionId = opts.sessionId
    this.agent = opts.agent
    this.agentId = opts.agent.id
    this.runtime = opts.runtime
  }

  getHistory(): AgentMessage[] {
    return this.history
  }

  /**
   * 发送一条用户消息，返回该轮运行的事件流。
   * 调用方既可 `for await` 消费，也可依赖 Transport 异步接收同一份事件。
   */
  async *send(message: string): AsyncIterable<AgentEvent> {
    this.history.push({ role: 'user', content: message, ts: Date.now() })

    const ctx = this.runtime.createContext()
    for await (const event of this.agent.run(
      { sessionId: this.sessionId, message, history: this.history, metadata: {} },
      ctx,
    )) {
      // 把助手消息写入历史
      if (event.type === 'agent.message') {
        this.history.push({ role: 'assistant', content: event.text, ts: Date.now() })
      }
      this.runtime.emit(event)
      yield event
    }
  }
}
