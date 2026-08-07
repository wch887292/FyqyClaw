import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useAppStore, type Command } from '../stores/app-store'
import { openFolderDialog, openFileDialog } from '../utils/electron-bridge'

export function CommandPalette() {
  const open = useAppStore(s => s.commandPaletteOpen)
  const setOpen = useAppStore(s => s.setCommandPaletteOpen)
  const commands = useAppStore(s => s.commands)
  const toggleMode = useAppStore(s => s.toggleMode)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Build default commands
  const allCommands = useMemo<Command[]>(() => [
    {
      id: 'toggle-mode',
      label: '切换开发模式',
      description: '在 IDE 模式和 SOLO 模式之间切换',
      category: '开发',
      shortcut: 'Ctrl+Shift+M',
      icon: '🔄',
      action: () => { toggleMode(); setOpen(false) },
    },
    {
      id: 'toggle-sidebar',
      label: '切换侧边栏',
      description: '显示或隐藏侧边栏',
      category: '视图',
      shortcut: 'Ctrl+B',
      icon: '📂',
      action: () => { toggleSidebar(); setOpen(false) },
    },
    {
      id: 'open-folder',
      label: '打开文件夹',
      description: '选择并打开项目文件夹',
      category: '文件',
      shortcut: '',
      icon: '📁',
      action: () => {
        setOpen(false)
        setTimeout(() => { openFolderDialog() }, 100)
      },
    },
    {
      id: 'open-file',
      label: '打开文件',
      description: '打开文件到编辑器',
      category: '文件',
      shortcut: '',
      icon: '📄',
      action: () => {
        setOpen(false)
        setTimeout(() => { openFileDialog() }, 100)
      },
    },
    ...commands,
  ], [commands, toggleMode, toggleSidebar, setOpen])

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands
    const lower = query.toLowerCase()
    return allCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(lower) ||
      cmd.description.toLowerCase().includes(lower) ||
      cmd.category.toLowerCase().includes(lower)
    )
  }, [allCommands, query])

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selected = listRef.current.children[selectedIndex] as HTMLElement
      if (selected) {
        selected.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  const executeSelected = useCallback(() => {
    const cmd = filteredCommands[selectedIndex]
    if (cmd) {
      cmd.action()
    }
  }, [filteredCommands, selectedIndex])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        executeSelected()
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
    }
  }, [filteredCommands, executeSelected, setOpen])

  if (!open) return null

  // Group commands by category
  const grouped = filteredCommands.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = []
    acc[cmd.category].push(cmd)
    return acc
  }, {})

  let globalIndex = 0

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '10vh',
        background: 'rgba(0, 0, 0, 0.45)',
        animation: 'fadeIn 0.1s ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        className="command-palette"
        style={{
          width: 540,
          maxHeight: 400,
          background: 'var(--bg-secondary)',
          borderRadius: 8,
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          animation: 'slideDown 0.12s ease-out',
        }}
      >
        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-color)',
        }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14, marginRight: 8 }}>⌘</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入命令名称..."
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: 14,
              lineHeight: '24px',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: 16,
                padding: '0 4px',
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* Command List */}
        <div
          ref={listRef}
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '4px 0',
          }}
        >
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div style={{
                padding: '4px 12px',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {category}
              </div>
              {cmds.map(cmd => {
                const currentIndex = globalIndex++
                return (
                  <div
                    key={cmd.id}
                    onClick={() => { cmd.action() }}
                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      cursor: 'pointer',
                      background: currentIndex === selectedIndex ? 'var(--accent-blue)' : 'transparent',
                      color: currentIndex === selectedIndex ? 'white' : 'var(--text-primary)',
                      transition: 'background 0.08s',
                      margin: '0 4px',
                      borderRadius: 4,
                    }}
                  >
                    {cmd.icon && (
                      <span style={{ marginRight: 8, fontSize: 14, opacity: 0.8 }}>{cmd.icon}</span>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {cmd.label}
                      </div>
                      <div style={{
                        fontSize: 11,
                        opacity: 0.7,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {cmd.description}
                      </div>
                    </div>
                    {cmd.shortcut && (
                      <span style={{
                        fontSize: 11,
                        opacity: 0.5,
                        marginLeft: 12,
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace',
                      }}>
                        {cmd.shortcut}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          {filteredCommands.length === 0 && (
            <div style={{
              padding: 24,
              textAlign: 'center',
              color: 'var(--text-secondary)',
              fontSize: 13,
            }}>
              未找到匹配的命令
            </div>
          )}
        </div>
      </div>
    </div>
  )
}