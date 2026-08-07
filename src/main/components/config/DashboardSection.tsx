import React from 'react'
import { useAppStore } from '../../stores/app-store'

interface StatCard {
  label: string
  value: string
  trend: string
  icon: React.ReactNode
  color: string
}

const stats: StatCard[] = [
  {
    label: '活跃项目',
    value: '3',
    trend: '+1 本月',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: 'var(--accent-blue)',
  },
  {
    label: 'AI 对话次数',
    value: '128',
    trend: '较昨日 +12%',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    color: 'var(--accent-green)',
  },
  {
    label: 'MCP 工具',
    value: '5',
    trend: '2 个在线',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <path d="M6 6h.01M6 18h.01" />
      </svg>
    ),
    color: 'var(--accent-yellow)',
  },
  {
    label: '已安装技能',
    value: '8',
    trend: '3 个待更新',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    color: 'var(--accent-orange)',
  },
]

const toast = (msg: string) => useAppStore.getState().setToast(msg)

export function DashboardSection({ onNavigate }: { onNavigate?: (sectionId: string) => void }) {

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 8 }}>
        概览
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
        FyqyClaw 系统运行状态总览
      </p>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 32,
      }}>
        {stats.map(stat => (
          <div
            key={stat.label}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--border-color)',
              padding: 20,
            }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: `${stat.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: stat.color,
              }}>
                {stat.icon}
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-highlight)', marginBottom: 4 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 2 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 11, color: 'var(--accent-green)' }}>
              {stat.trend}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 16 }}>
          快速操作
        </h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          {[
            { label: '配置 AI 模型', desc: '管理模型端点、API Key 和参数', icon: '🤖', section: 'models' },
            { label: '管理 MCP 服务器', desc: '注册和配置 MCP 工具服务', icon: '🔌', section: 'mcp' },
            { label: '安装技能', desc: '浏览和安装 AI 辅助技能', icon: '🧩', section: 'skills' },
            { label: '系统设置', desc: '调整通用、编辑器、安全等设置', icon: '⚙️', section: 'settings' },
            { label: '项目设置', desc: '配置当前工作区项目', icon: '📁', section: 'settings' },
            { label: '查看日志', desc: '检查系统运行日志和错误', icon: '📋', section: 'settings' },
          ].map(action => (
            <div
              key={action.label}
              onClick={() => {
                if (onNavigate && action.section) {
                  onNavigate(action.section)
                } else {
                  toast(`功能开发中: ${action.label}`)
                }
              }}
              style={{
                padding: 16, borderRadius: 8,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'border-color 0.12s, background 0.12s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-blue)'
                e.currentTarget.style.background = 'var(--bg-hover)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-color)'
                e.currentTarget.style.background = 'var(--bg-secondary)'
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>{action.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {action.label}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {action.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 16 }}>
          最近活动
        </h3>
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 10,
          border: '1px solid var(--border-color)',
          padding: 16,
        }}>
          {[
            { time: '10:32', action: '更新 AI 模型配置', detail: '切换默认模型为 GPT-4o' },
            { time: '09:15', action: '注册 MCP 服务器', detail: '添加 Git 操作工具服务' },
            { time: '昨天', action: '安装新技能', detail: '安装"代码审查"技能 v1.2.0' },
            { time: '昨天', action: '系统设置变更', detail: '开启隐私模式' },
            { time: '3天前', action: '项目初始化', detail: '创建新项目 "FyqyClaw"' },
          ].map((activity, i) => (
            <div
              key={i}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0',
                borderBottom: i < 4 ? '1px solid var(--border-color)' : 'none',
              }}
            >
              <div style={{
                fontSize: 11, color: 'var(--text-secondary)',
                minWidth: 48, fontFamily: 'monospace',
              }}>
                {activity.time}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{activity.action}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{activity.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}