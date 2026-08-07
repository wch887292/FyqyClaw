import React, { useState } from 'react'
import { useAppStore } from '../stores/app-store'
import { SettingsRow, ToggleButton, selectStyle, inputStyle } from './config/SettingsUI'

interface SettingsSection {
  id: string
  label: string
  icon: string
}

const sections: SettingsSection[] = [
  { id: 'general', label: '通用', icon: '⚙' },
  { id: 'editor', label: '编辑器', icon: '📝' },
  { id: 'model', label: 'AI 模型', icon: '🤖' },
  { id: 'security', label: '安全', icon: '🔒' },
  { id: 'git', label: 'Git', icon: '⎇' },
  { id: 'workspace', label: '工作区', icon: '📁' },
  { id: 'about', label: '关于', icon: 'ℹ' },
]

interface SettingsPanelProps {
  onClose: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState('general')
  const privacyMode = useAppStore(s => s.privacyMode)
  const togglePrivacyMode = useAppStore(s => s.togglePrivacyMode)
  const sandboxEnabled = useAppStore(s => s.sandboxEnabled)
  const toggleSandboxEnabled = useAppStore(s => s.toggleSandboxEnabled)
  const theme = useAppStore(s => s.theme)
  const setTheme = useAppStore(s => s.setTheme)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 600,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.1s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 780,
          height: 560,
          background: 'var(--bg-primary)',
          borderRadius: 10,
          border: '1px solid var(--border-color)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          display: 'flex',
          overflow: 'hidden',
          animation: 'slideDown 0.15s ease-out',
        }}
      >
        {/* Sidebar */}
        <div style={{
          width: 200,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border-color)',
          padding: '12px 0',
          flexShrink: 0,
        }}>
          <div style={{
            padding: '8px 16px 16px',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-highlight)',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 8,
          }}>
            设置
          </div>
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                border: 'none',
                background: activeSection === section.id ? 'var(--bg-hover)' : 'transparent',
                color: activeSection === section.id ? 'var(--text-highlight)' : 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: 12,
                textAlign: 'left',
                transition: 'background 0.08s',
                borderLeft: activeSection === section.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (activeSection !== section.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
              onMouseLeave={e => { if (activeSection !== section.id) e.currentTarget.style.background = 'transparent' }}
            >
              <span>{section.icon}</span>
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-highlight)' }}>
              {sections.find(s => s.id === activeSection)?.label}
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
                fontSize: 20, padding: '4px 8px', borderRadius: 4, lineHeight: 1,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              ✕
            </button>
          </div>

          {activeSection === 'general' && (
            <SettingsGroup label="常规设置">
              <SettingsRow label="主题" description="选择界面主题风格">
                <select
                  style={selectStyle}
                  value={theme}
                  onChange={e => setTheme(e.target.value as 'dark' | 'light')}
                >
                  <option value="dark">深色主题</option>
                  <option value="light">浅色主题</option>
                </select>
              </SettingsRow>
              <SettingsRow label="界面语言" description="设置界面显示语言">
                <select style={selectStyle} defaultValue="zh-CN">
                  <option value="zh-CN">中文（简体）</option>
                  <option value="en">English</option>
                </select>
              </SettingsRow>
              <SettingsRow label="自动保存" description="编辑文件时自动保存更改">
                <select style={selectStyle} defaultValue="afterDelay">
                  <option value="afterDelay">延迟后自动保存</option>
                  <option value="onFocusChange">焦点变化时保存</option>
                  <option value="off">关闭</option>
                </select>
              </SettingsRow>
              <SettingsRow label="字体大小" description="编辑器字体大小">
                <select style={selectStyle} defaultValue="14">
                  {[12, 13, 14, 15, 16, 18, 20].map(size => (
                    <option key={size} value={String(size)}>{size}px</option>
                  ))}
                </select>
              </SettingsRow>
            </SettingsGroup>
          )}

          {activeSection === 'editor' && (
            <SettingsGroup label="编辑器设置">
              <SettingsRow label="Tab 大小" description="制表符宽度">
                <select style={selectStyle} defaultValue="2">
                  <option value="2">2 空格</option>
                  <option value="4">4 空格</option>
                  <option value="8">8 空格</option>
                </select>
              </SettingsRow>
              <SettingsRow label="自动换行" description="超出视口宽度时自动换行">
                <select style={selectStyle} defaultValue="off">
                  <option value="off">关闭</option>
                  <option value="on">开启</option>
                  <option value="wordWrapColumn">按列宽换行</option>
                </select>
              </SettingsRow>
              <SettingsRow label="显示行号" description="编辑器左侧显示行号">
                <select style={selectStyle} defaultValue="on">
                  <option value="on">开启</option>
                  <option value="off">关闭</option>
                  <option value="relative">相对行号</option>
                </select>
              </SettingsRow>
            </SettingsGroup>
          )}

          {activeSection === 'model' && (
            <SettingsGroup label="AI 模型设置">
              <SettingsRow label="默认模型" description="AI 对话默认使用的模型">
                <select style={selectStyle} defaultValue="gpt-4o">
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="claude-sonnet-4">Claude Sonnet 4</option>
                  <option value="deepseek-chat">DeepSeek V3</option>
                </select>
              </SettingsRow>
              <SettingsRow label="温度参数" description="控制生成文本的随机性 (0-2)">
                <select style={selectStyle} defaultValue="0.7">
                  <option value="0.1">0.1 - 精确确定</option>
                  <option value="0.3">0.3 - 保守</option>
                  <option value="0.7">0.7 - 平衡</option>
                  <option value="1.0">1.0 - 创意</option>
                  <option value="1.5">1.5 - 自由</option>
                </select>
              </SettingsRow>
              <SettingsRow label="最大 Token" description="单次生成的最大 Token 数量">
                <select style={selectStyle} defaultValue="4096">
                  <option value="2048">2048</option>
                  <option value="4096">4096</option>
                  <option value="8192">8192</option>
                  <option value="16384">16384</option>
                </select>
              </SettingsRow>
            </SettingsGroup>
          )}

          {activeSection === 'security' && (
            <SettingsGroup label="安全设置">
              <SettingsRow
                label="隐私模式"
                description="开启后代码和对话内容不上传训练，全程本地留存"
              >
                <ToggleButton value={privacyMode} onChange={togglePrivacyMode} />
              </SettingsRow>
              <SettingsRow
                label="沙箱执行"
                description="隔离执行 AI 生成命令，拦截高危操作"
              >
                <ToggleButton value={sandboxEnabled} onChange={toggleSandboxEnabled} />
              </SettingsRow>
              <SettingsRow label="高危操作确认" description="执行高危操作前需要人工确认">
                <ToggleButton value={true} onChange={() => {}} />
              </SettingsRow>
            </SettingsGroup>
          )}

          {activeSection === 'git' && (
            <SettingsGroup label="Git 设置">
              <SettingsRow label="用户名" description="Git 提交用户名">
                <input style={inputStyle} defaultValue="user" placeholder="输入 Git 用户名" />
              </SettingsRow>
              <SettingsRow label="邮箱" description="Git 提交邮箱">
                <input style={inputStyle} defaultValue="user@example.com" placeholder="输入 Git 邮箱" />
              </SettingsRow>
              <SettingsRow label="默认提交模板" description="Commit 信息的默认格式">
                <select style={selectStyle} defaultValue="conventional">
                  <option value="conventional">常规提交 (Conventional)</option>
                  <option value="simple">简单提交</option>
                  <option value="custom">自定义</option>
                </select>
              </SettingsRow>
            </SettingsGroup>
          )}

          {activeSection === 'workspace' && (
            <SettingsGroup label="工作区设置">
              <SettingsRow label="默认工作目录" description="打开项目时的默认路径">
                <input style={inputStyle} defaultValue="H:\FyqyClaw" placeholder="输入工作目录路径" />
              </SettingsRow>
              <SettingsRow label="远程 SSH" description="连接到远程开发服务器">
                <input style={inputStyle} placeholder="user@host:port" />
              </SettingsRow>
              <SettingsRow label="WSL 发行版" description="选择 WSL 发行版">
                <select style={selectStyle} defaultValue="">
                  <option value="">未配置</option>
                  <option value="Ubuntu">Ubuntu</option>
                  <option value="Debian">Debian</option>
                </select>
              </SettingsRow>
            </SettingsGroup>
          )}

          {activeSection === 'about' && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 14,
                background: 'linear-gradient(135deg, var(--accent-blue), #4ec9b0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 700, color: 'white',
                margin: '0 auto 16px',
              }}>
                FC
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 4 }}>
                FyqyClaw
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
                版本 1.0.0
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.7 }}>
                晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', opacity: 0.7, marginTop: 4 }}>
                项目负责人：吴赐虹
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SettingsGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{
        fontSize: 11, color: 'var(--text-secondary)', textTransform: 'uppercase',
        letterSpacing: '0.5px', marginBottom: 16, paddingBottom: 8,
        borderBottom: '1px solid var(--border-color)',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {children}
      </div>
    </div>
  )
}