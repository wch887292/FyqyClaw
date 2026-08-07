import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useAppStore } from '../stores/app-store'
import { useChatStore } from '../stores/chat-store'
import { useResizable } from '../hooks/useResizable'
import { modelManager, configureAgentEngine } from './solo-engine'

type SubPanel = 'chat' | 'context' | 'tasks'

export function RightAIPanel() {
  const visible = useAppStore(s => s.rightPanelVisible)
  const panelWidth = useAppStore(s => s.rightPanelWidth)
  const setPanelWidth = useAppStore(s => s.setRightPanelWidth)
  const setVisible = useAppStore(s => s.setRightPanelVisible)

  const [activeSubPanel, setActiveSubPanel] = useState<SubPanel>('chat')

  const { resizerRef, handleMouseDown } = useResizable({
    initialSize: panelWidth,
    direction: 'horizontal',
    invert: true,
    onSizeChange: setPanelWidth,
  })

  if (!visible) return null

  return (
    <div style={{
      width: panelWidth,
      background: 'var(--bg-primary)',
      borderLeft: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'relative',
      animation: 'slideInRight 0.15s ease-out',
    }}>
      <div ref={resizerRef} onMouseDown={handleMouseDown} style={{ position: 'absolute', left: -3, top: 0, bottom: 0, width: 5, cursor: 'col-resize', zIndex: 10 }} />
      <div style={{ height: 35, background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', borderBottom: '1px solid var(--border-color)', flexShrink: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>AI 交互</span>
        <button onClick={() => setVisible(false)} title="关闭面板" style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', borderRadius: 3, display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        {([{ id: 'chat' as SubPanel, label: '对话', icon: '💬' }, { id: 'context' as SubPanel, label: '上下文', icon: '📎' }, { id: 'tasks' as SubPanel, label: '任务进度', icon: '📋' }]).map(tab => (
          <button key={tab.id} onClick={() => setActiveSubPanel(tab.id)} style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, padding: '6px 8px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 11,
            color: activeSubPanel === tab.id ? 'var(--text-highlight)' : 'var(--text-secondary)',
            borderBottom: activeSubPanel === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
            transition: 'color 0.12s, border-color 0.12s',
          }}>
            <span>{tab.icon}</span><span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {activeSubPanel === 'chat' && <ChatPanel />}
        {activeSubPanel === 'context' && <ContextPanel />}
        {activeSubPanel === 'tasks' && <TaskProgressPanel />}
      </div>
    </div>
  )
}

