import React, { useState, useCallback, useRef, useEffect } from 'react'
import { MonacoEditor } from '../../ide/editor/MonacoEditor'
import { useEditorStore } from '../stores/editor-store'
import { useAppStore } from '../stores/app-store'
import { openFolderDialog } from '../utils/electron-bridge'

const WELCOME_TAB = 'welcome'

interface ContextMenu {
  x: number
  y: number
  tabId: string
  tabTitle: string
}

export function EditorArea() {
  const openTabs = useEditorStore(s => s.openTabs)
  const activeTabId = useEditorStore(s => s.activeTabId)
  const setActiveTab = useEditorStore(s => s.setActiveTab)
  const closeTab = useEditorStore(s => s.closeTab)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const activeTab = openTabs.find(t => t.id === activeTabId)

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', handleClick)
      return () => window.removeEventListener('click', handleClick)
    }
  }, [contextMenu])

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string, tabTitle: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, tabId, tabTitle })
  }, [])

  const handleCloseTab = useCallback((tabId: string) => {
    closeTab(tabId)
    setContextMenu(null)
  }, [closeTab])

  const handleCloseOthers = useCallback(() => {
    if (!contextMenu) return
    openTabs.forEach(tab => {
      if (tab.id !== contextMenu.tabId) {
        closeTab(tab.id)
      }
    })
    setContextMenu(null)
  }, [contextMenu, openTabs, closeTab])

  const handleCloseAll = useCallback(() => {
    openTabs.forEach(tab => closeTab(tab.id))
    setContextMenu(null)
  }, [openTabs, closeTab])

  const handleCloseRight = useCallback(() => {
    if (!contextMenu) return
    const idx = openTabs.findIndex(t => t.id === contextMenu.tabId)
    if (idx >= 0) {
      openTabs.slice(idx + 1).forEach(tab => closeTab(tab.id))
    }
    setContextMenu(null)
  }, [contextMenu, openTabs, closeTab])

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      overflow: 'hidden',
    }}>
      {/* Tab Bar */}
      <div style={{
        height: 35,
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}>
        <div
          onClick={() => setActiveTab(WELCOME_TAB)}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            padding: '0 14px',
            background: activeTabId === WELCOME_TAB || !activeTabId ? 'var(--bg-primary)' : 'var(--bg-secondary)',
            borderRight: '1px solid var(--border-color)',
            borderBottom: activeTabId === WELCOME_TAB || !activeTabId ? '2px solid var(--accent-blue)' : 'none',
            fontSize: 12,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            userSelect: 'none',
            gap: 6,
          }}
        >
          <span>🏠</span>
          <span>欢迎</span>
        </div>
        {openTabs.map(tab => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id, tab.title)}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: '100%',
              padding: '0 10px',
              background: tab.id === activeTabId ? 'var(--bg-primary)' : 'var(--bg-secondary)',
              borderRight: '1px solid var(--border-color)',
              borderBottom: tab.id === activeTabId ? '2px solid var(--accent-blue)' : 'none',
              fontSize: 12,
              color: tab.id === activeTabId ? 'var(--text-highlight)' : 'var(--text-secondary)',
              cursor: 'pointer',
              userSelect: 'none',
              gap: 6,
              minWidth: 0,
              flexShrink: 0,
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => {
              if (tab.id !== activeTabId) e.currentTarget.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={e => {
              if (tab.id !== activeTabId) e.currentTarget.style.background = 'var(--bg-secondary)'
            }}
          >
            <span style={{ fontSize: 11, opacity: 0.7 }}>📄</span>
            <span style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: 120,
            }}>
              {tab.title}
            </span>
            {tab.isDirty && <span style={{ color: 'var(--accent-yellow)', fontSize: 14 }}>●</span>}
            <span
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
              style={{
                marginLeft: 4,
                opacity: 0.5,
                cursor: 'pointer',
                fontSize: 14,
                lineHeight: 1,
                padding: '0 2px',
                borderRadius: 2,
                transition: 'all 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'transparent' }}
            >
              ×
            </span>
          </div>
        ))}
      </div>

      {/* Editor Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab ? (
          <MonacoEditor
            tabId={activeTab.id}
            language={activeTab.language}
            value={activeTab.content || ''}
            path={activeTab.path}
          />
        ) : (
          <WelcomePage />
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            zIndex: 999,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            padding: '4px 0',
            minWidth: 160,
            animation: 'fadeIn 0.08s ease-out',
          }}
        >
          <div style={{ padding: '4px 12px', fontSize: 11, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-color)', marginBottom: 4 }}>
            {contextMenu.tabTitle}
          </div>
          <MenuItem label="关闭" shortcut="Ctrl+W" onClick={() => handleCloseTab(contextMenu.tabId)} />
          <MenuItem label="关闭其他" onClick={handleCloseOthers} />
          <MenuItem label="关闭右侧" onClick={handleCloseRight} />
          <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }} />
          <MenuItem label="关闭所有" onClick={handleCloseAll} />
        </div>
      )}
    </div>
  )
}

function MenuItem({ label, shortcut, onClick }: { label: string; shortcut?: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '5px 12px',
        cursor: 'pointer',
        fontSize: 12,
        color: 'var(--text-primary)',
        transition: 'background 0.08s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span>{label}</span>
      {shortcut && <span style={{ fontSize: 11, color: 'var(--text-secondary)', marginLeft: 20, fontFamily: 'monospace' }}>{shortcut}</span>}
    </div>
  )
}

function WelcomePage() {
  const openFile = useEditorStore(s => s.openFile)
  const setCommandPaletteOpen = useAppStore(s => s.setCommandPaletteOpen)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const setActiveSidebarView = useAppStore(s => s.setActiveSidebarView)

  const toast = (msg: string) => useAppStore.getState().setToast(msg)

  const setRootPath = useAppStore(s => s.setRootPath)

  const handleOpenFolder = async () => {
    const result = await openFolderDialog()
    if (result) {
      console.log('Opened folder:', result)
      setRootPath(result)
      toast(`已打开文件夹: ${result}`)
    } else {
      const hasFileSystemAPI = typeof (window as any).showDirectoryPicker === 'function'
      if (hasFileSystemAPI) {
        toast('已取消选择文件夹')
      } else {
        toast('请使用支持 File System Access API 的现代浏览器（如 Chrome/Edge）')
      }
    }
  }

  const handleCloneRepo = () => {
    toast('克隆仓库功能开发中，敬请期待')
  }

  const handleCommandPalette = () => {
    setCommandPaletteOpen(true)
  }

  const handleToggleSidebar = () => {
    toggleSidebar()
    toast('侧边栏已切换')
  }

  const handleExtensions = () => {
    setActiveSidebarView('extensions')
    toast('已切换到扩展管理面板')
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 20,
      padding: 40,
      height: '100%',
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: 16,
        background: 'linear-gradient(135deg, var(--accent-blue), #4ec9b0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 36,
        fontWeight: 700,
        color: 'white',
        marginBottom: 8,
      }}>
        FC
      </div>
      <h1 style={{ fontSize: 28, fontWeight: 300, color: 'var(--text-highlight)', letterSpacing: 1 }}>
        FyqyClaw
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'center', lineHeight: 1.8 }}>
        飞扬企源AI — 全流程AI开发工具
        <br />
        支持 IDE 精细操控与 SOLO AI 全自动开发双模式
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        <button
          onClick={handleOpenFolder}
          style={{
            padding: '10px 28px',
            background: 'var(--accent-blue)',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1a8ae8')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--accent-blue)')}
        >
          打开文件夹
        </button>
        <button
          onClick={handleCloneRepo}
          style={{
            padding: '10px 28px',
            background: 'transparent',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13,
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          克隆仓库
        </button>
      </div>
      <div style={{ marginTop: 24, display: 'flex', gap: 48, color: 'var(--text-secondary)', fontSize: 12 }}>
        <div
          onClick={handleCommandPalette}
          style={{ textAlign: 'center', cursor: 'pointer', transition: 'opacity 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.7' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.6 }}>⌘K ⌘P</div>
          <div>命令面板</div>
        </div>
        <div
          onClick={handleToggleSidebar}
          style={{ textAlign: 'center', cursor: 'pointer', transition: 'opacity 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.7' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.6 }}>⌘B</div>
          <div>切换侧边栏</div>
        </div>
        <div
          onClick={handleExtensions}
          style={{ textAlign: 'center', cursor: 'pointer', transition: 'opacity 0.12s' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.7' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          <div style={{ fontSize: 22, marginBottom: 6, opacity: 0.6 }}>⌘⇧P</div>
          <div>扩展管理</div>
        </div>
      </div>
    </div>
  )
}