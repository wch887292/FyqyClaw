import React, { useState, useEffect, useCallback } from 'react'
import type { GitStatus, GitChange, GitCommit, GitBranch } from './types'

interface GitPanelProps {
  rootPath?: string
}

export function GitPanel({ rootPath }: GitPanelProps) {
  const [status, setStatus] = useState<GitStatus | null>(null)
  const [commits, setCommits] = useState<GitCommit[]>([])
  const [branches, setBranches] = useState<GitBranch[]>([])
  const [commitMessage, setCommitMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeSection, setActiveSection] = useState<'changes' | 'commits' | 'branches'>('changes')

  const refreshStatus = useCallback(async () => {
    if (!rootPath) return
    setLoading(true)
    try {
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.invoke) {
        const [gitStatus, gitCommits, gitBranches] = await Promise.all([
          electronAPI.invoke('git:status', rootPath),
          electronAPI.invoke('git:log', rootPath, 10),
          electronAPI.invoke('git:branches', rootPath),
        ])
        if (gitStatus) setStatus(gitStatus)
        if (gitCommits) setCommits(gitCommits)
        if (gitBranches) setBranches(gitBranches)
      }
    } catch (err) {
      console.error('Failed to get git status:', err)
    } finally {
      setLoading(false)
    }
  }, [rootPath])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleStageAll = async () => {
    if (!rootPath) return
    try {
      const electronAPI = (window as any).electronAPI
      await electronAPI?.invoke('git:add-all', rootPath)
      refreshStatus()
    } catch (err) {
      console.error('Failed to stage all:', err)
    }
  }

  const handleStageFile = async (filePath: string) => {
    if (!rootPath) return
    try {
      const electronAPI = (window as any).electronAPI
      await electronAPI?.invoke('git:add', rootPath, filePath)
      refreshStatus()
    } catch (err) {
      console.error('Failed to stage file:', err)
    }
  }

  const handleCommit = async () => {
    if (!rootPath || !commitMessage.trim()) return
    try {
      const electronAPI = (window as any).electronAPI
      await electronAPI?.invoke('git:commit', rootPath, commitMessage.trim())
      setCommitMessage('')
      refreshStatus()
    } catch (err) {
      console.error('Failed to commit:', err)
    }
  }

  const getStatusIcon = (status: string) => {
    const icons: Record<string, string> = {
      modified: '📝', added: '➕', deleted: '🗑️', renamed: '📎', untracked: '❓',
    }
    return icons[status] || '📄'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      modified: 'var(--accent-yellow)', added: 'var(--accent-green)',
      deleted: 'var(--accent-red)', renamed: 'var(--accent-orange)', untracked: 'var(--text-secondary)',
    }
    return colors[status] || 'var(--text-primary)'
  }

  if (!rootPath) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>⎇</div>
        <div>打开 Git 仓库以查看变更</div>
      </div>
    )
  }

  if (loading && !status) {
    return <div style={{ padding: 16, color: 'var(--text-secondary)', fontSize: 12 }}>加载 Git 状态...</div>
  }

  if (!status) {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
        <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>⎇</div>
        <div>此目录不是 Git 仓库</div>
      </div>
    )
  }

  return (
    <div style={{ fontSize: 12 }}>
      {/* Branch indicator */}
      <div style={{
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        borderBottom: '1px solid var(--border-color)',
      }}>
        <span>⎇</span>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{status.branch}</span>
        {status.ahead > 0 && <span style={{ color: 'var(--accent-green)' }}>↑{status.ahead}</span>}
        {status.behind > 0 && <span style={{ color: 'var(--accent-red)' }}>↓{status.behind}</span>}
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
        {(['changes', 'commits', 'branches'] as const).map(section => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            style={{
              flex: 1,
              padding: '6px 8px',
              background: activeSection === section ? 'var(--bg-primary)' : 'transparent',
              border: 'none',
              color: activeSection === section ? 'var(--text-highlight)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 500,
              borderBottom: activeSection === section ? '2px solid var(--accent-blue)' : 'none',
            }}
          >
            {section === 'changes' ? `变更 (${status.changes.length})` :
             section === 'commits' ? '提交记录' : '分支'}
          </button>
        ))}
      </div>

      {/* Changes section */}
      {activeSection === 'changes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>变更文件</span>
            <button
              onClick={handleStageAll}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--accent-blue)',
                cursor: 'pointer',
                fontSize: 11,
              }}
            >
              全部暂存
            </button>
          </div>
          {status.changes.map(change => (
            <div
              key={change.path}
              onClick={() => !change.staged && handleStageFile(change.path)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '3px 12px',
                cursor: change.staged ? 'default' : 'pointer',
                color: 'var(--text-primary)',
              }}
              onMouseEnter={e => { if (!change.staged) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (!change.staged) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ color: getStatusColor(change.status), fontSize: 11, width: 14, textAlign: 'right' }}>
                {change.status === 'modified' ? 'M' : change.status === 'added' ? 'A' : change.status === 'deleted' ? 'D' : '?'}
              </span>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
              }}>
                {change.path.split('/').pop() || change.path}
              </span>
              {change.staged && <span style={{ fontSize: 10, color: 'var(--accent-green)' }}>✓</span>}
            </div>
          ))}
          {status.changes.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>
              没有变更
            </div>
          )}

          {/* Commit input */}
          {status.changes.length > 0 && (
            <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border-color)' }}>
              <textarea
                value={commitMessage}
                onChange={e => setCommitMessage(e.target.value)}
                placeholder="输入提交信息..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 4,
                  color: 'var(--text-primary)',
                  fontSize: 12,
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit',
                }}
              />
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim()}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '6px 0',
                  background: commitMessage.trim() ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                  color: commitMessage.trim() ? 'white' : 'var(--text-secondary)',
                  border: 'none',
                  borderRadius: 4,
                  cursor: commitMessage.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                ✓ 提交
              </button>
            </div>
          )}
        </div>
      )}

      {/* Commits section */}
      {activeSection === 'commits' && (
        <div>
          {commits.map(commit => (
            <div key={commit.hash} style={{
              padding: '6px 12px',
              borderBottom: '1px solid var(--border-color)',
            }}>
              <div style={{ color: 'var(--text-primary)', fontSize: 12, marginBottom: 2 }}>
                {commit.message}
              </div>
              <div style={{ display: 'flex', gap: 8, color: 'var(--text-secondary)', fontSize: 10 }}>
                <span>{commit.hash.substring(0, 7)}</span>
                <span>{commit.author}</span>
                <span>{new Date(commit.date).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {commits.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>
              无提交记录
            </div>
          )}
        </div>
      )}

      {/* Branches section */}
      {activeSection === 'branches' && (
        <div>
          {branches.map(branch => (
            <div key={branch.name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              color: branch.current ? 'var(--accent-blue)' : 'var(--text-primary)',
              fontWeight: branch.current ? 600 : 400,
            }}>
              <span>⎇</span>
              <span>{branch.name}</span>
              {branch.current && <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>(当前)</span>}
            </div>
          ))}
          {branches.length === 0 && (
            <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)' }}>
              无分支信息
            </div>
          )}
        </div>
      )}
    </div>
  )
}