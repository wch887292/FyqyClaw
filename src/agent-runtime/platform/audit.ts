/**
 * 平台操作审计留痕（T3.2 · 私有化部署套件底座）。
 *
 * 署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 吴赐虹
 *
 * 设计要点（呼应融合规划 T3.2「操作留痕」与政企合规一页纸）：
 *  - 任何敏感动作（知识库写删、外发、市场安装、账号管理）都记一条 AuditEntry。
 *  - 本地持久化（可选落盘 JSON，零数据出境），可过等保「操作可追溯」要求。
 *  - 审计只读权归 admin，避免被普通运营篡改视线。
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export interface AuditEntry {
  id: string
  ts: number
  /** 操作人：账号 id / 'system' / 'anonymous'。 */
  actor: string
  /** 动作（与 RBAC 矩阵一致，如 kb:write / agent:external / market:install）。 */
  action: string
  /** 资源（如 doc_id / platform / agent_id）。 */
  resource: string
  detail?: string
  /** 是否成功（失败也记，便于追责）。 */
  ok: boolean
}

export interface AuditQuery {
  actor?: string
  action?: string
  since?: number
  limit?: number
}

/**
 * 审计日志中心（可插拔运行时服务）。
 * 注册名：auditLog
 */
export class AuditLog {
  private entries: AuditEntry[] = []
  private readonly dir?: string

  constructor(opts: { securityDir?: string } = {}) {
    this.dir = opts.securityDir
    if (this.dir) this.load()
  }

  record(e: Omit<AuditEntry, 'id' | 'ts'>): AuditEntry {
    const entry: AuditEntry = {
      ...e,
      id: `aud_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
    }
    this.entries.push(entry)
    this.persist()
    return entry
  }

  query(filter: AuditQuery = {}): AuditEntry[] {
    let out = this.entries
    if (filter.actor) out = out.filter((e) => e.actor === filter.actor)
    if (filter.action) out = out.filter((e) => e.action === filter.action)
    if (filter.since) out = out.filter((e) => e.ts >= filter.since!)
    out = out.sort((a, b) => b.ts - a.ts)
    if (filter.limit) out = out.slice(0, filter.limit)
    return out
  }

  private persist(): void {
    if (!this.dir) return
    try {
      mkdirSync(this.dir, { recursive: true })
      writeFileSync(join(this.dir, 'audit.json'), JSON.stringify(this.entries.slice(-500), null, 2), 'utf8')
    } catch {
      /* 演示环境忽略落盘失败 */
    }
  }

  private load(): void {
    if (!this.dir) return
    try {
      const p = join(this.dir, 'audit.json')
      if (existsSync(p)) this.entries = JSON.parse(readFileSync(p, 'utf8'))
    } catch {
      /* 忽略损坏文件 */
    }
  }
}
