import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/app-store'
import { useEditorStore } from '../stores/editor-store'
import { useEditorRefStore } from '../stores/editor-ref-store'
import { openFolderDialog, openFileDialog, readFile } from '../utils/electron-bridge'

interface MenuItem {
  label: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  divider?: boolean
  submenu?: MenuItem[]
}

interface MenuGroup {
  label: string
  items: MenuItem[]
}

const toast = (msg: string) => useAppStore.getState().setToast(msg)

let _newFileCounter = 0

const createMenuGroups = (navigate: ReturnType<typeof useNavigate>): MenuGroup[] => [
  {
    label: '文件',
    items: [
      {
        label: '新建文件', shortcut: 'Ctrl+N', action: () => {
          _newFileCounter++
          const id = `new-${Date.now()}`
          const title = `Untitled-${_newFileCounter}`
          useEditorStore.getState().openFile({
            id,
            path: `untitled-${_newFileCounter}`,
            title,
            language: 'plaintext',
            isDirty: false,
            content: '',
          })
          toast(`已新建文件: ${title}`)
        },
      },
      {
        label: '打开文件...', shortcut: 'Ctrl+O', action: async () => {
          const editorStore = useEditorStore.getState()
          const filePath = await openFileDialog()
          if (filePath) {
            const content = await readFile(filePath)
            editorStore.openFile({
              id: filePath,
              path: filePath,
              title: filePath.split(/[/\\]/).pop() || filePath,
              language: (filePath.split('.').pop() || 'plaintext').toLowerCase(),
              isDirty: false,
              content: content || '',
            })
            toast(`已打开文件: ${filePath.split(/[/\\]/).pop() || filePath}`)
          }
        },
      },
      { label: '打开文件夹...', shortcut: 'Ctrl+K Ctrl+O', action: async () => {
        const result = await openFolderDialog()
        if (result) {
          useAppStore.getState().setRootPath(result)
          // 同步工作区根到主进程，约束 fs:* 操作边界（防任意读写）
          ;(window as any).electronAPI?.setWorkspaceRoot?.(result)
          toast(`已打开文件夹: ${result}`)
        }
      } },
      { label: '', divider: true },
      {
        label: '保存', shortcut: 'Ctrl+S', action: () => {
          const { activeTabId, openTabs, markTabDirty } = useEditorStore.getState()
          if (activeTabId) {
            markTabDirty(activeTabId, false)
            const tab = openTabs.find(t => t.id === activeTabId)
            toast(`已保存: ${tab?.title || '当前文件'}`)
          } else {
            toast('没有打开的文件')
          }
        },
      },
      {
        label: '另存为...', shortcut: 'Ctrl+Shift+S', action: () => {
          toast('另存为功能需要 Electron 环境支持')
        },
      },
      {
        label: '全部保存', shortcut: 'Ctrl+Alt+S', action: () => {
          const { openTabs, markTabDirty } = useEditorStore.getState()
          let count = 0
          openTabs.forEach(tab => {
            if (tab.isDirty) {
              markTabDirty(tab.id, false)
              count++
            }
          })
          toast(count > 0 ? `已保存 ${count} 个文件` : '所有文件已是最新')
        },
      },
      { label: '', divider: true },
      {
        label: '关闭编辑器', shortcut: 'Ctrl+W', action: () => {
          const { activeTabId, closeTab } = useEditorStore.getState()
          if (activeTabId) {
            closeTab(activeTabId)
          } else {
            toast('没有打开的编辑器')
          }
        },
      },
      { label: '关闭文件夹', action: () => toast('请先打开文件夹'), disabled: true },
      { label: '', divider: true },
      { label: '退出', action: () => toast('FyqyClaw 退出功能开发中') },
    ],
  },
  {
    label: '编辑',
    items: [
      { label: '撤销', shortcut: 'Ctrl+Z', action: () => { useEditorRefStore.getState().undo(); toast('撤销') } },
      { label: '重做', shortcut: 'Ctrl+Y', action: () => { useEditorRefStore.getState().redo(); toast('重做') } },
      { label: '', divider: true },
      { label: '剪切', shortcut: 'Ctrl+X', action: () => { document.execCommand('cut'); toast('已剪切') } },
      { label: '复制', shortcut: 'Ctrl+C', action: () => { document.execCommand('copy'); toast('已复制') } },
      { label: '粘贴', shortcut: 'Ctrl+V', action: () => { document.execCommand('paste'); toast('已粘贴') } },
      { label: '', divider: true },
      { label: '查找', shortcut: 'Ctrl+F', action: () => { useEditorRefStore.getState().find(); toast('查找') } },
      { label: '替换', shortcut: 'Ctrl+H', action: () => { useEditorRefStore.getState().replace(); toast('替换') } },
    ],
  },
  {
    label: '视图',
    items: [
      { label: '命令面板', shortcut: 'Ctrl+Shift+P', action: () => { useAppStore.getState().toggleCommandPalette() } },
      { label: '切换侧边栏', shortcut: 'Ctrl+B', action: () => { useAppStore.getState().toggleSidebar() } },
      { label: '切换底部面板', shortcut: 'Ctrl+J', action: () => { useAppStore.getState().toggleBottomPanel() } },
      { label: '切换右侧面板', shortcut: 'Ctrl+Alt+R', action: () => { useAppStore.getState().toggleRightPanel() } },
      { label: '内置浏览器', shortcut: 'Ctrl+Shift+W', action: () => { useAppStore.getState().setActiveSidebarView('browser'); useAppStore.getState().setSidebarVisible(true) } },
      { label: '网页爬虫', shortcut: 'Ctrl+Shift+C', action: () => { useAppStore.getState().setActiveSidebarView('crawler'); useAppStore.getState().setSidebarVisible(true) } },
      { label: '', divider: true },
      {
        label: '全屏', shortcut: 'F11', action: () => {
          document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
        },
      },
      {
        label: '切换开发模式', shortcut: 'Ctrl+Shift+M', action: () => { useAppStore.getState().toggleMode() },
      },
      { label: '', divider: true },
      {
        label: '切换主题', shortcut: 'Ctrl+Alt+T', action: () => {
          const store = useAppStore.getState()
          store.setTheme(store.theme === 'dark' ? 'light' : 'dark')
        },
      },
    ],
  },
  {
    label: '运行',
    items: [
      {
        label: '开始调试', shortcut: 'F5', action: () => {
          useAppStore.getState().setBottomPanelVisible(true)
          useAppStore.getState().setActiveBottomTab('debug-console')
          toast('调试模式已启动')
        },
      },
      {
        label: '运行而不调试', shortcut: 'Ctrl+F5', action: () => {
          useAppStore.getState().setBottomPanelVisible(true)
          useAppStore.getState().setActiveBottomTab('output')
          toast('正在运行...')
        },
      },
      { label: '', divider: true },
      { label: '停止', shortcut: 'Shift+F5', action: () => toast('停止功能开发中') },
      { label: '重新启动', shortcut: 'Ctrl+Shift+F5', action: () => toast('重启功能开发中') },
      { label: '', divider: true },
      { label: '添加配置...', action: () => toast('添加配置功能开发中') },
    ],
  },
  {
    label: '终端',
    items: [
      {
        label: '新建终端', shortcut: 'Ctrl+`', action: () => {
          useAppStore.getState().setBottomPanelVisible(true)
          useAppStore.getState().setActiveBottomTab('terminal')
          toast('终端已打开')
        },
      },
      { label: '分割终端', action: () => toast('分割终端功能开发中') },
      { label: '', divider: true },
      { label: '运行任务...', shortcut: 'Ctrl+Shift+B', action: () => toast('运行任务功能开发中') },
      { label: '终止任务', action: () => toast('终止任务功能开发中') },
    ],
  },
  {
    label: 'AI',
    items: [
      {
        label: 'AI 对话', shortcut: 'Ctrl+Alt+I', action: () => {
          useAppStore.getState().setRightPanelVisible(true)
          toast('AI 对话面板已打开')
        },
      },
      { label: '配置 AI 模型', shortcut: 'Ctrl+Alt+M', action: () => { useAppStore.getState().setModelConfigOpen(true) } },
      { label: '切换至 SOLO 模式', shortcut: 'Ctrl+Shift+M', action: () => { useAppStore.getState().toggleMode() } },
      { label: '', divider: true },
      {
        label: '代码审查', action: () => {
          useAppStore.getState().setBottomPanelVisible(true)
          useAppStore.getState().setActiveBottomTab('ai-review')
          toast('AI 代码审查结果已打开')
        },
      },
      { label: '生成注释', action: () => toast('生成注释功能开发中') },
      { label: '解释代码', action: () => toast('解释代码功能开发中') },
    ],
  },
  {
    label: '帮助',
    items: [
      { label: '配置中心', action: () => { navigate('/config') } },
      { label: '', divider: true },
      { label: '关于 FyqyClaw', action: () => toast('FyqyClaw v1.0.0\n飞扬企源AI — 全流程AI开发工具\n基于 Electron + React + Monaco Editor') },
      { label: '文档', action: () => toast('文档功能开发中') },
      { label: '快捷键参考', shortcut: 'Ctrl+K Ctrl+R', action: () => {
        const shortcuts = [
          'Ctrl+Shift+P — 命令面板',
          'Ctrl+B — 切换侧边栏',
          'Ctrl+J — 切换底部面板',
          'Ctrl+Shift+M — 切换开发模式',
          'Ctrl+Alt+R — 切换右侧面板',
          'Ctrl+Alt+T — 切换主题',
          'Ctrl+` — 打开终端',
          'F11 — 全屏',
          'Ctrl+N — 新建文件',
          'Ctrl+O — 打开文件',
          'Ctrl+S — 保存文件',
          'Ctrl+Z/Y — 撤销/重做',
          'Ctrl+F/H — 查找/替换',
        ]
        toast(shortcuts.join('\n'))
      }},
      { label: '', divider: true },
      { label: '检查更新', action: () => toast('已是最新版本') },
      { label: '反馈问题', action: () => toast('请通过 GitHub Issues 反馈问题') },
    ],
  },
]

