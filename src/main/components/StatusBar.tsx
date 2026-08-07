import React, { useState, useEffect } from 'react'
import type { DevelopmentMode } from '@shared/types/core'
import { getGitStatus } from '../utils/electron-bridge'

interface StatusBarProps {
  mode: DevelopmentMode
  onModeSwitch: (mode: DevelopmentMode) => void
}

export function StatusBar({ mode, onModeSwitch }: StatusBarProps) {
  const [time, setTime] = useState('')
  const [gitBranch, setGitBranch] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }))
    }
    updateTime()
    const timer = setInterval(updateTime, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const fetchBranch = async () => {
      const result = await getGitStatus()
      if (result?.branch) {
        setGitBranch(result.branch)
      }
    }
    fetchBranch()
    const timer = setInterval(fetchBranch, 5000)
    return () => clearInterval(timer)
  }, [])

  const modeLabel = mode === 'ide' ? 'IDE 模式' : 'SOLO 模式'
  const modeColor = mode === 'ide' ? '#4ec9b0' : '#dcdcaa'

  return (
    <div style={{
      height: 24,
      background: 'var(--accent-blue)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      fontSize: 12,
      color: 'white',
      userSelect: 'none',
      flexShrink: 0,
    }}>
      {/* Left section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>FyqyClaw</span>

        {/* Git branch */}
        {gitBranch && (
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            opacity: 0.8,
            fontSize: 11,
          }}>
            <span>⎇</span>
            <span>{gitBranch}</span>
          </span>
        )}

        {/* Mode badge */}
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: modeColor,
          color: '#1e1e1e',
          padding: '1px 6px',
          borderRadius: 3,
          fontSize: 11,
          fontWeight: 600,
        }}>
          {modeLabel}
        </span>
      </div>

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Mode switch button */}
        <button
          onClick={() => onModeSwitch(mode === 'ide' ? 'solo' : 'ide')}
          className="status-bar-mode"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            color: 'white',
            padding: '2px 8px',
            borderRadius: 3,
            cursor: 'pointer',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {mode === 'ide' ? '→ SOLO' : '→ IDE'}
        </button>

        {/* Keyboard shortcut hint */}
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          opacity: 0.6,
          fontSize: 11,
          fontFamily: 'monospace',
        }}>
          <span>⌘⇧P</span>
        </span>

        {/* Time */}
        <span style={{ opacity: 0.7, fontSize: 11 }}>{time}</span>

        {/* Version */}
        <span style={{ opacity: 0.5, fontSize: 11 }}>v1.0.0</span>
      </div>
    </div>
  )
}