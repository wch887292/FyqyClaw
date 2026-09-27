/**
 * 内置连接器（可插拔的 connector 扩展）—— 体现「可对接」特性。
 *  - HttpConnector：调用任意外部 REST 端点（企业AI一站式平台 / 第三方系统）。
 *  - McpBridgeConnector：桥接到已有的 MCP 管理器（零耦合对接现有 src/mcp）。
 */
import type {
  Connector,
  ConnectorResult,
  InboundEvent,
  RuntimeContext,
} from '../core/types'

/** 调用外部 HTTP 服务。endpoint 来自 ctx.config.httpEndpoint，缺省则本地回显。 */
export class HttpConnector implements Connector {
  readonly kind = 'connector'
  readonly id = 'connector-http'
  readonly name = 'HTTP Connector'
  readonly version = '1.0.0'
  readonly protocol = 'http' as const

  async call(action: string, payload: Record<string, unknown>, ctx: RuntimeContext): Promise<ConnectorResult> {
    const endpoint = ctx.config.httpEndpoint as string | undefined
    if (!endpoint) {
      // 无外部端点时本地回显，保证离线可独立运行
      return { ok: true, data: { action, echoed: payload } }
    }
    try {
      const res = await fetch(endpoint, {
        method: action === 'get' ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: action === 'get' ? undefined : JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      return { ok: res.ok, data }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async listen(
    handler: (event: InboundEvent) => void,
    ctx: RuntimeContext,
  ): Promise<() => void> {
    const endpoint = ctx.config.inboundEndpoint as string | undefined
    if (!endpoint) return () => {}
    // 简化演示：Webhook 轮询；生产可替换为 WebSocket / 长连接。
    const timer = setInterval(async () => {
      try {
        const res = await fetch(endpoint)
        const data = await res.json().catch(() => null)
        if (data) handler({ source: 'http', type: 'inbound', payload: data })
      } catch {
        /* 忽略瞬时错误 */
      }
    }, 5000)
    return () => clearInterval(timer)
  }
}

/** MCP 桥接连接器：把调用委托给外部注入的 MCP 调用函数，零耦合对接现有实现。 */
export class McpBridgeConnector implements Connector {
  readonly kind = 'connector'
  readonly id = 'connector-mcp-bridge'
  readonly name = 'MCP Bridge Connector'
  readonly version = '1.0.0'
  readonly protocol = 'mcp' as const

  /** 由宿主注入：实际调用 src/mcp/manager 的函数。 */
  constructor(
    private readonly delegate: (tool: string, args: Record<string, unknown>) => Promise<unknown>,
  ) {}

  async call(action: string, payload: Record<string, unknown>, _ctx: RuntimeContext): Promise<ConnectorResult> {
    try {
      const data = await this.delegate(action, payload)
      return { ok: true, data }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }
}
