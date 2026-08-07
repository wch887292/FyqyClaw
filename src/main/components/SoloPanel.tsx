import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useChatStore } from '../stores/chat-store'
import { useEditorStore } from '../stores/editor-store'
import { useAppStore } from '../stores/app-store'
import { agentEngine, configureAgentEngine } from './solo-engine'
import type { AgentTask } from '@shared/types/ai'

// 简单的 Markdown 渲染：将纯文本转换为带样式的 HTML
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null

  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let codeBlockLanguage = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // 代码块开始/结束
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // 结束代码块
        elements.push(
          <pre key={`code-${i}`} style={{
            background: '#1e1e1e',
            borderRadius: 6,
            padding: '12px 16px',
            overflow: 'auto',
            fontSize: 12,
            lineHeight: 1.5,
            fontFamily: "'Cascadia Code', 'Fira Code', monospace",
            margin: '8px 0',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <code>{codeBlockContent.join('\n')}</code>
          </pre>
        )
        codeBlockContent = []
        inCodeBlock = false
        codeBlockLanguage = ''
      } else {
        inCodeBlock = true
        codeBlockLanguage = line.slice(3).trim()
        codeBlockContent = []
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent.push(line)
      continue
    }

    // 标题
    if (line.startsWith('## ')) {
      elements.push(
        <div key={`h2-${i}`} style={{
          fontSize: 16, fontWeight: 600, color: 'var(--text-highlight)',
          marginTop: 16, marginBottom: 8,
        }}>
          {line.slice(3)}
        </div>
      )
      continue
    }
    if (line.startsWith('### ')) {
      elements.push(
        <div key={`h3-${i}`} style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          marginTop: 12, marginBottom: 6,
        }}>
          {line.slice(4)}
        </div>
      )
      continue
    }

    // 分隔线
    if (line.startsWith('---') || line.startsWith('***')) {
      elements.push(
        <div key={`hr-${i}`} style={{
          borderTop: '1px solid var(--border-color)',
          margin: '12px 0',
        }} />
      )
      continue
    }

    // 列表项
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} style={{
          paddingLeft: 16, marginBottom: 2, fontSize: 13,
          lineHeight: 1.6, color: 'var(--text-primary)',
        }}>
          • {renderInline(line.slice(2))}
        </div>
      )
      continue
    }

    // 空行
    if (line.trim() === '') {
      elements.push(<div key={`empty-${i}`} style={{ height: 4 }} />)
      continue
    }

    // 普通段落
    elements.push(
      <div key={`p-${i}`} style={{
        marginBottom: 4, fontSize: 13, lineHeight: 1.6,
        color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {renderInline(line)}
      </div>
    )
  }

  return elements
}

