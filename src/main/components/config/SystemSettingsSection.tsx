import React from 'react'
import { useAppStore } from '../../stores/app-store'
import { SettingsRow, ToggleButton, SettingsCard, selectStyle, inputStyle } from './SettingsUI'

export function SystemSettingsSection() {
  const privacyMode = useAppStore(s => s.privacyMode)
  const togglePrivacyMode = useAppStore(s => s.togglePrivacyMode)
  const sandboxEnabled = useAppStore(s => s.sandboxEnabled)
  const toggleSandboxEnabled = useAppStore(s => s.toggleSandboxEnabled)
  const theme = useAppStore(s => s.theme)
  const setTheme = useAppStore(s => s.setTheme)

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 8 }}>
        系统设置
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
        配置 FyqyClaw 的通用、编辑器、AI、安全和网络设置
      </p>

      {/* General */}
      <SettingsCard title="通用">
        <SettingsRow label="应用主题" description="选择界面主题风格">
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
      </SettingsCard>

      {/* Editor */}
      <SettingsCard title="编辑器">
        <SettingsRow label="字体大小" description="编辑器字体大小">
          <select style={selectStyle} defaultValue="14">
            {[12, 13, 14, 15, 16, 18, 20].map(size => (
              <option key={size} value={String(size)}>{size}px</option>
            ))}
          </select>
        </SettingsRow>
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
      </SettingsCard>

      {/* AI Model */}
      <SettingsCard title="AI 模型">
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
      </SettingsCard>

      {/* Security */}
      <SettingsCard title="安全">
        <SettingsRow label="隐私模式" description="开启后代码和对话内容不上传训练，全程本地留存">
          <ToggleButton value={privacyMode} onChange={togglePrivacyMode} />
        </SettingsRow>
        <SettingsRow label="沙箱执行" description="隔离执行 AI 生成命令，拦截高危操作">
          <ToggleButton value={sandboxEnabled} onChange={toggleSandboxEnabled} />
        </SettingsRow>
        <SettingsRow label="高危操作确认" description="执行高危操作前需要人工确认">
          <ToggleButton value={true} onChange={() => {}} />
        </SettingsRow>
      </SettingsCard>

      {/* Git */}
      <SettingsCard title="Git">
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
      </SettingsCard>

      {/* Workspace */}
      <SettingsCard title="工作区">
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
      </SettingsCard>
    </div>
  )
}

