import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ActivityBar } from './ActivityBar'
import { Sidebar } from './Sidebar'
import { EditorArea } from './EditorArea'
import { MenuBar } from './MenuBar'
import { BottomPanel } from './BottomPanel'
import { RightAIPanel } from './RightAIPanel'
import { StatusBar } from './StatusBar'
import { SoloPanel } from './SoloPanel'
import { SoloFullScreen } from './SoloFullScreen'
import { CommandPalette } from './CommandPalette'
import { ModelConfigPanel } from './ModelConfigPanel'
import { SettingsPanel } from './SettingsPanel'
import { useAppStore, type Command } from '../stores/app-store'
import { useEditorStore } from '../stores/editor-store'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { openFolderDialog, openFileDialog, readFile } from '../utils/electron-bridge'

// 模块级自增计数器，避免 Date.now() 同毫秒冲突导致新文件 id 重复
let newFileCounter = 0

export function AppLayout() {
  const mode = useAppStore(s => s.mode)
  const toggleMode = useAppStore(s => s.toggleMode)
  const sidebarVisible = useAppStore(s => s.sidebarVisible)
  const soloFullScreen = useAppStore(s => s.soloFullScreen)
  const toggleSoloFullScreen = useAppStore(s => s.toggleSoloFullScreen)
  const settingsOpen = useAppStore(s => s.settingsOpen)
  const setSettingsOpen = useAppStore(s => s.setSettingsOpen)
  const registerCommands = useAppStore(s => s.registerCommands)
  const navigate = useNavigate()

  // Activate global keyboard shortcuts
  useKeyboardShortcuts()

  // Register global commands on mount
  useEffect(() => {
    const globalCommands: Command[] = [
      {
        id: 'new-file',
        label: '新建文件',
        description: '创建一个新的空白文件',
        category: '文件',
        shortcut: 'Ctrl+N',
        icon: '📄',
        action: () => {
          newFileCounter++
          const id = `new-${Date.now()}-${newFileCounter}`
          useEditorStore.getState().openFile({
            id,
            path: `untitled-${newFileCounter}`,
            title: `Untitled-${newFileCounter}`,
            language: 'plaintext',
            isDirty: false,
            content: '',
          })
        },
      },
      {
        id: 'save-file',
        label: '保存文件',
        description: '保存当前编辑的文件',
        category: '文件',
        shortcut: 'Ctrl+S',
        icon: '💾',
        action: () => {
          const { activeTabId, openTabs, markTabDirty } = useEditorStore.getState()
          if (activeTabId) {
            markTabDirty(activeTabId, false)
            const tab = openTabs.find(t => t.id === activeTabId)
            useAppStore.getState().setToast(`已保存: ${tab?.title || '当前文件'}`)
          }
        },
      },
      {
        id: 'open-settings',
        label: '打开设置',
        description: '打开系统设置面板',
        category: '系统',
        shortcut: 'Ctrl+,',
        icon: '⚙️',
        action: () => { useAppStore.getState().setSettingsOpen(true) },
      },
      {
        id: 'open-config-center',
        label: '打开配置中心',
        description: '打开完整配置中心页面',
        category: '系统',
        icon: '🔧',
        action: () => { navigate('/config') },
      },
      {
        id: 'toggle-bottom-panel',
        label: '切换底部面板',
        description: '显示或隐藏底部终端/输出面板',
        category: '视图',
        shortcut: 'Ctrl+J',
        icon: '📋',
        action: () => { useAppStore.getState().toggleBottomPanel() },
      },
      {
        id: 'toggle-right-panel',
        label: '切换右侧面板',
        description: '显示或隐藏右侧 AI 交互面板',
        category: '视图',
        shortcut: 'Ctrl+Alt+R',
        icon: '🤖',
        action: () => { useAppStore.getState().toggleRightPanel() },
      },
      {
        id: 'open-terminal',
        label: '打开终端',
        description: '打开底部终端面板',
        category: '终端',
        shortcut: 'Ctrl+`',
        icon: '💻',
        action: () => {
          useAppStore.getState().setBottomPanelVisible(true)
          useAppStore.getState().setActiveBottomTab('terminal')
        },
      },
      {
        id: 'model-config',
        label: '配置 AI 模型',
        description: '配置 AI 模型连接',
        category: 'AI',
        shortcut: 'Ctrl+Alt+M',
        icon: '🧠',
        action: () => { useAppStore.getState().setModelConfigOpen(true) },
      },
      {
        id: 'toggle-mode',
        label: '切换开发模式',
        description: '在 IDE 和 SOLO 模式之间切换',
        category: '开发',
        shortcut: 'Ctrl+Shift+M',
        icon: '🔄',
        action: () => { useAppStore.getState().toggleMode() },
      },
      {
        id: 'open-folder',
        label: '打开文件夹',
        description: '选择并打开项目文件夹',
        category: '文件',
        icon: '📁',
        action: async () => {
          const result = await openFolderDialog()
          if (result) {
            useAppStore.getState().setRootPath(result)
            // 同步工作区根到主进程，约束 fs:* 操作边界（防任意读写）
            ;(window as any).electronAPI?.setWorkspaceRoot?.(result)
            useAppStore.getState().setToast(`已打开文件夹: ${result}`)
          }
        },
      },
      {
        id: 'open-file',
        label: '打开文件',
        description: '打开文件到编辑器',
        category: '文件',
        icon: '📄',
        action: async () => {
          const filePath = await openFileDialog()
          if (filePath) {
            const content = await readFile(filePath)
            const name = filePath.split(/[/\\]/).pop() || filePath
            useEditorStore.getState().openFile({
              id: filePath,
              path: filePath,
              title: name,
              language: (filePath.split('.').pop() || 'plaintext').toLowerCase(),
              isDirty: false,
              content: content || '',
            })
            useAppStore.getState().setToast(`已打开文件: ${name}`)
          }
        },
      },
    ]
    registerCommands(globalCommands)
  }, [registerCommands, navigate])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
    }}>
      {/* MenuBar - 顶部菜单栏 */}
      <MenuBar />

      {/* Main content area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* ActivityBar - 左侧导航面板 */}
        <ActivityBar />

        {/* Sidebar - 侧边栏展开内容 */}
        {sidebarVisible && <Sidebar />}

        {/* Center: Editor area or SoloPanel */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {mode === 'solo' ? <SoloPanel /> : <EditorArea />}
        </div>

        {/* RightAIPanel - 右侧 AI 交互面板 */}
        <RightAIPanel />
      </div>

      {/* BottomPanel - 底部终端与输出面板 */}
      <BottomPanel />

      {/* StatusBar - 底部状态栏 */}
      <StatusBar mode={mode} onModeSwitch={toggleMode} />

      {/* Overlay components */}
      <CommandPalette />
      <ModelConfigPanel />
      <SoloFullScreen />
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {/* SOLO 全屏模式切换按钮 */}
      {mode === 'solo' && !soloFullScreen && (
        <button
          onClick={toggleSoloFullScreen}
          title="开启全屏 SOLO 任务视图"
          style={{
            position: 'fixed',
            bottom: 36,
            right: 16,
            zIndex: 50,
            width: 40,
            height: 40,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent-blue), #4ec9b0)',
            border: 'none',
            color: 'white',
            fontSize: 18,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.12s, box-shadow 0.12s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.08)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
        </button>
      )}
    </div>
  )
}