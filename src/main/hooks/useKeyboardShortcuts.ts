import { useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/app-store'

type ShortcutHandler = (e: KeyboardEvent) => void

interface Shortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  handler: ShortcutHandler
  description: string
}

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0
const modKey = isMac ? '⌘' : 'Ctrl'

export function formatShortcut(keys: { ctrl?: boolean; shift?: boolean; alt?: boolean; key: string }): string {
  const parts: string[] = []
  if (keys.ctrl) parts.push(modKey)
  if (keys.shift) parts.push('Shift')
  if (keys.alt) parts.push('Alt')
  parts.push(keys.key.toUpperCase())
  return parts.join('+')
}

export function useKeyboardShortcuts() {
  const toggleCommandPalette = useAppStore(s => s.toggleCommandPalette)
  const setCommandPaletteOpen = useAppStore(s => s.setCommandPaletteOpen)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const toggleMode = useAppStore(s => s.toggleMode)
  const toggleBottomPanel = useAppStore(s => s.toggleBottomPanel)
  const toggleRightPanel = useAppStore(s => s.toggleRightPanel)
  const commandPaletteOpen = useAppStore(s => s.commandPaletteOpen)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ctrl+Shift+P / Cmd+Shift+P - Toggle Command Palette
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyP') {
      e.preventDefault()
      toggleCommandPalette()
      return
    }

    // Escape - Close Command Palette
    if (e.code === 'Escape' && commandPaletteOpen) {
      e.preventDefault()
      setCommandPaletteOpen(false)
      return
    }

    // Ctrl+B / Cmd+B - Toggle Sidebar
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyB') {
      e.preventDefault()
      toggleSidebar()
      return
    }

    // Ctrl+Shift+M / Cmd+Shift+M - Toggle Mode
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyM') {
      e.preventDefault()
      toggleMode()
      return
    }

    // Ctrl+J / Cmd+J - Toggle Bottom Panel
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyJ') {
      e.preventDefault()
      toggleBottomPanel()
      return
    }

    // Ctrl+Alt+R / Cmd+Alt+R - Toggle Right AI Panel
    if ((e.ctrlKey || e.metaKey) && e.altKey && e.code === 'KeyR') {
      e.preventDefault()
      toggleRightPanel()
      return
    }

    // Ctrl+` / Cmd+` - Toggle Terminal (bottom panel)
    if ((e.ctrlKey || e.metaKey) && e.code === 'Backquote') {
      e.preventDefault()
      toggleBottomPanel()
      return
    }
  }, [toggleCommandPalette, setCommandPaletteOpen, toggleSidebar, toggleMode, toggleBottomPanel, toggleRightPanel, commandPaletteOpen])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

export const DEFAULT_SHORTCUTS = [
  {
    keys: { ctrl: true, shift: true, key: 'P' },
    description: '打开命令面板',
  },
  {
    keys: { ctrl: true, key: 'B' },
    description: '切换侧边栏',
  },
  {
    keys: { ctrl: true, shift: true, key: 'M' },
    description: '切换开发模式',
  },
  {
    keys: { ctrl: true, key: 'J' },
    description: '切换底部面板',
  },
  {
    keys: { ctrl: true, alt: true, key: 'R' },
    description: '切换右侧 AI 面板',
  },
  {
    keys: { ctrl: true, key: '`' },
    description: '切换终端',
  },
  {
    keys: { key: 'Esc' },
    description: '关闭面板',
  },
]