function renderInline(text: string): React.ReactNode {
  // 处理行内代码 `code`
  const parts = text.split(/(`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{
          background: 'rgba(255,255,255,0.08)',
          padding: '1px 4px',
          borderRadius: 3,
          fontSize: 12,
          fontFamily: "'Cascadia Code', monospace",
        }}>
          {part.slice(1, -1)}
        </code>
      )
    }
    // 处理粗体 **text**
    const boldParts = part.split(/(\*\*[^*]+\*\*)/g)
    return boldParts.map((bp, j) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        return <strong key={`b-${i}-${j}`} style={{ fontWeight: 600 }}>{bp.slice(2, -2)}</strong>
      }
      return bp
    })
  })
}

export function SoloPanel() {
  const messages = useChatStore(s => s.messages)
  const currentTask = useChatStore(s => s.currentTask)
  const isProcessing = useChatStore(s => s.isProcessing)
  const inputValue = useChatStore(s => s.inputValue)
  const addMessage = useChatStore(s => s.addMessage)
  const setProcessing = useChatStore(s => s.setProcessing)
  const setInputValue = useChatStore(s => s.setInputValue)
  const setCurrentTask = useChatStore(s => s.setCurrentTask)
  const updateTask = useChatStore(s => s.updateTask)
  const openFile = useEditorStore(s => s.openFile)
  const activeModel = useAppStore(s => s.activeModel)
  const setModelConfigOpen = useAppStore(s => s.setModelConfigOpen)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Configure AI model when active model changes
  useEffect(() => {
    configureAgentEngine(activeModel)
  }, [activeModel])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentTask])

  // Set up agent progress callback
  useEffect(() => {
    agentEngine.setOnProgress((task: AgentTask) => {
      updateTask(task)
    })
  }, [updateTask])

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isProcessing) return

    const userMessage = inputValue.trim()
    setInputValue('')
    addMessage({ role: 'user', content: userMessage, timestamp: Date.now() })
    setProcessing(true)

    try {
      // Execute task via agent engine
      const task = await agentEngine.executeTask(userMessage)

      // Add result message
      const resultContent = task.status === 'completed'
        ? `✅ **任务完成**\n\n${task.result || '所有步骤已成功执行'}\n\n` +
          task.steps.map(s => `  - ${s.status === 'completed' ? '✅' : '❌'} ${s.description}`).join('\n')
        : `❌ **任务失败**\n\n${task.error || '执行过程中出现错误'}`

      addMessage({
        role: 'assistant',
        content: resultContent,
        timestamp: Date.now(),
      })
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: `❌ 执行出错: ${error}`,
        timestamp: Date.now(),
      })
    } finally {
      setProcessing(false)
      setCurrentTask(null)
    }
  }, [inputValue, isProcessing, addMessage, setInputValue, setProcessing, setCurrentTask, updateTask])

  const handleTemplateClick = useCallback((template: string) => {
    setInputValue(template)
  }, [setInputValue])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const renderStepStatus = (status: string) => {
    switch (status) {
      case 'pending': return '⏳'
      case 'running': return '🔄'
      case 'completed': return '✅'
      case 'failed': return '❌'
      default: return '⏹️'
    }
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
    }}>
      {/* Header */}
      <div style={{
        height: 35,
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid var(--border-color)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-primary)',
        gap: 8,
      }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span>SOLO 智能体</span>
        {isProcessing && (
          <span style={{
            marginLeft: 8,
            fontSize: 11,
            color: 'var(--accent-green)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: 'var(--accent-green)',
              animation: 'pulse 1s infinite',
            }} />
            处理中...
          </span>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Model Selector */}
          <button
            onClick={() => setModelConfigOpen(true)}
            title="配置 AI 模型"
            style={{
              background: activeModel ? 'rgba(78,201,176,0.15)' : 'rgba(244,71,71,0.1)',
              border: `1px solid ${activeModel ? 'rgba(78,201,176,0.3)' : 'rgba(244,71,71,0.3)'}`,
              borderRadius: 4,
              padding: '2px 8px',
              cursor: 'pointer',
              fontSize: 11,
              color: activeModel ? 'var(--accent-green)' : 'var(--accent-red)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              transition: 'all 0.12s',
            }}
          >
            <span>●</span>
            <span>{activeModel ? `${activeModel.presetName} / ${activeModel.modelName}` : '未配置模型'}</span>
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 400 }}>
            AI 全自动开发模式
          </span>
        </span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        {messages.length === 0 && !currentTask && (
          <div style={{
            textAlign: 'center',
            marginTop: 40,
            color: 'var(--text-secondary)',
          }}>
            <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.8 }}>🤖</div>
            <h2 style={{ fontWeight: 400, marginBottom: 8, color: 'var(--text-highlight)', fontSize: 20 }}>
              SOLO 全自动开发模式
            </h2>
            <p style={{ fontSize: 13, maxWidth: 500, margin: '0 auto', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
              用自然语言描述您的需求，AI 智能体将自动完成<strong style={{ color: 'var(--text-primary)' }}>需求拆解 → 技术选型 → 代码生成 → 运行验证 → 变更汇总</strong>的全流程开发。
            </p>
            <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                '创建一个 React 待办事项应用，包含增删改查功能',
                '优化项目中的 API 接口，添加错误处理和日志记录',
                '重构后端代码，将路由逻辑与业务逻辑分离',
              ].map((t, i) => (
                <div
                  key={i}
                  onClick={() => handleTemplateClick(t)}
                  style={{
                    padding: '10px 16px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    maxWidth: 280,
                    border: '1px solid transparent',
                    transition: 'all 0.2s',
                    lineHeight: 1.5,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent-blue)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  "{t}"
                </div>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '85%',
            padding: '10px 14px',
            borderRadius: 8,
            background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: 13,
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
          </div>
        ))}

        {/* Current task progress */}
        {currentTask && currentTask.steps.length > 0 && (
          <div style={{
            alignSelf: 'flex-start',
            maxWidth: '85%',
            padding: '12px 16px',
            borderRadius: 8,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent-green)', marginBottom: 8 }}>
              🤖 智能体执行进度
            </div>
            {currentTask.steps.map(step => (
              <div key={step.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 0',
                fontSize: 12,
                color: step.status === 'completed' ? 'var(--text-secondary)' :
                       step.status === 'running' ? 'var(--accent-green)' :
                       step.status === 'failed' ? 'var(--accent-red)' : 'var(--text-secondary)',
                opacity: step.status === 'pending' ? 0.5 : 1,
              }}>
                <span style={{ width: 16, textAlign: 'center' }}>
                  {renderStepStatus(step.status)}
                </span>
                <span>{step.description}</span>
                {step.output && step.status === 'completed' && (
                  <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 4 }}>
                    — {step.output.substring(0, 60)}...
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
      }}>
        <div style={{
          display: 'flex',
          gap: 8,
          alignItems: 'flex-end',
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="描述您的需求，AI 智能体将自动完成开发..."
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                borderRadius: 6,
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                lineHeight: 1.5,
              }}
            />
            <div style={{
              position: 'absolute',
              right: 8,
              bottom: 6,
              fontSize: 11,
              color: 'var(--text-secondary)',
              opacity: 0.5,
            }}>
              {isProcessing ? '⏳' : '↵ 发送'}
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={isProcessing || !inputValue.trim()}
            style={{
              padding: '8px 24px',
              background: isProcessing || !inputValue.trim() ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
              color: isProcessing || !inputValue.trim() ? 'var(--text-secondary)' : 'white',
              border: 'none',
              borderRadius: 6,
              cursor: isProcessing || !inputValue.trim() ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 500,
              height: 44,
              transition: 'background 0.2s',
            }}
          >
            {isProcessing ? '执行中...' : '发送'}
          </button>
        </div>
      </div>
    </div>
  )
}