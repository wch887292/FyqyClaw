import React from 'react'

export function LicenseSection() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingTop: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 4 }}>
        开源协议
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
        FyqyClaw 飞扬企源 AI 开发工具开源许可信息
      </p>

      <Card title="MIT 许可证">
        <p style={pStyle}>
          Copyright © 2026 晋江市飞虹智科技企业管理有限公司
        </p>
        <p style={pStyle}>
          特此免费授予任何获得本软件及相关文档文件（以下简称"本软件"）副本的个人或组织，
          不受限制地处理本软件，包括但不限于使用、复制、修改、合并、发布、分发、再许可
          和/或出售本软件副本的权利，并允许向其提供本软件的人员这样做，但须符合以下条件：
        </p>
        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          padding: 20,
          margin: '12px 0',
          fontFamily: 'monospace',
          fontSize: 12,
          color: 'var(--text-primary)',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
        }}>
{`上述版权声明和本许可声明应包含在本软件的所有副本或实质性部分中。

本软件按"现状"提供，不提供任何明示或暗示的保证，
包括但不限于适销性、特定用途适用性和非侵权性的保证。
在任何情况下，作者或版权持有人均不对因本软件或
本软件的使用或其他交易而引起的或与之相关的任何
索赔、损害或其他责任负责，无论是合同诉讼、侵权
行为还是其他行为。`}
        </div>
      </Card>

      <Card title="第三方开源组件许可">
        <p style={pStyle}>
          本软件使用了以下开源组件，并遵循其各自的许可证条款：
        </p>
        <div style={{
          background: 'var(--bg-tertiary)',
          borderRadius: 8,
          border: '1px solid var(--border-color)',
          overflow: 'hidden',
          marginTop: 8,
        }}>
          <LicenseRow name="React" version="18.x" license="MIT" url="https://github.com/facebook/react" />
          <LicenseRow name="TypeScript" version="5.x" license="Apache-2.0" url="https://github.com/microsoft/TypeScript" />
          <LicenseRow name="Vite" version="5.x" license="MIT" url="https://github.com/vitejs/vite" />
          <LicenseRow name="Monaco Editor" version="0.44.x" license="MIT" url="https://github.com/microsoft/monaco-editor" />
          <LicenseRow name="Zustand" version="4.x" license="MIT" url="https://github.com/pmndrs/zustand" />
          <LicenseRow name="Immer" version="10.x" license="MIT" url="https://github.com/immerjs/immer" />
          <LicenseRow name="Xterm.js" version="5.x" license="MIT" url="https://github.com/xtermjs/xterm.js" />
          <LicenseRow name="Electron" version="28.x" license="MIT" url="https://github.com/electron/electron" />
          <LicenseRow name="Node.js" version="20.x" license="MIT" url="https://github.com/nodejs/node" />
          <LicenseRow name="React Router" version="6.x" license="MIT" url="https://github.com/remix-run/react-router" />
          <LicenseRow name="React DOM" version="18.x" license="MIT" url="https://github.com/facebook/react" />
        </div>
      </Card>

      <Card title="AI 模型接口许可">
        <p style={pStyle}>
          本软件通过 API 接口调用第三方 AI 模型服务，用户需自行遵守各模型提供商的服务条款和许可协议：
        </p>
        <ul style={ulStyle}>
          <li>OpenAI — 遵循 <Link href="https://openai.com/policies/terms-of-use">OpenAI Terms of Use</Link></li>
          <li>Anthropic — 遵循 <Link href="https://www.anthropic.com/legal/terms">Anthropic Terms of Service</Link></li>
          <li>DeepSeek — 遵循 <Link href="https://chat.deepseek.com/terms-of-service">DeepSeek 服务条款</Link></li>
          <li>Google — 遵循 <Link href="https://cloud.google.com/terms">Google Cloud Terms of Service</Link></li>
        </ul>
      </Card>

      <Card title="贡献者协议">
        <p style={pStyle}>
          向本软件提交代码、文档或其他贡献（以下简称"贡献"）的个人或组织，即表示同意以下条款：
        </p>
        <ul style={ulStyle}>
          <li>贡献者保证其贡献是原创作品，或拥有充分的授权提交该贡献；</li>
          <li>贡献者授予项目维护者永久、不可撤销、全球范围、免版税的非独占许可，以 MIT 许可证条款使用该贡献；</li>
          <li>贡献者理解并同意其贡献将被整合到本软件中，并受本软件整体许可证的约束。</li>
        </ul>
      </Card>

      <div style={{
        textAlign: 'center', marginTop: 32, padding: 16,
        fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6,
      }}>
        © 2026 晋江市飞虹智科技企业管理有限公司 · MIT License
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: 10,
      border: '1px solid var(--border-color)',
      padding: 20,
      marginBottom: 16,
    }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 12 }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function LicenseRow({ name, version, license, url }: { name: string; version: string; license: string; url: string }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 2fr',
      gap: 8,
      padding: '10px 16px',
      borderBottom: '1px solid var(--border-color)',
      fontSize: 12,
      alignItems: 'center',
    }}>
      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{name}</span>
      <span style={{ color: 'var(--text-secondary)' }}>v{version}</span>
      <span style={{
        color: 'var(--accent-green)',
        fontFamily: 'monospace',
        fontWeight: 500,
      }}>
        {license}
      </span>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: 'var(--accent-blue)',
          textDecoration: 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {url}
      </a>
    </div>
  )
}

function Link({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}
    >
      {children}
    </a>
  )
}

const pStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, margin: '0 0 8px 0',
}

const ulStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8,
  paddingLeft: 20, margin: '0 0 8px 0',
}