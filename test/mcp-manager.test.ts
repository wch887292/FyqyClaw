import { describe, it, expect, vi, afterEach } from 'vitest'
import { MCPServerManager } from '@mcp/manager'
import type { MCPServerConfig, MCPTool } from '@mcp/types'

function makeServer(overrides: Partial<MCPServerConfig> = {}): MCPServerConfig {
  return {
    id: 's1', name: 'Test', transport: 'http', enabled: true,
    permissions: { allowNetwork: true, allowFileAccess: false, allowCommandExecution: false, riskLevel: 'low' },
    ...overrides,
  }
}

const tool: MCPTool = {
  serverId: 's1', name: 'echo', description: 'echo', inputSchema: {}, requiresConfirmation: false,
}

describe('MCPServerManager 真实工具调用', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('http 传输真实调用（mock fetch）返回真实结果', async () => {
    vi.stubGlobal('fetch', async () => ({
      json: async () => ({ result: { content: [{ type: 'text', text: 'pong' }], isError: false } }),
    }))
    const mgr = new MCPServerManager()
    await mgr.registerServer(makeServer({ endpoint: 'http://localhost:9000/mcp' }))
    mgr.registerTool(tool)
    const res = await mgr.callTool('s1', 'echo', { msg: 'ping' })
    expect(res.success).toBe(true)
    expect(res.data).toEqual({ content: [{ type: 'text', text: 'pong' }], isError: false })
  })

  it('无可用传输通道时明确回退为模拟，success=false', async () => {
    const mgr = new MCPServerManager()
    await mgr.registerServer(makeServer({ transport: 'http', endpoint: undefined }))
    mgr.registerTool(tool)
    const res = await mgr.callTool('s1', 'echo', {})
    expect(res.success).toBe(false)
    expect(JSON.stringify(res.data)).toContain('模拟执行')
    expect(res.error).toBeTruthy()
  })

  it('被禁用 / 不存在的 server 直接报错', async () => {
    const mgr = new MCPServerManager()
    await mgr.registerServer(makeServer({ enabled: false }))
    mgr.registerTool(tool)
    const res = await mgr.callTool('s1', 'echo', {})
    expect(res.success).toBe(false)
    expect(res.error).toContain('disabled')
  })
})
