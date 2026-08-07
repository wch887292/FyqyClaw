import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/app-store'
import { useEditorStore } from '../stores/editor-store'
import { FileTree } from '../../ide/file-tree/FileTree'
import { GitPanel } from '../../ide/git/GitPanel'
import { useResizable } from '../hooks/useResizable'
import { openFolderDialog } from '../utils/electron-bridge'
import { mockExtensions, mockSkills, mockAgents, type SkillEntry } from '../mock-data'
import { BrowserPanel } from './BrowserPanel'
import { CrawlerPanel } from './CrawlerPanel'
import type { FileNode } from '@shared/types/ide'

export function Sidebar() {
  const activeView = useAppStore(s => s.activeSidebarView)
  const sidebarWidth = useAppStore(s => s.sidebarWidth)
  const setSidebarWidth = useAppStore(s => s.setSidebarWidth)
  const sidebarVisible = useAppStore(s => s.sidebarVisible)
  const rootPath = useAppStore(s => s.rootPath)
  const setRootPath = useAppStore(s => s.setRootPath)

  const { resizerRef, handleMouseDown } = useResizable({
    initialSize: sidebarWidth,
    direction: 'horizontal',
    onSizeChange: setSidebarWidth,
  })

  const handleOpenFolder = async () => {
    const result = await openFolderDialog()
    if (result) {
      setRootPath(result)
    }
  }

  if (!sidebarVisible) return null

  return (
    <div style={{
      width: sidebarWidth,
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid var(--border-color)',
      flexShrink: 0,
      position: 'relative',
      animation: 'slideInLeft 0.12s ease-out',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 16px',
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'uppercase',
        color: 'var(--text-secondary)',
        letterSpacing: '0.5px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
      }}>
        <span>
          {activeView === 'files' ? '资源管理器' :
           activeView === 'search' ? '搜索替换' :
           activeView === 'git' ? '源代码管理' :
           activeView === 'debug' ? '调试运行' :
           activeView === 'extensions' ? '插件市场' :
           activeView === 'skills' ? '技能中心' :
           activeView === 'agents' ? 'AI 智能体管理' :
           activeView === 'browser' ? '内置浏览器' :
           activeView === 'crawler' ? '网页爬虫' : ''}
        </span>
        {activeView === 'files' && (
          <div style={{ display: 'flex', gap: 2 }}>
            {!rootPath && (
              <button
                onClick={handleOpenFolder}
                title="打开文件夹"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: 16,
                  padding: '0 4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
            <button
              onClick={() => {
                const counter = Date.now() % 1000
                useEditorStore.getState().openFile({
                  id: `new-${counter}`,
                  path: `untitled-${counter}`,
                  title: `Untitled-${counter}`,
                  language: 'plaintext',
                  isDirty: false,
                  content: '',
                })
                useAppStore.getState().setToast('已新建文件')
              }}
              title="新建文件"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 16,
                padding: '0 4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '4px 0',
        color: 'var(--text-secondary)',
        fontSize: 12,
      }}>
        {activeView === 'files' && (
          <FileTree rootPath={rootPath} />
        )}
        {activeView === 'search' && (
          <SearchPanel />
        )}
        {activeView === 'git' && (
          <GitPanel rootPath={rootPath} />
        )}
        {activeView === 'debug' && (
          <DebugPanel />
        )}
        {activeView === 'extensions' && (
          <ExtensionsPanel />
        )}
        {activeView === 'skills' && (
          <SkillsPanel />
        )}
        {activeView === 'agents' && (
          <AgentsPanel />
        )}
        {activeView === 'browser' && (
          <BrowserPanel />
        )}
        {activeView === 'crawler' && (
          <CrawlerPanel />
        )}
      </div>

      {/* Resizer */}
      <div
        ref={resizerRef}
        onMouseDown={handleMouseDown}
        style={{
          position: 'absolute',
          right: -3,
          top: 0,
          bottom: 0,
          width: 5,
          cursor: 'col-resize',
          zIndex: 10,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0, 120, 212, 0.3)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
      />
    </div>
  )
}

/* ── Search Panel ── */
function SearchPanel() {
  const [searchQuery, setSearchQuery] = useState('')
  const [replaceText, setReplaceText] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [results, setResults] = useState<Array<{ file: string; line: number; match: string }>>([])
  const [isSearching, setIsSearching] = useState(false)
  const fileTree = useEditorStore(s => s.fileTree)
  const openFile = useEditorStore(s => s.openFile)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Collect all file paths from the file tree
  const collectFilePaths = useCallback((nodes: FileNode[]): string[] => {
    const paths: string[] = []
    for (const node of nodes) {
      if (node.type === 'file') {
        paths.push(node.path)
      }
      if (node.children) {
        paths.push(...collectFilePaths(node.children))
      }
    }
    return paths
  }, [])

  // Perform search
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    const filePaths = collectFilePaths(fileTree)
    const foundResults: Array<{ file: string; line: number; match: string }> = []

    try {
      // Search in opened file contents
      const openTabs = useEditorStore.getState().openTabs
      for (const tab of openTabs) {
        if (tab.content) {
          const lines = tab.content.split('\n')
          for (let i = 0; i < lines.length; i++) {
            let line = lines[i]
            let searchStr = query
            if (!matchCase) {
              line = line.toLowerCase()
              searchStr = searchStr.toLowerCase()
            }
            if (wholeWord) {
              const regex = new RegExp(`\\b${searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
              if (regex.test(line)) {
                foundResults.push({ file: tab.title, line: i + 1, match: lines[i].trim() })
              }
            } else if (line.includes(searchStr)) {
              foundResults.push({ file: tab.title, line: i + 1, match: lines[i].trim() })
            }
          }
        }
      }

      // If we have file paths, try to read and search them
      if (filePaths.length > 0) {
        const { readFile } = await import('../utils/electron-bridge')
        for (const filePath of filePaths) {
          // Skip if already searched via open tabs
          if (openTabs.some(t => t.id === filePath)) continue
          try {
            const content = await readFile(filePath)
            if (content) {
              const lines = content.split('\n')
              const fileName = filePath.split(/[/\\]/).pop() || filePath
              for (let i = 0; i < lines.length; i++) {
                let line = lines[i]
                let searchStr = query
                if (!matchCase) {
                  line = line.toLowerCase()
                  searchStr = searchStr.toLowerCase()
                }
                if (wholeWord) {
                  const regex = new RegExp(`\\b${searchStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
                  if (regex.test(line)) {
                    foundResults.push({ file: fileName, line: i + 1, match: lines[i].trim() })
                  }
                } else if (line.includes(searchStr)) {
                  foundResults.push({ file: fileName, line: i + 1, match: lines[i].trim() })
                }
              }
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    } catch (err) {
      console.error('[SearchPanel] 搜索出错:', err)
    }

    setResults(foundResults.slice(0, 200)) // Limit to 200 results
    setIsSearching(false)
  }, [fileTree, matchCase, wholeWord, collectFilePaths])

  // Debounced search on query change
  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    searchTimerRef.current = setTimeout(() => {
      performSearch(searchQuery)
    }, 300)
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [searchQuery, performSearch])

  const handleResultClick = useCallback((file: string, line: number) => {
    // Try to find and open the file
    const tabs = useEditorStore.getState().openTabs
    const existingTab = tabs.find(t => t.title === file)
    if (existingTab) {
      useEditorStore.getState().setActiveTab(existingTab.id)
    }
  }, [])

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="搜索文件内容..."
          style={{
            width: '100%',
            padding: '6px 10px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            color: 'var(--text-primary)',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <input
          value={replaceText}
          onChange={e => setReplaceText(e.target.value)}
          placeholder="替换为..."
          style={{
            width: '100%',
            padding: '6px 10px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: 4,
            color: 'var(--text-primary)',
            fontSize: 12,
            outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={matchCase} onChange={e => setMatchCase(e.target.checked)} /> 大小写匹配
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, cursor: 'pointer', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={wholeWord} onChange={e => setWholeWord(e.target.checked)} /> 全词匹配
          </label>
        </div>
        {searchQuery && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '4px 0' }}>
            {isSearching ? '搜索中...' : `共找到 ${results.length} 个结果`}
          </div>
        )}
      </div>
      {results.length > 0 ? (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {results.map((r, i) => (
            <div key={i} onClick={() => handleResultClick(r.file, r.line)}
              style={{ padding: '4px 6px', borderRadius: 3, cursor: 'pointer', fontSize: 11, color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.file}:{r.line}</div>
              <div style={{ fontFamily: 'monospace', marginTop: 2, opacity: 0.7 }}>{r.match}</div>
            </div>
          ))}
        </div>
      ) : searchQuery && !isSearching ? (
        <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 11 }}>
          无匹配结果
        </div>
      ) : null}
    </div>
  )
}

/* ── Debug Panel ── */
function DebugPanel() {
  const [debugTargets, setDebugTargets] = useState([
    { name: '当前文件', type: 'node', config: 'Node.js 调试' },
    { name: '启动项目', type: 'npm', config: 'npm run dev' },
    { name: '附加到进程', type: 'attach', config: '进程 ID' },
  ])
  const toast = useAppStore(s => s.setToast)

  const handleAddDebugConfig = () => {
    const newConfig = {
      name: `新配置 ${debugTargets.length + 1}`,
      type: 'node' as const,
      config: 'Node.js 调试',
    }
    setDebugTargets(prev => [...prev, newConfig])
    toast('已添加调试配置')
  }

  const handleStartDebug = (name: string) => {
    useAppStore.getState().setBottomPanelVisible(true)
    useAppStore.getState().setActiveBottomTab('debug-console')
    toast(`开始调试: ${name}`)
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>调试配置</span>
        <button onClick={handleAddDebugConfig} style={{
          background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontSize: 11, padding: '2px 6px', borderRadius: 3,
        }}>+ 添加</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {debugTargets.map((t, i) => (
          <div key={i} onClick={() => handleStartDebug(t.name)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
            border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)',
            transition: 'border-color 0.12s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <span style={{ fontSize: 16 }}>▶</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{t.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{t.config}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: '8px 10px', background: 'var(--bg-tertiary)', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>
        按 F5 开始调试
      </div>
    </div>
  )
}

/* ── Extensions Panel ── */
function ExtensionsPanel() {
  const [extensions, setExtensions] = useState(mockExtensions)
  const [searchQuery, setSearchQuery] = useState('')
  const toast = useAppStore(s => s.setToast)

  const filteredExtensions = searchQuery.trim()
    ? extensions.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    : extensions

  const handleToggleInstall = (id: string, currentlyInstalled: boolean) => {
    setExtensions(prev => prev.map(e =>
      e.id === id ? { ...e, installed: !currentlyInstalled } : e
    ))
    toast(currentlyInstalled ? '已卸载扩展' : '已安装扩展')
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>已安装 ({extensions.filter(e => e.installed).length})</span>
        <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索扩展..." style={{
          width: 120, padding: '3px 8px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
          borderRadius: 4, color: 'var(--text-primary)', fontSize: 11, outline: 'none',
        }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filteredExtensions.map(ext => (
          <div key={ext.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 10px', borderRadius: 6,
            background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6, background: 'var(--bg-secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-secondary)',
              flexShrink: 0, border: '1px solid var(--border-color)',
            }}>◆</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>{ext.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>{ext.desc}</div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5, marginTop: 1 }}>{ext.author}</div>
            </div>
            <button
              onClick={() => handleToggleInstall(ext.id, ext.installed)}
              style={{
                padding: '2px 8px', borderRadius: 3, border: '1px solid var(--border-color)', background: ext.installed ? 'transparent' : 'var(--accent-blue)',
                color: ext.installed ? 'var(--text-secondary)' : 'white', fontSize: 10, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {ext.installed ? '卸载' : '安装'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Skills Panel ── */
function SkillsPanel() {
  const [skills, setSkills] = useState<SkillEntry[]>(mockSkills)
  const [filter, setFilter] = useState<'all' | 'installed' | 'available' | 'updatable'>('all')
  const statusLabel: Record<string, string> = { installed: '已启用', available: '未启用', updatable: '可更新' }
  const isActive = (s: string) => s === 'installed'
  const navigate = useNavigate()

  const filteredSkills = filter === 'all'
    ? skills
    : skills.filter(s => s.status === filter)

  const handleInstall = (id: string) => {
    setSkills(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'installed' as const } : s
    ))
  }

  const handleUninstall = (id: string) => {
    setSkills(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'available' as const } : s
    ))
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>技能中心</span>
        <button onClick={() => navigate('/config?section=skills')} style={{
          background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer',
        }}>技能市场</button>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5, padding: '4px 0' }}>
        技能是可插拔的功能模块，可挂载到AI智能体中拓展开发能力
      </div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 3, marginBottom: 8 }}>
        {(['all', 'installed', 'available', 'updatable'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '2px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: filter === tab ? 'var(--accent-blue)' : 'var(--bg-tertiary)',
              color: filter === tab ? 'white' : 'var(--text-secondary)',
              fontSize: 10, fontWeight: filter === tab ? 500 : 400,
            }}
          >
            {tab === 'all' ? '全部' : tab === 'installed' ? '已启用' : tab === 'available' ? '未启用' : '可更新'}
            <span style={{ marginLeft: 3, opacity: 0.7 }}>
              ({tab === 'all' ? skills.length : skills.filter(s => s.status === tab).length})
            </span>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filteredSkills.map(skill => (
          <div key={skill.id} style={{
            padding: '10px 12px', borderRadius: 6, borderLeft: `3px solid ${isActive(skill.status) ? 'var(--accent-green)' : 'var(--border-color)'}`,
            background: 'var(--bg-tertiary)', cursor: 'pointer', transition: 'background 0.08s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-tertiary)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{skill.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5 }}>v{skill.version}</span>
                <span style={{
                  fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 500,
                  background: isActive(skill.status) ? 'rgba(78,201,176,0.15)' : 'var(--bg-secondary)',
                  color: isActive(skill.status) ? 'var(--accent-green)' : 'var(--text-secondary)',
                }}>
                  {statusLabel[skill.status] || skill.status}
                </span>
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 6 }}>{skill.description}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {skill.status === 'available' && (
                <button
                  onClick={() => handleInstall(skill.id)}
                  style={{
                    padding: '2px 8px', borderRadius: 3, border: 'none',
                    background: 'var(--accent-blue)', color: 'white', fontSize: 10, cursor: 'pointer',
                  }}
                >
                  安装
                </button>
              )}
              {skill.status === 'installed' && (
                <button
                  onClick={() => handleUninstall(skill.id)}
                  style={{
                    padding: '2px 8px', borderRadius: 3, border: '1px solid var(--border-color)',
                    background: 'transparent', color: 'var(--text-secondary)', fontSize: 10, cursor: 'pointer',
                  }}
                >
                  卸载
                </button>
              )}
              {skill.status === 'updatable' && (
                <button
                  onClick={() => setSkills(prev => prev.map(s =>
                    s.id === skill.id ? { ...s, status: 'installed' as const } : s
                  ))}
                  style={{
                    padding: '2px 8px', borderRadius: 3, border: 'none',
                    background: 'var(--accent-blue)', color: 'white', fontSize: 10, cursor: 'pointer',
                  }}
                >
                  更新
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Agents Panel ── */
function AgentsPanel() {
  const [agents, setAgents] = useState(mockAgents)
  const toast = useAppStore(s => s.setToast)

  const handleCreateAgent = () => {
    const newAgent = {
      id: `agent-${Date.now()}`,
      name: `新智能体 ${agents.length + 1}`,
      description: '这是一个自定义智能体，具备特定的工具调用能力',
      status: '就绪' as const,
      model: 'gpt-4o',
      skills: ['代码审查', '任务规划'],
    }
    setAgents(prev => [...prev, newAgent])
    toast('已创建新智能体')
  }

  return (
    <div style={{ padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>AI 智能体</span>
        <button onClick={handleCreateAgent} style={{
          background: 'var(--accent-blue)', color: 'white', border: 'none', borderRadius: 4, padding: '3px 10px', fontSize: 11, cursor: 'pointer',
        }}>+ 创建</button>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5, padding: '4px 0' }}>
        智能体是具备特定工具调用能力的AI助手，可自主完成复杂工程任务
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {agents.map(agent => (
          <div key={agent.id} style={{
            padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-color)',
            background: 'var(--bg-tertiary)', cursor: 'pointer', transition: 'all 0.08s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{agent.name}</span>
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 8, fontWeight: 500,
                background: agent.status === '就绪' ? 'rgba(78,201,176,0.15)' : 'rgba(244,71,71,0.1)',
                color: agent.status === '就绪' ? 'var(--accent-green)' : 'var(--accent-red)',
              }}>
                {agent.status}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 4 }}>{agent.description}</div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5 }}>模型: {agent.model}</span>
              {agent.skills.length > 0 && (
                <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5 }}>
                  | 技能: {agent.skills.join(', ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}