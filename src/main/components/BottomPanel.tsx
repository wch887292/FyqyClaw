import React, { useRef, useState, useCallback, useEffect } from 'react'
import { useAppStore, type BottomTab } from '../stores/app-store'
import { useResizable } from '../hooks/useResizable'
import { mockReviewResults } from '../mock-data'
import { CommandExecutor } from '../../sandbox/executor/command-executor'
import { SandboxManager } from '../../sandbox/manager'

interface TabItem {
  id: BottomTab
  label: string
  icon: React.ReactNode
}

const TerminalIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </svg>
)

const DebugConsoleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

const OutputIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15V6H3v12h10" />
    <path d="M18 13v6" />
    <path d="M15 16l3 3 3-3" />
  </svg>
)

const ProblemsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
)

const AIReviewIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)

const tabs: TabItem[] = [
  { id: 'terminal', label: '终端', icon: <TerminalIcon /> },
  { id: 'debug-console', label: '调试控制台', icon: <DebugConsoleIcon /> },
  { id: 'output', label: '运行输出', icon: <OutputIcon /> },
  { id: 'problems', label: '问题列表', icon: <ProblemsIcon /> },
  { id: 'ai-review', label: 'AI 审查结果', icon: <AIReviewIcon /> },
]

export function BottomPanel() {
  const visible = useAppStore(s => s.bottomPanelVisible)
  const activeTab = useAppStore(s => s.activeBottomTab)
  const panelHeight = useAppStore(s => s.bottomPanelHeight)
  const setActiveTab = useAppStore(s => s.setActiveBottomTab)
  const setPanelHeight = useAppStore(s => s.setBottomPanelHeight)
  const setVisible = useAppStore(s => s.setBottomPanelVisible)

  const { resizerRef, handleMouseDown } = useResizable({
    initialSize: panelHeight,
    direction: 'vertical',
    invert: true,
    onSizeChange: setPanelHeight,
  })

  if (!visible) return null

  return (
    <div style={{
      height: panelHeight,
      background: 'var(--bg-primary)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'relative',
      animation: 'slideUp 0.12s ease-out',
    }}>
      {/* Resizer handle */}
      <div
        ref={resizerRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          top: -3,
          left: 0,
          right: 0,
          height: 5,
          cursor: 'row-resize',
          zIndex: 10,
        }}
      />

      {/* Tab bar */}
      <div style={{
        height: 32,
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
        gap: 0,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 10px',
              height: '100%',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: activeTab === tab.id ? 'var(--text-highlight)' : 'var(--text-secondary)',
              fontSize: 12,
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              transition: 'color 0.12s, border-color 0.12s',
              position: 'relative',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => {
              if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              if (activeTab !== tab.id) e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          <button
            onClick={() => setVisible(false)}
            title="关闭面板"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 3,
              fontSize: 14,
              lineHeight: 1,
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
        {activeTab === 'terminal' && <TerminalPanel />}
        {activeTab === 'debug-console' && <DebugConsolePanel />}
        {activeTab === 'output' && <OutputPanel />}
        {activeTab === 'problems' && <ProblemsPanel />}
        {activeTab === 'ai-review' && <AIReviewPanel />}
      </div>
    </div>
  )
}

function TerminalPanel() {
  const [lines, setLines] = useState<string[]>([
    '欢迎使用 FyqyClaw 终端',
    '输入命令并按 Enter 执行',
    '',
  ])
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isExecuting, setIsExecuting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const executorRef = useRef<CommandExecutor | null>(null)
  const sandboxRef = useRef<SandboxManager | null>(null)

  // Initialize sandbox and executor
  useEffect(() => {
    const sandbox = new SandboxManager()
    sandboxRef.current = sandbox
    executorRef.current = new CommandExecutor(sandbox.getConfig())
  }, [])

  // Get current working directory
  const getCwd = useCallback(() => {
    const rootPath = useAppStore.getState().rootPath
    return rootPath || process.cwd() || '.'
  }, [])

  useEffect(() => {
    terminalRef.current?.scrollTo(0, terminalRef.current.scrollHeight)
  }, [lines])

  const executeCommand = useCallback(async (cmd: string) => {
    if (!executorRef.current) return

    const cwd = getCwd()
    setLines(prev => [...prev, `$ ${cmd}`])
    setIsExecuting(true)

    try {
      const result = await executorRef.current.execute({
        id: `cmd-${Date.now()}`,
        command: cmd,
        cwd,
        timeout: 30000,
      })

      if (result.wasBlocked) {
        setLines(prev => [...prev, `  ⚠️ 命令被沙箱拦截: ${cmd}`, ''])
      } else if (result.stdout) {
        setLines(prev => [...prev, ...result.stdout.split('\n'), ''])
      } else if (result.stderr) {
        setLines(prev => [...prev, `  ❌ ${result.stderr}`, ''])
      } else {
        setLines(prev => [...prev, `  [退出码: ${result.exitCode}]`, ''])
      }
    } catch (err: any) {
      setLines(prev => [...prev, `  ❌ 执行错误: ${err.message || '未知错误'}`, ''])
    } finally {
      setIsExecuting(false)
    }
  }, [getCwd])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      const cmd = input.trim()
      if (cmd) {
        setHistory(prev => [...prev, cmd])
        setHistoryIndex(-1)
        setInput('')
        executeCommand(cmd)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex] || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex] || '')
      } else {
        setHistoryIndex(-1)
        setInput('')
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      setLines([])
    }
  }

  const promptStr = `$ ${getCwd()} >`

  return (
    <div
      ref={terminalRef}
      style={{
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize: 12,
        lineHeight: 1.6,
        height: '100%',
        overflow: 'auto',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {lines.map((line, i) => (
        <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {line}
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ color: 'var(--accent-green)' }}>{promptStr}</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          disabled={isExecuting}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontFamily: 'inherit',
            fontSize: 12,
            outline: 'none',
            caretColor: 'var(--text-primary)',
          }}
        />
      </div>
    </div>
  )
}

