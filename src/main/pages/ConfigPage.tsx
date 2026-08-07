import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '../stores/app-store'
import { DashboardSection } from '../components/config/DashboardSection'
import { ModelsSection } from '../components/config/ModelsSection'
import { MCPServersSection } from '../components/config/MCPServersSection'
import { SkillsSection } from '../components/config/SkillsSection'
import { SystemSettingsSection } from '../components/config/SystemSettingsSection'
import { AboutSection } from '../components/config/AboutSection'
import { DisclaimerSection } from '../components/config/DisclaimerSection'
import { LicenseSection } from '../components/config/LicenseSection'

export type ConfigSectionId = 'dashboard' | 'models' | 'mcp' | 'skills' | 'settings' | 'about' | 'disclaimer' | 'license'

interface ConfigSection {
  id: ConfigSectionId
  label: string
  icon: React.ReactNode
}

const configSections: ConfigSection[] = [
  {
    id: 'dashboard',
    label: '仪表盘',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: 'models',
    label: 'AI 模型',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    id: 'mcp',
    label: 'MCP 服务器',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
        <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
        <path d="M6 6h.01M6 18h.01" />
      </svg>
    ),
  },
  {
    id: 'skills',
    label: '技能管理',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    ),
  },
  {
    id: 'about',
    label: '关于',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  {
    id: 'disclaimer',
    label: '免责声明',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    id: 'license',
    label: '开源协议',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
]

export function ConfigPage() {
  const [activeSection, setActiveSection] = useState<ConfigSectionId>('dashboard')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const theme = useAppStore(s => s.theme)
  const setTheme = useAppStore(s => s.setTheme)

  // 支持从 URL 查询参数跳转到指定 section
  useEffect(() => {
    const sectionParam = searchParams.get('section')
    if (sectionParam && configSections.some(s => s.id === sectionParam)) {
      setActiveSection(sectionParam as ConfigSectionId)
    }
  }, [searchParams])

  const handleBackToIde = () => {
    navigate('/ide')
  }

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      {/* Sidebar */}
      <ConfigSidebar
        activeSection={activeSection}
        sections={configSections}
        onSectionChange={setActiveSection}
        onBackToIde={handleBackToIde}
        theme={theme}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <ConfigHeader
          title={configSections.find(s => s.id === activeSection)?.label || ''}
          onBackToIde={handleBackToIde}
        />

        {/* Content Area */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: 32,
        }}>
          {activeSection === 'dashboard' && <DashboardSection onNavigate={(id) => setActiveSection(id as ConfigSectionId)} />}
          {activeSection === 'models' && <ModelsSection />}
          {activeSection === 'mcp' && <MCPServersSection />}
          {activeSection === 'skills' && <SkillsSection />}
          {activeSection === 'settings' && <SystemSettingsSection />}
          {activeSection === 'about' && <AboutSection />}
          {activeSection === 'disclaimer' && <DisclaimerSection />}
          {activeSection === 'license' && <LicenseSection />}
        </div>
      </div>
    </div>
  )
}

// ---- Sidebar ----

function ConfigSidebar({
  activeSection,
  sections,
  onSectionChange,
  onBackToIde,
  theme,
  onThemeToggle,
}: {
  activeSection: ConfigSectionId
  sections: ConfigSection[]
  onSectionChange: (id: ConfigSectionId) => void
  onBackToIde: () => void
  theme: string
  onThemeToggle: () => void
}) {
  return (
    <div style={{
      width: 240,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Logo Area */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent-blue), #4ec9b0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 800, color: 'white',
          }}>
            FC
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-highlight)' }}>FyqyClaw</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>管理配置中心</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, padding: '8px 0', overflow: 'auto' }}>
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              border: 'none',
              background: activeSection === section.id ? 'var(--bg-hover)' : 'transparent',
              color: activeSection === section.id ? 'var(--text-highlight)' : 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 13,
              textAlign: 'left',
              transition: 'background 0.08s',
              borderLeft: activeSection === section.id ? '3px solid var(--accent-blue)' : '3px solid transparent',
            }}
            onMouseEnter={e => {
              if (activeSection !== section.id) e.currentTarget.style.background = 'var(--bg-hover)'
            }}
            onMouseLeave={e => {
              if (activeSection !== section.id) e.currentTarget.style.background = 'transparent'
            }}
          >
            <span style={{
              opacity: activeSection === section.id ? 1 : 0.6,
              display: 'flex',
            }}>
              {section.icon}
            </span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom Actions */}
      <div style={{
        borderTop: '1px solid var(--border-color)',
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        <button
          onClick={onThemeToggle}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 6,
            border: 'none', background: 'transparent',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: 12, transition: 'background 0.08s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {theme === 'dark' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
          <span>{theme === 'dark' ? '切换浅色主题' : '切换深色主题'}</span>
        </button>
        <button
          onClick={onBackToIde}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 12px', borderRadius: 6,
            border: 'none', background: 'transparent',
            color: 'var(--accent-blue)', cursor: 'pointer',
            fontSize: 12, transition: 'background 0.08s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>返回 IDE</span>
        </button>
      </div>
    </div>
  )
}

// ---- Header ----

function ConfigHeader({
  title,
  onBackToIde,
}: {
  title: string
  onBackToIde: () => void
}) {
  return (
    <div style={{
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: '1px solid var(--border-color)',
      background: 'var(--bg-primary)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={onBackToIde}
          title="返回 IDE"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 4,
            border: 'none', background: 'transparent',
            color: 'var(--text-secondary)', cursor: 'pointer',
            fontSize: 12, transition: 'background 0.08s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span>返回</span>
        </button>
        <div style={{
          width: 1, height: 20, background: 'var(--border-color)',
        }} />
        <h1 style={{
          fontSize: 16, fontWeight: 600, color: 'var(--text-highlight)',
        }}>
          {title}
        </h1>
      </div>
    </div>
  )
}