import React from 'react'

/**
 * 共享的设置 UI 组件
 * 供 SettingsPanel（弹窗设置）和 SystemSettingsSection（配置页设置）使用
 */

// ---- Style Presets ----

export const selectStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)',
  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
  fontSize: 12, outline: 'none', cursor: 'pointer', minWidth: 130,
}

export const inputStyle: React.CSSProperties = {
  padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)',
  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
  fontSize: 12, outline: 'none', minWidth: 200,
}

// ---- Toggle Button ----

export function ToggleButton({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 44, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer',
        background: value ? 'var(--accent-green)' : 'var(--bg-tertiary)',
        position: 'relative', transition: 'background 0.2s',
        boxShadow: value ? '0 0 8px rgba(78,201,176,0.3)' : 'none',
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%', background: 'white',
        position: 'absolute', top: 2, transition: 'left 0.2s',
        left: value ? 24 : 2, boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </button>
  )
}

// ---- Settings Row ----

export function SettingsRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '10px 20px', gap: 16,
      transition: 'background 0.08s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{description}</div>
      </div>
      <div style={{ flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

// ---- Settings Card (for config page) ----

export function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: 10,
      border: '1px solid var(--border-color)',
      marginBottom: 16,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid var(--border-color)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text-highlight)',
      }}>
        {title}
      </div>
      <div style={{ padding: '4px 0' }}>
        {children}
      </div>
    </div>
  )
}