function DebugConsolePanel() {
  const [messages, setMessages] = useState([
    { type: 'info', text: '调试会话已启动', time: new Date().toLocaleTimeString() },
    { type: 'info', text: '已加载断点: 0 个', time: new Date().toLocaleTimeString() },
    { type: 'info', text: '等待调试器连接...', time: new Date().toLocaleTimeString() },
  ])
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addMessage = (type: string, text: string) => {
    setMessages(prev => [...prev, { type, text, time: new Date().toLocaleTimeString() }])
  }

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim()
    if (!trimmed) return
    setInput('')
    addMessage('input', `> ${trimmed}`)

    // Simulate debug commands
    if (trimmed === 'run' || trimmed === 'continue') {
      addMessage('info', '程序继续运行...')
      setTimeout(() => addMessage('info', '未设置断点，程序正常退出'), 500)
    } else if (trimmed.startsWith('break') || trimmed.startsWith('b ')) {
      const target = trimmed.replace(/^(break|b)\s*/, '')
      addMessage('success', `已设置断点: ${target || '当前位置'}`)
    } else if (trimmed === 'step' || trimmed === 's') {
      addMessage('info', '单步执行，当前行: 42')
    } else if (trimmed === 'print' || trimmed.startsWith('p ')) {
      addMessage('output', `变量值: ${trimmed.replace(/^(print|p)\s*/, '')} = undefined`)
    } else if (trimmed === 'help') {
      addMessage('info', '可用命令: run, break <loc>, step, print <var>, clear, quit')
    } else if (trimmed === 'clear') {
      setMessages([])
    } else if (trimmed === 'quit' || trimmed === 'exit') {
      addMessage('info', '调试会话已结束')
    } else {
      addMessage('error', `未知命令: ${trimmed}`)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCommand(input)
    }
  }

  return (
    <div style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            color: msg.type === 'info' ? 'var(--accent-green)' :
                   msg.type === 'error' ? 'var(--accent-red)' :
                   msg.type === 'success' ? 'var(--accent-green)' :
                   msg.type === 'output' ? 'var(--accent-yellow)' :
                   msg.type === 'input' ? 'var(--text-primary)' : 'var(--text-primary)',
            padding: '1px 0',
            display: 'flex',
            gap: 8,
          }}>
            <span style={{ opacity: 0.4, fontSize: 10, flexShrink: 0 }}>{msg.time}</span>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: 4, marginTop: 4 }}>
        <span style={{ color: 'var(--accent-green)', marginRight: 4 }}>dbg&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)',
            fontFamily: 'inherit', fontSize: 12, outline: 'none',
          }}
          placeholder="输入调试命令 (help 查看帮助)"
        />
      </div>
    </div>
  )
}

