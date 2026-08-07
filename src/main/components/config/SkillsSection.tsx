import React, { useState } from 'react'
import { allSkills, type SkillEntry } from '../../mock-data'

export function SkillsSection() {
  const [skills, setSkills] = useState<SkillEntry[]>(allSkills)
  const [filter, setFilter] = useState<'all' | 'installed' | 'available' | 'updatable'>('all')

  const filteredSkills = filter === 'all'
    ? skills
    : skills.filter(s => s.status === filter)

  const installSkill = (id: string) => {
    setSkills(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'installed' as const } : s
    ))
  }

  const uninstallSkill = (id: string) => {
    setSkills(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'available' as const } : s
    ))
  }

  const updateSkill = (id: string) => {
    setSkills(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'installed' as const, version: '1.2.0' } : s
    ))
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 4 }}>
            技能管理
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            安装和管理 AI 辅助技能，增强开发能力
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex', gap: 4,
        marginBottom: 20,
        background: 'var(--bg-secondary)',
        borderRadius: 8,
        padding: 3,
        border: '1px solid var(--border-color)',
        width: 'fit-content',
      }}>
        {[
          { id: 'all' as const, label: '全部', count: skills.length },
          { id: 'installed' as const, label: '已安装', count: skills.filter(s => s.status === 'installed').length },
          { id: 'updatable' as const, label: '可更新', count: skills.filter(s => s.status === 'updatable').length },
          { id: 'available' as const, label: '未安装', count: skills.filter(s => s.status === 'available').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            style={{
              padding: '6px 14px', borderRadius: 6,
              border: 'none',
              background: filter === tab.id ? 'var(--bg-hover)' : 'transparent',
              color: filter === tab.id ? 'var(--text-highlight)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 12,
              transition: 'all 0.08s',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {tab.label}
            <span style={{
              fontSize: 11, opacity: 0.7,
              background: filter === tab.id ? 'var(--bg-tertiary)' : 'transparent',
              padding: '0 6px', borderRadius: 8,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Skills Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}>
        {filteredSkills.map(skill => (
          <div
            key={skill.id}
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: 10,
              border: '1px solid var(--border-color)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 2 }}>
                  {skill.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  v{skill.version} · {skill.author} · {skill.category}
                </div>
              </div>
              <span style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 10,
                background: skill.status === 'installed' ? 'rgba(78,201,176,0.12)'
                  : skill.status === 'updatable' ? 'rgba(220,220,170,0.12)'
                  : 'rgba(150,150,150,0.12)',
                color: skill.status === 'installed' ? 'var(--accent-green)'
                  : skill.status === 'updatable' ? 'var(--accent-yellow)'
                  : 'var(--text-secondary)',
              }}>
                {skill.status === 'installed' ? '已安装'
                  : skill.status === 'updatable' ? '可更新'
                  : '未安装'}
              </span>
            </div>
            <p style={{
              fontSize: 12, color: 'var(--text-secondary)',
              lineHeight: 1.5, marginBottom: 12, flex: 1,
            }}>
              {skill.description}
            </p>
            <div style={{ display: 'flex', gap: 6 }}>
              {skill.status === 'available' && (
                <button
                  onClick={() => installSkill(skill.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 6,
                    border: 'none', background: 'var(--accent-blue)',
                    color: 'white', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  安装
                </button>
              )}
              {skill.status === 'installed' && (
                <button
                  onClick={() => uninstallSkill(skill.id)}
                  style={{
                    padding: '6px 14px', borderRadius: 6,
                    border: '1px solid var(--border-color)', background: 'transparent',
                    color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
                  }}
                >
                  卸载
                </button>
              )}
              {skill.status === 'updatable' && (
                <>
                  <button
                    onClick={() => updateSkill(skill.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 6,
                      border: 'none', background: 'var(--accent-blue)',
                      color: 'white', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    更新
                  </button>
                  <button
                    onClick={() => uninstallSkill(skill.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 6,
                      border: '1px solid var(--border-color)', background: 'transparent',
                      color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    卸载
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}