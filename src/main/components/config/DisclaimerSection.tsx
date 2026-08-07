import React from 'react'

export function DisclaimerSection() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingTop: 24 }}>
      <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 4 }}>
        免责声明
      </h2>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
        FyqyClaw 飞扬企源 AI 开发工具免责声明
      </p>

      <Card title="1. 软件使用声明">
        <p style={pStyle}>
          FyqyClaw（以下简称"本软件"）由晋江市飞虹智科技企业管理有限公司（以下简称"本公司"）开发并维护。
          本软件仅供用户在遵守适用法律法规的前提下使用。用户下载、安装、使用本软件即表示同意本免责声明的全部条款。
        </p>
      </Card>

      <Card title="2. AI 生成内容声明">
        <p style={pStyle}>
          本软件集成的 AI 大模型能力（包括但不限于代码生成、代码审查、文档生成、智能问答等功能）所输出的内容
          由人工智能模型生成，仅供参考和辅助决策用途。AI 生成的内容可能存在但不限于以下问题：
        </p>
        <ul style={ulStyle}>
          <li>代码可能存在安全漏洞、性能问题或逻辑错误；</li>
          <li>生成的内容可能包含不准确、不完整或过时的信息；</li>
          <li>生成的代码可能需要根据具体项目环境进行适配和修改；</li>
          <li>AI 生成的内容不应替代专业开发人员的判断和审查。</li>
        </ul>
        <p style={pStyle}>
          用户应对 AI 生成的内容进行独立的审查、测试和验证，并自行承担使用 AI 生成内容所产生的全部风险和责任。
        </p>
      </Card>

      <Card title="3. 责任限制">
        <p style={pStyle}>
          在适用法律允许的最大范围内，本公司不对因使用或无法使用本软件所导致的任何直接、间接、偶然、
          特殊或后果性损害承担责任，包括但不限于：
        </p>
        <ul style={ulStyle}>
          <li>数据丢失或数据损坏；</li>
          <li>业务中断或利润损失；</li>
          <li>代码错误导致的系统故障或安全漏洞；</li>
          <li>第三方通过本软件造成的任何损失。</li>
        </ul>
      </Card>

      <Card title="4. 无保证声明">
        <p style={pStyle}>
          本软件按"现状"和"可用"基础提供，不提供任何明示或暗示的保证，包括但不限于：
        </p>
        <ul style={ulStyle}>
          <li>适销性及特定用途适用性的暗示保证；</li>
          <li>软件功能无中断、无错误、安全或不含病毒或恶意代码的保证；</li>
          <li>AI 生成内容无侵权、无偏见或无有害内容的保证。</li>
        </ul>
      </Card>

      <Card title="5. 第三方服务">
        <p style={pStyle}>
          本软件可能集成或链接到第三方服务（包括但不限于 AI 模型 API、代码托管平台、包管理服务等）。
          用户在使用第三方服务时应遵守该第三方的服务条款和隐私政策。本公司对第三方服务的内容、
          可用性、安全性及任何行为不承担责任。
        </p>
      </Card>

      <Card title="6. 用户责任">
        <p style={pStyle}>
          用户同意：
        </p>
        <ul style={ulStyle}>
          <li>不利用本软件从事任何违法活动或侵犯他人合法权益的行为；</li>
          <li>不尝试绕过本软件的安全机制或沙箱执行限制；</li>
          <li>不将本软件用于开发恶意软件、进行网络攻击或其他危害网络安全的行为；</li>
          <li>自行负责妥善保管 API Key 等敏感凭据信息。</li>
        </ul>
      </Card>

      <Card title="7. 免责声明更新">
        <p style={pStyle}>
          本公司保留随时修改、更新本免责声明的权利。更新后的免责声明将在本软件内公布，
          用户继续使用本软件即视为接受更新后的条款。建议用户定期查阅本免责声明。
        </p>
      </Card>

      <div style={{
        textAlign: 'center', marginTop: 32, padding: 16,
        fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6,
      }}>
        最近更新日期：2026 年 8 月
      </div>
    </div>
  )
}

const pStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8, margin: '0 0 8px 0',
}

const ulStyle: React.CSSProperties = {
  fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.8,
  paddingLeft: 20, margin: '0 0 8px 0',
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