function OutputPanel() {
  const [outputs] = useState([
    { type: 'build', text: '[构建] 项目编译开始...', time: '10:00:00' },
    { type: 'success', text: '[构建] TypeScript 编译通过', time: '10:00:05' },
    { type: 'info', text: '[运行] 开发服务器启动中...', time: '10:00:06' },
  ])

  return (
    <div style={{
      fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, height: '100%', overflow: 'auto',
    }}>
      {outputs.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
          暂无运行输出，请运行项目或任务
        </div>
      ) : (
        outputs.map((out, i) => (
          <div key={i} style={{
            padding: '1px 0',
            color: out.type === 'success' ? 'var(--accent-green)' :
                   out.type === 'error' ? 'var(--accent-red)' : 'var(--text-primary)',
          }}>
            {out.text}
          </div>
        ))
      )}
    </div>
  )
}

function ProblemsPanel() {
  const [problems] = useState<Array<{ severity: 'error' | 'warning' | 'info'; file: string; line: number; message: string }>>([
    { severity: 'warning', file: 'src/main/App.tsx', line: 15, message: '变量 "x" 已声明但未使用' },
    { severity: 'info', file: 'src/main/components/AppLayout.tsx', line: 42, message: '导入的模块 "test" 未在代码中使用' },
  ])

  const severityColors = { error: 'var(--accent-red)', warning: 'var(--accent-yellow)', info: 'var(--accent-blue)' }
  const severityLabels = { error: '错误', warning: '警告', info: '建议' }

  return (
    <div style={{ fontSize: 12, height: '100%', overflow: 'auto' }}>
      {problems.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
          暂无问题
        </div>
      ) : (
        problems.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px',
              borderRadius: 4, cursor: 'pointer', transition: 'background 0.08s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{
              width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
              background: severityColors[p.severity],
            }} />
            <span style={{ color: 'var(--text-primary)', flex: 1 }}>{p.message}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 11, flexShrink: 0 }}>
              {p.file}:{p.line}
            </span>
          </div>
        ))
      )}
    </div>
  )
}

function AIReviewPanel() {
  const [reviewResults] = useState(mockReviewResults)

  const severityColors = { error: 'var(--accent-red)', warning: 'var(--accent-yellow)', info: 'var(--accent-blue)' }
  const severityLabels = { error: '错误', warning: '警告', info: '建议' }

  if (reviewResults.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)', fontSize: 12 }}>
        暂无 AI 审查结果
      </div>
    )
  }

  return (
    <div style={{ fontSize: 12, height: '100%', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 12, padding: '4px 0 8px', borderBottom: '1px solid var(--border-color)', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)' }} />
          <span>{reviewResults.filter(r => r.severity === 'error').length} 错误</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-yellow)' }} />
          <span>{reviewResults.filter(r => r.severity === 'warning').length} 警告</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-blue)' }} />
          <span>{reviewResults.filter(r => r.severity === 'info').length} 建议</span>
        </div>
      </div>
      {reviewResults.map((result, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 8,
            padding: '6px 8px',
            borderRadius: 4,
            cursor: 'pointer',
            transition: 'background 0.08s',
            borderLeft: `3px solid ${severityColors[result.severity]}`,
            marginBottom: 4,
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <div style={{
            padding: '1px 6px',
            borderRadius: 3,
            fontSize: 10,
            fontWeight: 600,
            background: `${severityColors[result.severity]}20`,
            color: severityColors[result.severity],
            flexShrink: 0,
            marginTop: 1,
          }}>
            {severityLabels[result.severity]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', marginBottom: 2, lineHeight: 1.5 }}>{result.message}</div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 2 }}>{result.suggestion}</div>
            <div
              onClick={() => { /* 跳转到文件 */ }}
              style={{
                color: 'var(--accent-blue)',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>{result.file}:{result.line}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}