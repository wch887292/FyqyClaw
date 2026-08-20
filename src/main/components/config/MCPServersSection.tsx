import React, { useState, useEffect, useRef } from 'react'
import { type MCPServer } from '../../mock-data'
import { MCPServerManager } from '@mcp/manager'

const LOG_PREFIX = '[Config-MCP]'

// 真实管理器实例：注册/删除会同步到内存中的 MCP 管理器（供引擎/ApiServer 使用）
const mcpManager = new MCPServerManager()

// 将真实管理器中的配置映射为 UI 展示结构（不再使用任何伪造的「已连接」示例）
function toUiServer(c: ReturnType<MCPServerManager['getServers']>[number]): MCPServer {
  return {
    id: c.id,
    name: c.name,
    transport: c.transport,
    endpoint: c.endpoint ?? c.command ?? '',
    status: c.enabled ? 'connected' : 'disconnected',
    toolsCount: 0,
    description: '',
  }
}

export function MCPServersSection() {
  const [servers, setServers] = useState<MCPServer[]>(() => mcpManager.getServers().map(toUiServer))
  const [showAddForm, setShowAddForm] = useState(false)
  const [form, setForm] = useState({ name: '', transport: 'http' as 'http' | 'stdio' | 'ws', endpoint: '', description: '' })
  const prevServersRef = useRef(servers)

  // 组件挂载时打印初始服务器列表
  useEffect(() => {
    console.group(`${LOG_PREFIX} 组件挂载`)
    console.log('时间:', new Date().toISOString())
    console.log('MCP 服务器数量:', servers.length)
    servers.forEach(s => {
      const statusIcon = s.status === 'connected' ? '✅' : s.status === 'error' ? '❌' : '⏹'
      console.log(`  ${statusIcon} [${s.id}] ${s.name} | 传输: ${s.transport} | 端点: ${s.endpoint} | 状态: ${s.status} | 工具数: ${s.toolsCount}`)
    })
    console.groupEnd()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // showAddForm 状态变化时打印
  useEffect(() => {
    console.log(`${LOG_PREFIX} 添加表单状态:`, showAddForm ? '已展开' : '已收起')
  }, [showAddForm])

  // 服务器列表变化时打印
  useEffect(() => {
    if (prevServersRef.current !== servers) {
      const added = servers.filter(s => !prevServersRef.current.find(p => p.id === s.id))
      const removed = prevServersRef.current.filter(p => !servers.find(s => s.id === p.id))
      const changed = servers.filter(s => {
        const old = prevServersRef.current.find(p => p.id === s.id)
        return old && old.status !== s.status
      })

      console.group(`${LOG_PREFIX} 服务器列表变更`)
      if (added.length) console.log('新增:', added.map(s => `${s.name}(${s.id})`).join(', '))
      if (removed.length) console.log('移除:', removed.map(s => `${s.name}(${s.id})`).join(', '))
      if (changed.length) {
        console.log('状态变化:')
        changed.forEach(s => {
          const old = prevServersRef.current.find(p => p.id === s.id)
          console.log(`  ${s.name}: ${old?.status} → ${s.status}`)
        })
      }
      console.log('当前总服务器数:', servers.length)
      console.groupEnd()
      prevServersRef.current = servers
    }
  }, [servers])

  const removeServer = (id: string) => {
    const target = servers.find(s => s.id === id)
    console.group(`${LOG_PREFIX} removeServer`)
    console.log('操作: 删除 MCP 服务器')
    console.log('服务器ID:', id)
    console.log('服务器名称:', target?.name)
    console.log('当前状态:', target?.status)
    console.log('端点:', target?.endpoint)
    console.log('传输协议:', target?.transport)
    console.log('时间戳:', Date.now())
    console.groupEnd()

    // 同步到真实 MCP 管理器
    mcpManager.unregisterServer(id)
    setServers(prev => prev.filter(s => s.id !== id))
  }

  const handleRegister = () => {
    if (!form.name.trim() || !form.endpoint.trim()) {
      console.warn(`${LOG_PREFIX} 注册失败: 名称与端点为必填`)
      return
    }
    const id = `mcp-${Date.now()}`
    const config = {
      id,
      name: form.name.trim(),
      transport: form.transport,
      endpoint: form.transport === 'http' || form.transport === 'ws' ? form.endpoint.trim() : undefined,
      command: form.transport === 'stdio' ? form.endpoint.trim() : undefined,
      args: form.transport === 'stdio' ? [] : undefined,
      enabled: true,
      permissions: { allowNetwork: true, allowFileAccess: false, allowCommandExecution: false, riskLevel: 'medium' as const },
    }
    // 同步到真实 MCP 管理器
    mcpManager.registerServer(config)
    const entry: MCPServer = {
      id,
      name: config.name,
      transport: config.transport,
      endpoint: config.endpoint || config.command || '',
      description: form.description.trim(),
      status: 'disconnected',
      toolsCount: 0,
    }
    console.group(`${LOG_PREFIX} 注册 MCP 服务器`)
    console.log('操作: 注册新服务器')
    console.log('配置:', config)
    console.log('当前已注册服务器数:', mcpManager.getServers().length)
    console.groupEnd()
    setServers(prev => [...prev, entry])
    setForm({ name: '', transport: 'http', endpoint: '', description: '' })
    setShowAddForm(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 4 }}>
            MCP 服务器管理
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            注册和管理 MCP（Model Context Protocol）工具服务器
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 6,
            border: '1px solid var(--accent-blue)',
            background: showAddForm ? 'transparent' : 'var(--accent-blue)',
            color: showAddForm ? 'var(--accent-blue)' : 'white',
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.12s',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {showAddForm ? '取消' : '添加服务器'}
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 10,
          border: '1px solid var(--border-color)',
          padding: 20,
          marginBottom: 20,
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 16 }}>
            注册新 MCP 服务器
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>名称</label>
              <input
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="MCP 服务器名称" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>传输协议</label>
              <select
                value={form.transport}
                onChange={e => setForm(p => ({ ...p, transport: e.target.value as 'http' | 'stdio' | 'ws' }))}
                style={selectStyle}>
                <option value="http">HTTP</option>
                <option value="stdio">STDIO</option>
                <option value="ws">WebSocket</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>端点地址</label>
              <input
                value={form.endpoint}
                onChange={e => setForm(p => ({ ...p, endpoint: e.target.value }))}
                placeholder="http://localhost:3100 或 npx @modelcontextprotocol/server-xxx" style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>描述</label>
              <input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="服务器功能描述" style={{ ...inputStyle, width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleRegister}
              style={{
                padding: '8px 20px', borderRadius: 6,
                border: 'none', background: 'var(--accent-blue)',
                color: 'white', fontSize: 13, cursor: 'pointer',
              }}
            >
              注册
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              style={{
                padding: '8px 20px', borderRadius: 6,
                border: '1px solid var(--border-color)', background: 'transparent',
                color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Server List */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 10,
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 100px 2fr 120px 80px 60px',
          gap: 12,
          padding: '12px 16px',
          background: 'var(--bg-tertiary)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          <span>名称</span>
          <span>传输协议</span>
          <span>端点</span>
          <span>状态</span>
          <span>工具数</span>
          <span>操作</span>
        </div>

        {servers.map((server, i) => (
          <div
            key={server.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 100px 2fr 120px 80px 60px',
              gap: 12,
              padding: '12px 16px',
              borderTop: '1px solid var(--border-color)',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <div>
              <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{server.name}</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>{server.description}</div>
            </div>
            <div style={{
              fontSize: 12, color: 'var(--text-secondary)',
              fontFamily: 'monospace',
            }}>
              {server.transport.toUpperCase()}
            </div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {server.endpoint}
            </div>
            <div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12,
                color: server.status === 'connected' ? 'var(--accent-green)'
                  : server.status === 'error' ? 'var(--accent-red)'
                  : 'var(--text-secondary)',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: server.status === 'connected' ? 'var(--accent-green)'
                    : server.status === 'error' ? 'var(--accent-red)'
                    : 'var(--text-secondary)',
                }} />
                {server.status === 'connected' ? '已连接' : server.status === 'error' ? '错误' : '未连接'}
              </span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{server.toolsCount}</div>
            <div>
              <button
                onClick={() => removeServer(server.id)}
                style={{
                  padding: '2px 6px', borderRadius: 4,
                  border: 'none', background: 'transparent',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                  fontSize: 12,
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-red)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{
        marginTop: 24,
        padding: 16,
        background: 'rgba(78,201,176,0.06)',
        borderRadius: 10,
        border: '1px solid rgba(78,201,176,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div>
            <div style={{ fontSize: 13, color: 'var(--accent-green)', fontWeight: 500, marginBottom: 4 }}>
              什么是 MCP？
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Model Context Protocol (MCP) 是一种开放协议，允许 AI 模型通过标准化接口与外部工具和数据源交互。
              通过注册 MCP 服务器，AI 智能体可以获取文件系统、Git 仓库、数据库、Web API 等外部能力。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6,
  border: '1px solid var(--border-color)',
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  fontSize: 13, outline: 'none',
  width: '100%',
}

const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 6,
  border: '1px solid var(--border-color)',
  background: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  fontSize: 13, outline: 'none', cursor: 'pointer',
  width: '100%',
}