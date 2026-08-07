import React, { useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/app-store'
import { useChatStore } from '../stores/chat-store'
import { agentEngine, configureAgentEngine } from './solo-engine'

// 简单的 Markdown 渲染
function renderMarkdown(text: string): React.ReactNode {
  if (!text) return null

  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []
  let codeBlockLanguage = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (inCodeBlock) {
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
    if (line.startsWith('## ')) {
      elements.push(
        <div key={`h2-${i}`} style={{
          fontSize: 16, fontWeight: 600, color: 'var(--text-highlight)',
          marginTop: 16, marginBottom: 8,
        }}>{line.slice(3)}</div>
      )
      continue
    }
    if (line.startsWith('### ')) {
      elements.push(
        <div key={`h3-${i}`} style={{
          fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
          marginTop: 12, marginBottom: 6,
        }}>{line.slice(4)}</div>
      )
      continue
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} style={{
          paddingLeft: 16, marginBottom: 2, fontSize: 13,
          lineHeight: 1.6, color: 'var(--text-primary)',
        }}>
          • {line.slice(2)}
        </div>
      )
      continue
    }
    if (line.trim() === '') {
      elements.push(<div key={`empty-${i}`} style={{ height: 4 }} />)
      continue
    }
    elements.push(
      <div key={`p-${i}`} style={{
        marginBottom: 4, fontSize: 13, lineHeight: 1.6,
        color: 'var(--text-primary)',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {line}
      </div>
    )
  }
  return elements
}

export function SoloFullScreen() {
  const soloFullScreen = useAppStore(s => s.soloFullScreen)
  const toggleSoloFullScreen = useAppStore(s => s.toggleSoloFullScreen)
  const mode = useAppStore(s => s.mode)
  const toggleMode = useAppStore(s => s.toggleMode)
  const activeModel = useAppStore(s => s.activeModel)
  const setModelConfigOpen = useAppStore(s => s.setModelConfigOpen)

  const messages = useChatStore(s => s.messages)
  const isProcessing = useChatStore(s => s.isProcessing)
  const currentTask = useChatStore(s => s.currentTask)
  const inputValue = useChatStore(s => s.inputValue)
  const addMessage = useChatStore(s => s.addMessage)
  const setInputValue = useChatStore(s => s.setInputValue)
  const setProcessing = useChatStore(s => s.setProcessing)
  const setCurrentTask = useChatStore(s => s.setCurrentTask)
  const updateTask = useChatStore(s => s.updateTask)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Configure AI model when active model changes
  useEffect(() => {
    configureAgentEngine(activeModel)
  }, [activeModel])

  // Set up agent progress callback
  useEffect(() => {
    agentEngine.setOnProgress((task) => {
      updateTask(task)
    })
  }, [updateTask])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, currentTask])

  const handleSubmit = useCallback(async () => {
    if (!inputValue.trim() || isProcessing) return
    const msg = inputValue.trim()
    setInputValue('')
    addMessage({ role: 'user', content: msg, timestamp: Date.now() })
    setProcessing(true)

    try {
      // Execute task via real agent engine
      const task = await agentEngine.executeTask(msg)

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  if (!soloFullScreen || mode !== 'solo') return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 500,
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.15s ease-out',
    }}>
      {/* Header */}
      <div style={{
        height: 48,
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: 'linear-gradient(135deg, var(--accent-blue), #4ec9b0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 800,
            color: 'white',
          }}>
            FC
          </span>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-highlight)' }}>
            SOLO 全自动开发
          </span>
          {isProcessing && (
            <span style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--accent-green)',
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--accent-green)',
                animation: 'pulse 1s infinite',
              }} />
              执行中
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => setModelConfigOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 4,
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-primary)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: activeModel ? 'var(--accent-green)' : 'var(--accent-red)',
            }} />
            <span>{activeModel ? `${activeModel.modelName}` : '未配置模型'}</span>
          </button>
          <button
            onClick={toggleSoloFullScreen}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            退出全屏
          </button>
          <button
            onClick={() => { toggleSoloFullScreen(); toggleMode() }}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              border: 'none',
              background: 'var(--accent-blue)',
              color: 'white',
              fontSize: 12,
              cursor: 'pointer',
            }}
          >
            返回 IDE 模式
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Task flow */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRight: '1px solid var(--border-color)',
        }}>
          {/* Messages area */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: 24,
          }}>
            {messages.length === 0 && !currentTask && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 64, marginBottom: 20, opacity: 0.6 }}>🤖</div>
                <h2 style={{ fontSize: 24, fontWeight: 400, color: 'var(--text-highlight)', marginBottom: 12 }}>
                  开始全自动开发
                </h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 480, lineHeight: 2 }}>
                  描述您的需求，AI 智能体将自动完成从需求分析到代码生成的全流程。
                </p>
                <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                  {[
                    '创建一个 React 待办事项应用，包含增删改查功能',
                    '优化项目中的 API 接口，添加错误处理和日志记录',
                    '重构后端代码，将路由逻辑与业务逻辑分离',
                  ].map((t, i) => (
                    <div
                      key={i}
                      onClick={() => setInputValue(t)}
                      style={{
                        padding: '10px 20px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontSize: 13,
                        color: 'var(--text-secondary)',
                        maxWidth: 420,
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

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i} style={{
                marginBottom: 16,
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 18px',
                  borderRadius: 10,
                  background: msg.role === 'user' ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
                </div>
              </div>
            ))}

            {/* Current task progress */}
            {currentTask && currentTask.steps.length > 0 && (
              <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: 10,
                border: '1px solid var(--border-color)',
                padding: 20,
                marginBottom: 16,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16,
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-highlight)' }}>
                    🤖 执行进度
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    padding: '2px 10px',
                    borderRadius: 4,
                    background: 'var(--bg-tertiary)',
                  }}>
                    {currentTask.steps.filter(s => s.status === 'completed').length}/{currentTask.steps.length} 步完成
                  </div>
                </div>
                {currentTask.steps.map((step, i) => (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: '10px 0',
                      borderBottom: i < currentTask.steps.length - 1 ? '1px solid var(--border-color)' : 'none',
                      opacity: step.status === 'pending' && currentTask.status !== 'failed' ? 0.4 : 1,
                    }}
                  >
                    <div style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      flexShrink: 0,
                      background: step.status === 'completed' ? 'rgba(78,201,176,0.2)' :
                                 step.status === 'running' ? 'rgba(78,201,176,0.2)' :
                                 step.status === 'failed' ? 'rgba(244,71,71,0.2)' : 'var(--bg-tertiary)',
                      color: step.status === 'completed' ? 'var(--accent-green)' :
                             step.status === 'running' ? 'var(--accent-green)' :
                             step.status === 'failed' ? 'var(--accent-red)' : 'var(--text-secondary)',
                    }}>
                      {step.status === 'completed' ? '✓' :
                       step.status === 'running' ? '⟳' :
                       step.status === 'failed' ? '✗' : String(i + 1)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: step.status === 'running' ? 600 : 400,
                        color: step.status === 'completed' ? 'var(--text-secondary)' :
                               step.status === 'running' ? 'var(--accent-green)' :
                               step.status === 'failed' ? 'var(--accent-red)' : 'var(--text-primary)',
                      }}>
                        {step.description}
                      </div>
                      {step.output && (
                        <div style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          marginTop: 4,
                          padding: '6px 10px',
                          background: 'var(--bg-tertiary)',
                          borderRadius: 4,
                          fontFamily: 'monospace',
                        }}>
                          {step.output}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
          }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <textarea
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="描述您的需求，AI 智能体将自动完成全流程开发..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'inherit',
                    lineHeight: 1.5,
                  }}
                />
                <div style={{
                  position: 'absolute',
                  right: 10,
                  bottom: 8,
                  fontSize: 11,
                  color: 'var(--text-secondary)',
                  opacity: 0.5,
                }}>
                  {isProcessing ? '⏳ 执行中' : '↵ 发送'}
                </div>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isProcessing || !inputValue.trim()}
                style={{
                  padding: '10px 32px',
                  background: isProcessing || !inputValue.trim() ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                  color: isProcessing || !inputValue.trim() ? 'var(--text-secondary)' : 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isProcessing || !inputValue.trim() ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  height: 52,
                  transition: 'background 0.2s',
                }}
              >
                {isProcessing ? '执行中...' : '启动开发'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Result panel */}
        <div style={{
          width: 360,
          background: 'var(--bg-secondary)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            变更结果
          </div>
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: 16,
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}>
            {currentTask?.status === 'completed' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{
                  padding: 12,
                  borderRadius: 8,
                  background: 'rgba(78,201,176,0.1)',
                  border: '1px solid rgba(78,201,176,0.2)',
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--accent-green)', marginBottom: 4 }}>✅ 执行完成</div>
                  <div style={{ color: 'var(--text-primary)' }}>所有步骤已成功执行，无错误。</div>
                </div>
                {currentTask.steps.filter(s => s.output).map((step, i) => (
                  <div key={i} style={{
                    padding: 10,
                    borderRadius: 6,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {step.description}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>
                      {step.output}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📦</div>
                <div>暂无变更结果</div>
                <div style={{ marginTop: 4, opacity: 0.7 }}>启动开发任务后，变更结果将在此展示</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}