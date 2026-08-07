import React from 'react'

export function AboutSection() {
  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingTop: 40 }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          width: 80, height: 80, borderRadius: 18,
          background: 'linear-gradient(135deg, var(--accent-blue), #4ec9b0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, fontWeight: 800, color: 'white',
          margin: '0 auto 20px',
          boxShadow: '0 8px 24px rgba(0,120,212,0.3)',
        }}>
          FC
        </div>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-highlight)', marginBottom: 4 }}>
          FyqyClaw
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 8 }}>
          版本 1.0.0 (Build 2026.08)
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
          一款深度融合 AI 大模型能力的全流程开发工具，覆盖需求拆解、代码编写、项目理解、调试运行、代码审查、变更管理完整工程链路。
        </p>
      </div>

      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 12,
        border: '1px solid var(--border-color)',
        padding: 24,
        marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 16 }}>
          产品信息
        </h3>
        <InfoRow label="研发主体" value="晋江市飞虹智科技企业管理有限公司" />
        <InfoRow label="研发中心" value="飞扬企源研发中心" />
        <InfoRow label="项目负责人" value="吴赐虹" />
        <InfoRow label="技术支持" value="361336873@qq.com" />
        <InfoRow label="官方网站" value="https://klai.top" />
      </div>

      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 12,
        border: '1px solid var(--border-color)',
        padding: 24,
        marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 16 }}>
          系统信息
        </h3>
        <InfoRow label="运行环境" value="Electron + React 18" />
        <InfoRow label="AI 引擎" value="多模型适配器 (OpenAI / Anthropic / DeepSeek)" />
        <InfoRow label="协议支持" value="Model Context Protocol (MCP)" />
        <InfoRow label="沙箱引擎" value="策略驱动安全执行引擎" />
      </div>

      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 12,
        border: '1px solid var(--border-color)',
        padding: 24,
      }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 16 }}>
          技术栈
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {['React', 'TypeScript', 'Vite', 'Monaco Editor', 'Zustand', 'Immer', 'Xterm', 'Electron', 'Node.js', 'OpenAI API', 'MCP'].map(tech => (
            <span
              key={tech}
              style={{
                padding: '4px 12px', borderRadius: 6,
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: 12, border: '1px solid var(--border-color)',
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 32, fontSize: 11, color: 'var(--text-secondary)', opacity: 0.6 }}>
        © 2026 晋江市飞虹智科技企业管理有限公司 · 保留所有权利
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid var(--border-color)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}