export function MenuBar() {
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [hoverMenu, setHoverMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const navigate = useNavigate()
  const menuGroups = useMemo(() => createMenuGroups(navigate), [navigate])

  // Toast notification
  const toast = useAppStore(s => s.toast)
  const setToast = useAppStore(s => s.setToast)
  const [toastVisible, setToastVisible] = useState(false)

  useEffect(() => {
    if (toast.visible && toast.message) {
      setToastVisible(true)
      const timer = setTimeout(() => {
        setToastVisible(false)
      }, 2000)
      return () => clearTimeout(timer)
    } else {
      setToastVisible(false)
    }
  }, [toast])

  const closeMenu = useCallback(() => {
    setOpenMenu(null)
    setHoverMenu(null)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu()
      }
    }
    // 使用 click 事件替代 mousedown，避免与菜单 onMouseDown 冲突
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [closeMenu])

  const handleMenuClick = (label: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (openMenu === label) {
      closeMenu()
    } else {
      setOpenMenu(label)
      setHoverMenu(label)
    }
  }

  const handleMenuHover = (label: string) => {
    if (openMenu) {
      setHoverMenu(label)
      setOpenMenu(label)
    }
  }

  const handleItemClick = (item: MenuItem) => {
    if (item.action && !item.disabled) {
      item.action()
      closeMenu()
    }
  }

  const handleMenuKeyDown = (e: React.KeyboardEvent, label: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleMenuClick(label)
    }
    if (e.key === 'Escape') {
      closeMenu()
    }
  }

  const activeMenu = openMenu || hoverMenu

  return (
    <>
      <div
        ref={menuRef}
        style={{
        height: 30,
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 4px',
        borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
        userSelect: 'none',
        position: 'relative',
        zIndex: 100,
      } as React.CSSProperties}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {/* App logo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 10px 0 8px',
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--text-highlight)',
          opacity: 0.9,
        }}>
          <span style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: 'linear-gradient(135deg, var(--accent-blue), #4ec9b0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 9,
            fontWeight: 800,
            color: 'white',
          }}>
            FC
          </span>
        </div>

        {menuGroups.map(group => (
          <div
            key={group.label}
            ref={el => { if (el) buttonRefs.current.set(group.label, el) }}
            onClick={(e) => handleMenuClick(group.label, e)}
            onMouseEnter={() => handleMenuHover(group.label)}
            onKeyDown={(e) => handleMenuKeyDown(e, group.label)}
            tabIndex={0}
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={openMenu === group.label}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              color: 'var(--text-primary)',
              background: activeMenu === group.label ? 'var(--bg-hover)' : 'transparent',
              transition: 'background 0.08s',
              outline: 'none',
              position: 'relative',
            }}
          >
            {group.label}
            {openMenu === group.label && (
              <div
                style={{
                  position: 'fixed',
                  left: buttonRefs.current.get(group.label)?.getBoundingClientRect().left,
                  top: (buttonRefs.current.get(group.label)?.getBoundingClientRect().bottom || 30) + 2,
                  minWidth: 240,
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  padding: '4px 0',
                  zIndex: 1000,
                  }}
                onClick={(e) => e.stopPropagation()}
              >
                {group.items.map((item, i) => {
                  if (item.divider) {
                    return (
                      <div key={i} style={{ height: 1, background: 'var(--border-color)', margin: '4px 8px' }} />
                    )
                  }
                  return (
                    <div
                      key={i}
                      onClick={() => handleItemClick(item)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '5px 12px',
                        cursor: item.disabled ? 'not-allowed' : 'pointer',
                        fontSize: 12,
                        color: item.disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
                        opacity: item.disabled ? 0.5 : 1,
                        transition: 'background 0.08s',
                      }}
                      onMouseEnter={e => {
                        if (!item.disabled) e.currentTarget.style.background = 'var(--bg-hover)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent'
                      }}
                    >
                      <span>{item.label}</span>
                      {item.shortcut && (
                        <span style={{
                          marginLeft: 24,
                          fontSize: 11,
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace',
                          opacity: 0.7,
                        }}>
                          {item.shortcut}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right side: model status, privacy mode, sandbox, user info */}
      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        paddingRight: 8,
      }}>
        <ModelStatusBadge />
        <PrivacyBadge />
        <SandboxBadge />
        <ThemeBadge />
        <ConfigBadge />
        <UserAvatar />
      </div>
    </div>

    {/* Toast notification */}
    {toastVisible && (
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: 13,
          color: 'var(--text-primary)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          zIndex: 9999,
          animation: 'fadeInUp 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ color: 'var(--accent-blue)' }}>ℹ</span>
        <span>{toast.message}</span>
      </div>
    )}
    </>
  )
}

