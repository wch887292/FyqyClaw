import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore, type SidebarView } from '../stores/app-store'

interface ActivityItem {
  id: SidebarView
  label: string
  icon: React.ReactNode
}

const FilesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
)

const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
)

const GitIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="18" r="3" />
    <circle cx="6" cy="6" r="3" />
    <circle cx="18" cy="6" r="3" />
    <path d="M18 9v1a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V9" />
    <path d="M12 12v3" />
  </svg>
)

const DebugIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
)

const ExtensionsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="4" />
    <path d="M7 2v20M17 2v20M2 7h20M2 17h20" />
  </svg>
)

const SkillsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)

const AgentsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 18.5a5.5 5.5 0 0 1 10 0" />
  </svg>
)

const BrowserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

const CrawlerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v12M6 12h12" />
    <path d="M9 9l3-3 3 3M9 15l3 3 3-3" />
  </svg>
)

const activityItems: ActivityItem[] = [
  { id: 'files', label: '项目资源管理器', icon: <FilesIcon /> },
  { id: 'search', label: '搜索替换', icon: <SearchIcon /> },
  { id: 'git', label: '源代码管理', icon: <GitIcon /> },
  { id: 'debug', label: '调试运行', icon: <DebugIcon /> },
  { id: 'extensions', label: '插件市场', icon: <ExtensionsIcon /> },
  { id: 'skills', label: '技能中心', icon: <SkillsIcon /> },
  { id: 'agents', label: 'AI 智能体管理', icon: <AgentsIcon /> },
  { id: 'browser', label: '内置浏览器', icon: <BrowserIcon /> },
  { id: 'crawler', label: '网页爬虫', icon: <CrawlerIcon /> },
]

export function ActivityBar() {
  const activeView = useAppStore(s => s.activeSidebarView)
  const setActiveView = useAppStore(s => s.setActiveSidebarView)
  const sidebarVisible = useAppStore(s => s.sidebarVisible)
  const toggleSidebar = useAppStore(s => s.toggleSidebar)
  const mode = useAppStore(s => s.mode)
  const navigate = useNavigate()

  const handleClick = (viewId: SidebarView) => {
    if (activeView === viewId && sidebarVisible) {
      toggleSidebar()
    } else {
      setActiveView(viewId)
      if (!sidebarVisible) {
        toggleSidebar()
      }
    }
  }

  return (
    <div style={{
      width: 48,
      background: 'var(--bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 4,
      gap: 2,
      borderRight: '1px solid var(--border-color)',
      flexShrink: 0,
      userSelect: 'none',
    }}>
      {activityItems.map(item => (
        <button
          key={item.id}
          onClick={() => handleClick(item.id)}
          title={item.label}
          style={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'transparent',
            color: activeView === item.id && sidebarVisible
              ? 'var(--text-highlight)'
              : 'var(--text-secondary)',
            cursor: 'pointer',
            borderRadius: 4,
            position: 'relative',
            transition: 'color 0.12s, background 0.12s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--bg-hover)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          {item.icon}
          {activeView === item.id && sidebarVisible && (
            <div style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 2,
              height: 20,
              background: 'var(--text-highlight)',
              borderRadius: '0 2px 2px 0',
            }} />
          )}
        </button>
      ))}
      <div style={{ marginTop: 'auto' }}>
        <button
          onClick={() => navigate('/config')}
          title="管理配置中心"
          style={{
            width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer', borderRadius: 4,
            transition: 'color 0.12s, background 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
      </div>
      {mode === 'solo' && (
        <div style={{
          marginTop: 'auto',
          marginBottom: 8,
          width: 32,
          height: 32,
          borderRadius: 6,
          background: 'linear-gradient(135deg, var(--accent-blue), #4ec9b0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          color: 'white',
        }}>
          AI
        </div>
      )}
    </div>
  )
}