function ChatPanel() {
  const messages = useChatStore(s => s.messages)
  const isProcessing = useChatStore(s => s.isProcessing)
  const inputValue = useChatStore(s => s.inputValue)
  const addMessage = useChatStore(s => s.addMessage)
  const setInputValue = useChatStore(s => s.setInputValue)
  const setProcessing = useChatStore(s => s.setProcessing)
  const activeModel = useAppStore(s => s.activeModel)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [isVoiceSupported] = useState(!!navigator.mediaDevices?.getUserMedia)
  const [isRecording, setIsRecording] = useState(false)
  const [userScrolledUp, setUserScrolledUp] = useState(false)

  // Configure AI model when active model changes
  useEffect(() => {
    configureAgentEngine(activeModel)
  }, [activeModel])

  // Only auto-scroll when user is near bottom (within 100px threshold)
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    if (userScrolledUp) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, userScrolledUp])

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
    setUserScrolledUp(!isNearBottom)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isProcessing) return
    const msg = inputValue.trim()
    setInputValue('')
    addMessage({ role: 'user', content: msg, timestamp: Date.now() })
    setProcessing(true)

    // Check if model is configured
    if (!activeModel) {
      addMessage({
        role: 'assistant',
        content: '⚠️ 未配置 AI 模型。\n\n请通过以下方式配置：\n1. 点击顶部菜单栏的模型状态指示器\n2. 或使用快捷键 Ctrl+Alt+M\n3. 或前往「设置 → AI 模型」',
        timestamp: Date.now(),
      })
      setProcessing(false)
      return
    }

    try {
      // Build conversation context from recent messages
      const conversationMessages = [...messages, { role: 'user' as const, content: msg, timestamp: Date.now() }]
        .slice(-10) // Keep last 10 messages for context
        .map(m => ({ role: m.role, content: m.content }))
        .filter(m => m.role === 'user' || m.role === 'assistant')

      // Add system prompt
      const aiMessages = [
        { role: 'system' as const, content: '你是一个智能AI助手，帮助用户进行软件开发、代码分析和问题解答。请用中文回答。' },
        ...conversationMessages,
      ]

      const response = await modelManager.complete({
        model: activeModel.modelId || activeModel.modelName,
        messages: aiMessages,
        temperature: activeModel.temperature ?? 0.7,
        maxTokens: activeModel.maxTokens ?? 4096,
      })

      addMessage({
        role: 'assistant',
        content: response.content || 'AI 模型未返回有效响应，请重试。',
        timestamp: Date.now(),
      })
    } catch (error: any) {
      console.error('[RightAIPanel] AI 调用失败:', error)
      addMessage({
        role: 'assistant',
        content: `❌ AI 调用出错: ${error?.message || '未知错误'}\n\n请检查：\n1. 模型配置是否正确\n2. API Key 是否有效\n3. 网络连接是否正常`,
        timestamp: Date.now(),
      })
    } finally {
      setProcessing(false)
    }
  }, [inputValue, isProcessing, messages, activeModel, addMessage, setInputValue, setProcessing])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const handleVoiceToggle = async () => {
    if (isRecording) {
      setIsRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setIsRecording(true)
      const mimeType = 'audio/webm'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      const chunks: BlobPart[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        setIsRecording(false)
        addMessage({ role: 'user', content: '[语音输入] 已识别语音请求', timestamp: Date.now() })
        setProcessing(true)
        setTimeout(() => {
          addMessage({ role: 'assistant', content: '已收到语音输入，正在处理您的请求...', timestamp: Date.now() })
          setProcessing(false)
        }, 1000)
      }
      mediaRecorder.start()
      setTimeout(() => { if (mediaRecorder.state === 'recording') mediaRecorder.stop() }, 5000)
    } catch {
      setIsRecording(false)
    }
  }

  return (
    <>
      <div ref={messagesContainerRef} onScroll={handleScroll} style={{ flex: 1, overflow: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 12 }}>
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>🤖</div>
            <div>开始与 AI 对话</div>
            <div style={{ marginTop: 4, opacity: 0.7 }}>支持文本和语音输入</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '90%', padding: '8px 10px', borderRadius: 6,
            background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-tertiary)', color: 'var(--text-primary)',
            fontSize: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          }}>
            {msg.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <textarea value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="输入需求，Ctrl+Enter 发送..." rows={2}
            style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--text-primary)', fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.4 }}
          />
          <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
            {isVoiceSupported && (
              <button onClick={handleVoiceToggle} title={isRecording ? '停止录音' : '语音输入'}
                style={{
                  padding: '6px 8px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 14,
                  background: isRecording ? 'var(--accent-red)' : 'var(--bg-tertiary)', color: isRecording ? 'white' : 'var(--text-secondary)',
                  transition: 'background 0.12s', animation: isRecording ? 'pulse 1s infinite' : 'none',
                }}
              >
                🎤
              </button>
            )}
            <button onClick={handleSubmit} disabled={isProcessing || !inputValue.trim()}
              style={{
                padding: '6px 14px', background: isProcessing || !inputValue.trim() ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                color: isProcessing || !inputValue.trim() ? 'var(--text-secondary)' : 'white', border: 'none', borderRadius: 4,
                cursor: isProcessing || !inputValue.trim() ? 'not-allowed' : 'pointer', fontSize: 12, height: 36, transition: 'background 0.12s',
              }}
            >
              {isProcessing ? '...' : '发送'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

function ContextPanel() {
  const [contextItems, setContextItems] = useState<Array<{ type: string; name: string; priority: number; scope: string }>>([
    { type: 'file', name: 'src/main/App.tsx', priority: 1, scope: '全局' },
    { type: 'file', name: 'src/main/components/AppLayout.tsx', priority: 2, scope: '全局' },
    { type: 'folder', name: 'src/main/stores', priority: 3, scope: '状态管理' },
    { type: 'doc', name: '开发官方文档.md', priority: 4, scope: '参考' },
  ])
  const [showScopeFilter, setShowScopeFilter] = useState(false)

  const getTypeIcon = (type: string) => {
    switch (type) { case 'file': return '📄'; case 'folder': return '📁'; case 'doc': return '📝'; case 'terminal': return '💻'; default: return '📎' }
  }

  const movePriority = (index: number, direction: 'up' | 'down') => {
    setContextItems(prev => {
      const items = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= items.length) return prev
      const temp = items[index].priority
      items[index] = { ...items[index], priority: items[target].priority }
      items[target] = { ...items[target], priority: temp }
      ;[items[index], items[target]] = [items[target], items[index]]
      return items
    })
  }

  const sortedItems = [...contextItems].sort((a, b) => a.priority - b.priority)

  return (
    <div style={{ padding: 8, fontSize: 12, overflow: 'auto', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>已挂载上下文 ({contextItems.length})</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowScopeFilter(!showScopeFilter)} style={{
            background: 'none', border: 'none', color: showScopeFilter ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 3,
          }}>
            范围筛选
          </button>
          <button onClick={() => {
            setContextItems(prev => [...prev, { type: 'file', name: `新文件 ${prev.length + 1}`, priority: prev.length + 1, scope: '自定义' }])
          }} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 3 }}>
            + 添加
          </button>
        </div>
      </div>
      {showScopeFilter && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
          {['全部', '全局', '状态管理', '参考', '自定义'].map(scope => (
            <button key={scope} style={{
              padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 10, cursor: 'pointer',
            }}>
              {scope}
            </button>
          ))}
        </div>
      )}
      {sortedItems.map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', transition: 'background 0.08s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <span>{getTypeIcon(item.type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.6 }}>{item.scope}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <button onClick={() => movePriority(i, 'up')} disabled={i === 0}
              style={{ background: 'none', border: 'none', color: i === 0 ? 'var(--border-color)' : 'var(--text-secondary)', cursor: i === 0 ? 'not-allowed' : 'pointer', padding: '2px', fontSize: 10, lineHeight: 1 }}>
              ▲
            </button>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '1px 4px', borderRadius: 3, minWidth: 18, textAlign: 'center' }}>
              P{item.priority}
            </span>
            <button onClick={() => movePriority(i, 'down')} disabled={i === sortedItems.length - 1}
              style={{ background: 'none', border: 'none', color: i === sortedItems.length - 1 ? 'var(--border-color)' : 'var(--text-secondary)', cursor: i === sortedItems.length - 1 ? 'not-allowed' : 'pointer', padding: '2px', fontSize: 10, lineHeight: 1 }}>
              ▼
            </button>
          </div>
          <button onClick={() => setContextItems(prev => prev.filter((_, j) => j !== i))}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px 4px', fontSize: 12, opacity: 0.5 }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>
            ×
          </button>
        </div>
      ))}
      {contextItems.length === 0 && (
        <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 11 }}>
          暂无上下文，请先打开文件或添加资源
        </div>
      )}
    </div>
  )
}