function ModelStatusBadge() {
  const activeModel = useAppStore(s => s.activeModel)
  const setModelConfigOpen = useAppStore(s => s.setModelConfigOpen)

  if (!activeModel) return null

  return (
    <button
      onClick={() => setModelConfigOpen(true)}
      title={`当前模型: ${activeModel.presetName} / ${activeModel.modelName}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 6px',
        borderRadius: 3,
        border: 'none',
        background: 'rgba(78,201,176,0.12)',
        color: 'var(--accent-green)',
        fontSize: 11,
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,201,176,0.2)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(78,201,176,0.12)' }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)' }} />
      <span>{activeModel.modelName}</span>
    </button>
  )
}

function PrivacyBadge() {
  const privacyMode = useAppStore(s => s.privacyMode)
  const togglePrivacyMode = useAppStore(s => s.togglePrivacyMode)

  return (
    <button
      onClick={togglePrivacyMode}
      title={privacyMode ? '隐私模式已开启 - 点击关闭' : '隐私模式已关闭 - 点击开启'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        fontSize: 11,
        color: privacyMode ? 'var(--accent-green)' : 'var(--text-secondary)',
        opacity: privacyMode ? 1 : 0.5,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 3,
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      {privacyMode && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)' }} />}
    </button>
  )
}

function SandboxBadge() {
  const sandboxEnabled = useAppStore(s => s.sandboxEnabled)
  const toggleSandboxEnabled = useAppStore(s => s.toggleSandboxEnabled)

  return (
    <button
      onClick={toggleSandboxEnabled}
      title={sandboxEnabled ? '沙箱已启用 - 点击关闭' : '沙箱已关闭 - 点击开启'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        fontSize: 11,
        color: sandboxEnabled ? 'var(--accent-yellow)' : 'var(--text-secondary)',
        opacity: sandboxEnabled ? 1 : 0.5,
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 3,
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18" />
        <path d="M9 21V9" />
      </svg>
      {sandboxEnabled && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)' }} />}
    </button>
  )
}

function ThemeBadge() {
  const theme = useAppStore(s => s.theme)
  const setTheme = useAppStore(s => s.setTheme)

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? '深色主题 - 点击切换浅色' : '浅色主题 - 点击切换深色'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        fontSize: 11,
        color: 'var(--text-secondary)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 3,
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      {theme === 'dark' ? (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  )
}

function ConfigBadge() {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate('/config')}
      title="管理配置中心"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 6px',
        fontSize: 11,
        color: 'var(--text-secondary)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        borderRadius: 3,
        transition: 'all 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    </button>
  )
}

function UserAvatar() {
  return (
    <div
      title="用户"
      style={{
        width: 20,
        height: 20,
        borderRadius: '50%',
        background: 'var(--bg-hover)',
        border: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        marginLeft: 4,
      }}
    >
      U
    </div>
  )
}