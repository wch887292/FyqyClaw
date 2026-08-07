import type { MCPServerConfig, MCPTool, MCPCallResult, MCPResource } from './types'

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
    console.log(`[MCP] Server registered: ${config.name} (${config.id})`)
    return true
  }

  unregisterServer(serverId: string): void {
    this.servers.delete(serverId)
    // Clean up tools and resources for this server
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
    const key = `${tool.serverId}:${tool.name}`
    this.tools.set(key, tool)
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

    const startTime = Date.now()

    try {
      // Simulate tool execution
      const result = await this.executeToolCall(server, tool, args)
      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      }
    }
  }

  private async executeToolCall(
    server: MCPServerConfig,
    tool: MCPTool,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    // In production, this would communicate with the actual MCP server process/endpoint
    return {
      tool: tool.name,
      server: server.name,
      args,
      result: `模拟执行: ${tool.name}`,
      timestamp: new Date().toISOString(),
    }
  }
}