function TaskProgressPanel() {
  const currentTask = useChatStore(s => s.currentTask)
  const isProcessing = useChatStore(s => s.isProcessing)
  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  const renderStepStatus = (status: string) => {
    switch (status) { case 'pending': return '⏳'; case 'running': return '🔄'; case 'completed': return '✅'; case 'failed': return '❌'; default: return '⏹️' }
  }

  return (
    <div style={{ padding: 8, fontSize: 12, overflow: 'auto', flex: 1 }}>
      {currentTask && currentTask.steps.length > 0 ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{currentTask.description}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <button title="暂停" style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>⏸</button>
              <button title="继续" style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}>▶</button>
              <button title="终止" style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 11, color: 'var(--accent-red)' }}>⏹</button>
            </div>
          </div>
          {currentTask.steps.map(step => (
            <div key={step.id}>
              <div
                onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 6, padding: '5px 6px', borderRadius: 4, marginBottom: 2, cursor: 'pointer',
                  background: step.status === 'running' ? 'var(--bg-tertiary)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (step.status !== 'running') e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (step.status !== 'running') e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ flexShrink: 0, marginTop: 1 }}>{renderStepStatus(step.status)}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: step.status === 'completed' ? 'var(--text-secondary)' : step.status === 'running' ? 'var(--accent-green)' : step.status === 'failed' ? 'var(--accent-red)' : 'var(--text-primary)',
                  }}>
                    {step.description}
                  </div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5 }}>{expandedStep === step.id ? '▲' : '▼'}</span>
              </div>
              {expandedStep === step.id && step.output && (
                <div style={{
                  margin: '0 6px 4px 28px', padding: '6px 8px', borderRadius: 4, background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)', fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, fontFamily: 'monospace', whiteSpace: 'pre-wrap',
                }}>
                  {step.output}
                </div>
              )}
            </div>
          ))}
        </>
      ) : (
        <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 11 }}>
          {isProcessing ? (
            <div><div style={{ fontSize: 24, marginBottom: 8 }}>🔄</div><div>正在处理中...</div></div>
          ) : (
            <div><div style={{ fontSize: 24, marginBottom: 8, opacity: 0.5 }}>📋</div><div>暂无进行中的任务</div><div style={{ marginTop: 4, opacity: 0.7 }}>在对话区输入需求后，任务进度将在此展示</div></div>
          )}
        </div>
      )}
    </div>
  )
}