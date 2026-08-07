import React, { useState, useEffect, useCallback } from 'react'
import type { FileNode } from '@shared/types/ide'
import { useEditorStore } from '../../main/stores/editor-store'
import { readDirectory, readFile } from '../../main/utils/electron-bridge'

interface FileTreeProps {
  rootPath?: string
}

export function FileTree({ rootPath }: FileTreeProps) {
  const [tree, setTree] = useState<FileNode[]>([])
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const openFile = useEditorStore(s => s.openFile)
  const fileTree = useEditorStore(s => s.fileTree)

  useEffect(() => {
    if (rootPath) {
      loadDirectory(rootPath)
    }
  }, [rootPath])

  const loadDirectory = async (dirPath: string) => {
    setLoading(true)
    try {
      const result = await readDirectory(dirPath)
      if (result) {
        setTree(result as any)
        useEditorStore.getState().setFileTree(result as any)
      }
    } catch (err) {
      console.error('Failed to load directory:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpand = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const handleFileClick = useCallback(async (node: FileNode) => {
    if (node.type === 'directory') {
      toggleExpand(node.path)
      return
    }

    try {
      const content = await readFile(node.path)
      const ext = node.name.split('.').pop()?.toLowerCase() || ''
      const languageMap: Record<string, string> = {
        ts: 'typescript', tsx: 'typescriptreact', js: 'javascript',
        jsx: 'javascriptreact', py: 'python', go: 'go', rs: 'rust',
        java: 'java', json: 'json', md: 'markdown', css: 'css',
        html: 'html', yaml: 'yaml', yml: 'yaml', xml: 'xml',
        sql: 'sql', sh: 'shell', bash: 'shell', dockerfile: 'dockerfile',
      }
      openFile({
        id: node.path,
        path: node.path,
        title: node.name,
        language: languageMap[ext] || 'plaintext',
        isDirty: false,
        content: content || '',
      })
    } catch (err) {
      console.error('Failed to read file:', err)
    }
  }, [openFile, toggleExpand])

  const renderNode = (node: FileNode, depth: number = 0) => {
    const isExpanded = expandedPaths.has(node.path)
    const isActive = useEditorStore.getState().activeTabId === node.path

    return (
      <React.Fragment key={node.path}>
        <div
          onClick={() => handleFileClick(node)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            paddingLeft: 12 + depth * 16,
            cursor: 'pointer',
            fontSize: 13,
            color: isActive ? 'var(--text-highlight)' : 'var(--text-primary)',
            background: isActive ? 'var(--bg-hover)' : 'transparent',
            userSelect: 'none',
            borderRadius: 2,
            margin: '0 4px',
          }}
          onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{ fontSize: 10, width: 12, textAlign: 'center', opacity: 0.6 }}>
            {node.type === 'directory' ? (isExpanded ? '▼' : '▶') : ''}
          </span>
          <span style={{ fontSize: 14, lineHeight: '22px' }}>
            {node.type === 'directory' ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.name}
          </span>
        </div>
        {node.type === 'directory' && isExpanded && node.children?.map(child => renderNode(child, depth + 1))}
      </React.Fragment>
    )
  }

  if (loading) {
    return <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>加载中...</div>
  }

  if (!rootPath && tree.length === 0) {
    return <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>打开文件夹以浏览文件</div>
  }

  return <div>{tree.map(node => renderNode(node))}</div>
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    ts: '🔷', tsx: '⚛️', js: '🟨', jsx: '⚛️', py: '🐍', go: '🔵',
    rs: '🦀', json: '📋', md: '📝', css: '🎨', html: '🌐', yaml: '⚙️',
    yml: '⚙️', sql: '🗃️', sh: '💻', dockerfile: '🐳', gitignore: '🙈',
  }
  return iconMap[ext || ''] || '📄'
}