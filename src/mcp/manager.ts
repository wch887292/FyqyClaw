import { spawn } from 'child_process'
import type { MCPServerConfig, MCPTool, MCPCallResult, MCPResource } from './types'

interface JsonRpcResponse {
  result: unknown
  isError: boolean
}

export class MCPServerManager {
  private servers: Map<string, MCPServerConfig> = new Map()
  private tools: Map<string, MCPTool> = new Map()
  private resources: Map<string, MCPResource> = new Map()

  async registerServer(config: MCPServerConfig): Promise<boolean> {
    if (this.servers.has(config.id)) {
      console.warn(`[MCP] Server ${config.id} already registered`)
      return false
    }
    this.servers.set(config.id, config)
    console.log(`[MCP] Server registered: ${config.name} (${config.id}) [transport=${config.transport}]`)
    return true
  }

  unregisterServer(serverId: string): void {
    this.servers.delete(serverId)
    for (const [key, tool] of this.tools) {
      if (tool.serverId === serverId) this.tools.delete(key)
    }
    for (const [key, resource] of this.resources) {
      if (resource.serverId === serverId) this.resources.delete(key)
    }
    console.log(`[MCP] Server unregistered: ${serverId}`)
  }

  getServer(serverId: string): MCPServerConfig | undefined {
    return this.servers.get(serverId)
  }

  getServers(): MCPServerConfig[] {
    return Array.from(this.servers.values())
  }

  getEnabledServers(): MCPServerConfig[] {
    return this.getServers().filter(s => s.enabled)
  }

  registerTool(tool: MCPTool): void {
    this.tools.set(`${tool.serverId}:${tool.name}`, tool)
  }

  getTool(serverId: string, toolName: string): MCPTool | undefined {
    return this.tools.get(`${serverId}:${toolName}`)
  }

  getTools(serverId?: string): MCPTool[] {
    const all = Array.from(this.tools.values())
    return serverId ? all.filter(t => t.serverId === serverId) : all
  }

  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource)
  }

  getResources(serverId?: string): MCPResource[] {
    const all = Array.from(this.resources.values())
    return serverId ? all.filter(r => r.serverId === serverId) : all
  }

  async callTool(serverId: string, toolName: string, args: Record<string, unknown>): Promise<MCPCallResult> {
    const server = this.servers.get(serverId)
    if (!server) {
      return { success: false, error: `MCP Server not found: ${serverId}`, executionTime: 0 }
    }
    if (!server.enabled) {
      return { success: false, error: `MCP Server is disabled: ${serverId}`, executionTime: 0 }
    }

    const tool = this.getTool(serverId, toolName)
    if (!tool) {
      return { success: false, error: `Tool not found: ${serverId}:${toolName}`, executionTime: 0 }
    }

    return this.executeToolCall(server, tool, args)
  }

  /**
   * 真实调用 MCP server（http/stdio JSON-RPC）。
   * 当没有可用传输通道或调用失败时，明确回退为「模拟执行」并返回 success:false，
   * 绝不伪装成真实成功结果。
   */
  private async executeToolCall(
    server: MCPServerConfig,
    tool: MCPTool,
    args: Record<string, unknown>,
  ): Promise<MCPCallResult> {
    const startTime = Date.now()
    const params = { name: tool.name, arguments: args }

    try {
      if (server.transport === 'http' && server.endpoint) {
        const res = await this.callJsonRpcHttp(server, 'tools/call', params)
        return {
          success: !res.isError,
          data: res.result,
          executionTime: Date.now() - startTime,
        }
      }
      if ((server.transport === 'stdio' || server.transport === 'ws') && server.command) {
        const res = await this.callJsonRpcStdio(server, 'tools/call', params)
        return {
          success: !res.isError,
          data: res.result,
          executionTime: Date.now() - startTime,
        }
      }
    } catch (error) {
      return {
        success: false,
        data: this.simulatedResult(server, tool, args),
        error: `真实调用失败，已回退模拟: ${error instanceof Error ? error.message : String(error)}`,
        executionTime: Date.now() - startTime,
      }
    }

    // 无可用传输通道 -> 明确模拟，不假装成功
    return {
      success: false,
      data: this.simulatedResult(server, tool, args),
      error: '未配置可用的传输通道（endpoint/command），返回模拟结果',
      executionTime: Date.now() - startTime,
    }
  }

  private async callJsonRpcHttp(
    server: MCPServerConfig,
    method: string,
    params: Record<string, unknown>,
    timeoutMs = 15000,
  ): Promise<JsonRpcResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (server.apiKey) headers['Authorization'] = `Bearer ${server.apiKey}`
    if (server.auth?.type === 'api-key' && server.auth.credentials?.['x-api-key']) {
      headers['x-api-key'] = server.auth.credentials['x-api-key']
    }

    const resp = await fetch(server.endpoint!, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const json = (await resp.json()) as { result?: Record<string, unknown>; error?: { message?: string } }
    if (json.error) throw new Error(json.error.message || 'MCP HTTP 返回错误')
    return { result: json.result, isError: Boolean((json.result as Record<string, unknown>)?.isError) }
  }

  private callJsonRpcStdio(
    server: MCPServerConfig,
    method: string,
    params: Record<string, unknown>,
    timeoutMs = 15000,
  ): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      const child = spawn(server.command!, server.args ?? [], { stdio: ['pipe', 'pipe', 'pipe'] })
      const requests = [
        JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'initialize',
          params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'FyqyClaw', version: '1.1.0' } },
        }),
        JSON.stringify({ jsonrpc: '2.0', id: 2, method, params }),
      ]
      let buffer = ''

      const timer = setTimeout(() => {
        child.kill()
        reject(new Error('MCP stdio 调用超时'))
      }, timeoutMs)

      child.stdout.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        let idx: number
        while ((idx = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, idx).trim()
          buffer = buffer.slice(idx + 1)
          if (!line) continue
          try {
            const msg = JSON.parse(line) as { id?: number; result?: Record<string, unknown> }
            if (msg.id === 2) {
              clearTimeout(timer)
              child.kill()
              resolve({ result: msg.result, isError: Boolean(msg.result?.isError) })
              return
            }
          } catch {
            /* 忽略非 JSON 行 */
          }
        }
      })

      child.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })

      child.on('close', () => {
        clearTimeout(timer)
        reject(new Error('MCP server 进程意外退出'))
      })

      for (const r of requests) child.stdin.write(r + '\n')
    })
  }

  private simulatedResult(server: MCPServerConfig, tool: MCPTool, args: Record<string, unknown>): unknown {
    return {
      tool: tool.name,
      server: server.name,
      args,
      result: `模拟执行: ${tool.name}`,
      note: '此结果为模拟，未连接到真实 MCP server',
      timestamp: new Date().toISOString(),
    }
  }
}
