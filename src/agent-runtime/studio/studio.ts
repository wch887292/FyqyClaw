/**
 * Studio —— 非技术用户工作台服务。
 *
 * 提供「零代码创建 / 编排 / 试运行业务数字员工」的全部后端能力，
 * 供网关（浏览器界面）或 CLI 调用。不依赖 Electron / DOM。
 *
 * 能力：
 *  - listBlueprints()  把可用角色 / 知识目录 / 输出风格列成选项
 *  - chat()            对话式引导：把老板的一句大白话解析成员工草稿
 *  - create()/remove() 编译成 Plugin 并热插拔进运行时（立即生效）
 *  - listEmployees()   当前已上线的数字员工
 *  - tryRun()          试运行：真实跑一轮，返回回复 + 执行轨迹
 *  - load()            重启后从本地 JSON 自动重建（零出境）
 */
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import type { AgentEvent } from '../core/types'
import type { AgentRuntime } from '../runtime/agent-runtime'
import {
  CATEGORY_HINTS,
  CATEGORY_KEYWORDS,
  CLEARANCE_HINTS,
  EXTERNAL_KEYWORDS,
  OUTPUT_STYLES,
  ROLE_BLUEPRINTS,
  ROLE_KEYWORDS,
  STYLE_KEYWORDS,
  getBlueprint,
} from './blueprints'
import { compileEmployee, normalizeDraft, validateDraft } from './studio-agent'
import { KNOWLEDGE_CATEGORIES } from '../../knowledge-base/types'
import type {
  DigitalEmployee,
  DigitalEmployeeDraft,
  GuidedResult,
  TryRunResult,
} from './types'

export interface StudioOptions {
  /** 定义持久化目录；不传则仅内存驻留。 */
  storeDir?: string
}

export interface StudioBlueprints {
  roles: {
    role: string
    label: string
    hint: string
    suggestedName: string
    defaultCategories: string[]
    defaultClearance: string
    defaultAllowExternal: boolean
    externalAllowed: boolean
  }[]
  categories: { value: string; label: string; hint: string }[]
  clearances: { value: string; label: string; hint: string }[]
  styles: { value: string; label: string; hint: string }[]
}

export class Studio {
  private readonly runtime: AgentRuntime
  private readonly storeDir?: string
  private readonly employees = new Map<string, DigitalEmployee>()

  constructor(runtime: AgentRuntime, options: StudioOptions = {}) {
    this.runtime = runtime
    this.storeDir = options.storeDir
  }

  /* ------------------------------ 选项 ------------------------------ */

  listBlueprints(): StudioBlueprints {
    return {
      roles: ROLE_BLUEPRINTS.map((b) => ({
        role: b.role,
        label: b.label,
        hint: b.hint,
        suggestedName: b.suggestedName,
        defaultCategories: b.defaultCategories,
        defaultClearance: b.defaultClearance,
        defaultAllowExternal: b.defaultAllowExternal,
        externalAllowed: b.externalAllowed,
      })),
      categories: KNOWLEDGE_CATEGORIES.map((c) => ({ value: c, label: c, hint: CATEGORY_HINTS[c] })),
      clearances: (Object.keys(CLEARANCE_HINTS) as (keyof typeof CLEARANCE_HINTS)[]).map((k) => ({
        value: k,
        label: k === 'public' ? '公开' : k === 'internal' ? '内部' : '机密',
        hint: CLEARANCE_HINTS[k],
      })),
      styles: OUTPUT_STYLES.map((s) => ({ value: s.style, label: s.label, hint: s.hint })),
    }
  }

  /* --------------------------- 对话式引导 --------------------------- */

  /**
   * 把一句大白话解析成数字员工草稿。
   * 采用确定性关键词解析（离线、可测、不依赖模型）；接入真实模型后可替换为 LLM 抽取。
   */
  chat(text: string, prior: Partial<DigitalEmployeeDraft> = {}): GuidedResult {
    const t = text.toLowerCase()
    const draft: Partial<DigitalEmployeeDraft> = { ...prior }
    const understood: string[] = []

    // 角色
    if (!draft.role) {
      for (const { role, words } of ROLE_KEYWORDS) {
        if (words.some((w) => t.includes(w.toLowerCase()))) {
          draft.role = role
          understood.push(`角色：${getBlueprint(role).label}`)
          break
        }
      }
    } else {
      understood.push(`角色：${getBlueprint(draft.role).label}（沿用）`)
    }

    // 知识目录
    const cats = new Set(draft.categories ?? [])
    for (const { category, words } of CATEGORY_KEYWORDS) {
      if (words.some((w) => t.includes(w.toLowerCase()))) cats.add(category)
    }
    if (cats.size > 0) {
      draft.categories = Array.from(cats)
      understood.push(`可读知识：${draft.categories.join('、')}`)
    }

    // 输出风格
    if (!draft.outputStyle) {
      for (const { style, words } of STYLE_KEYWORDS) {
        if (words.some((w) => t.includes(w.toLowerCase()))) {
          draft.outputStyle = style
          understood.push(`输出风格：${OUTPUT_STYLES.find((s) => s.style === style)?.label}`)
          break
        }
      }
    }

    // 外发
    if (draft.allowExternal === undefined && EXTERNAL_KEYWORDS.some((w) => t.includes(w.toLowerCase()))) {
      draft.allowExternal = true
      understood.push('需要对接外部系统')
    }

    // 名称（优先取引号内文字；没有就按角色给一个建议名，用户可改）
    if (!draft.name) {
      const quoted = text.match(/[「"“'']([^」"”'']{1,20})[」"”'']/)
      if (quoted) {
        draft.name = quoted[1].trim()
        understood.push(`名称：${draft.name}`)
      } else if (draft.role) {
        draft.name = getBlueprint(draft.role).suggestedName
        understood.push(`名称：${draft.name}（建议，可改）`)
      }
    }

    // 场景：优先取引号内，否则用整句
    if (!draft.scenario) {
      const quoted = text.match(/[「"“'']([^」"”'']{2,60})[」"”'']/)
      draft.scenario = quoted ? quoted[1].trim() : text.trim()
      if (draft.scenario) understood.push('业务场景：已记录你的描述')
    }

    const missing = validateDraft(draft)
    const ready = missing.length === 0
    const bp = draft.role ? getBlueprint(draft.role) : undefined

    const lines: string[] = []
    if (understood.length > 0) {
      lines.push('我理解到：')
      for (const u of understood) lines.push(`· ${u}`)
    } else {
      lines.push('我还没太听懂。你可以直接说，比如：')
      lines.push('「做一个客服数字员工，读产品资料，回答客户询价」')
    }
    if (bp && !draft.categories?.length) {
      lines.push(`（未提到资料范围，默认读取：${bp.defaultCategories.join('、')}）`)
    }
    if (!bp && draft.role) {
      lines.push(`（该角色不允许对接外部系统）`)
    }
    if (missing.length > 0) {
      lines.push(`还差：${missing.join('；')}`)
    } else {
      lines.push('信息齐了，点「创建」就能上线。')
    }

    return { reply: lines.join('\n'), draft, missing, ready }
  }

  /* ---------------------------- 生命周期 ---------------------------- */

  /** 从本地定义重建数字员工（重启后仍可用）。 */
  async load(): Promise<number> {
    if (!this.storeDir) return 0
    try {
      const raw = await fs.readFile(join(this.storeDir, 'employees.json'), 'utf-8')
      const parsed = JSON.parse(raw) as { employees?: DigitalEmployee[] }
      for (const saved of parsed.employees ?? []) {
        const draft = normalizeDraft(saved)
        const { employee, plugin } = compileEmployee(draft, saved.createdAt)
        // 沿用原 id，避免重启后引用失效
        employee.id = saved.id
        employee.agentId = saved.agentId
        employee.pluginId = saved.pluginId
        await this.runtime.installPlugin({
          ...plugin,
          manifest: { ...plugin.manifest, id: saved.pluginId, name: employee.name },
        })
        this.employees.set(employee.id, employee)
      }
      return this.employees.size
    } catch {
      return 0
    }
  }

  private async persist(): Promise<void> {
    if (!this.storeDir) return
    const path = join(this.storeDir, 'employees.json')
    await fs.mkdir(dirname(path), { recursive: true })
    await fs.writeFile(
      path,
      JSON.stringify({ version: 1, savedAt: Date.now(), employees: Array.from(this.employees.values()) }, null, 2),
      'utf-8',
    )
  }

  listEmployees(): DigitalEmployee[] {
    return Array.from(this.employees.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  getEmployee(id: string): DigitalEmployee | undefined {
    return this.employees.get(id)
  }

  /** 创建并立即上线（热插拔）。 */
  async create(input: Partial<DigitalEmployeeDraft>): Promise<DigitalEmployee> {
    const normalized = normalizeDraft(input)
    const problems = validateDraft(normalized)
    if (problems.length > 0) throw new Error(`创建失败：${problems.join('；')}`)

    let { employee, plugin } = compileEmployee(normalized)
    // 同名共存时消解 id 冲突
    while (this.employees.has(employee.id)) {
      const retry = compileEmployee(normalized, Date.now() + Math.floor(Math.random() * 1000) + 1)
      employee = retry.employee
      plugin = retry.plugin
    }

    await this.runtime.installPlugin(plugin)
    this.employees.set(employee.id, employee)
    await this.persist()
    return employee
  }

  /** 下线并移除（插件卸载 + 回收扩展与服务）。 */
  async remove(id: string): Promise<boolean> {
    const emp = this.employees.get(id)
    if (!emp) return false
    await this.runtime.uninstallPlugin(emp.pluginId)
    this.employees.delete(id)
    await this.persist()
    return true
  }

  /* ----------------------------- 试运行 ----------------------------- */

  /** 真实跑一轮，返回回复与执行轨迹（让老板看到"它查了哪些资料、有没有外发"）。 */
  async tryRun(id: string, message: string): Promise<TryRunResult> {
    const emp = this.employees.get(id)
    if (!emp) throw new Error(`数字员工不存在：${id}`)
    if (!message.trim()) throw new Error('请输入要试运行的问题')

    const session = this.runtime.createSession(emp.agentId)
    const trace: TryRunResult['trace'] = []
    let reply = ''
    let grounded = false

    for await (const ev of session.send(message)) {
      const detail = describeEvent(ev)
      if (detail) trace.push(detail)
      if (ev.type === 'agent.message') reply += ev.text
      if (ev.type === 'skill.result' && ev.skillId === 'kb.query') {
        const out = ev.output as { grounded?: boolean } | undefined
        if (out?.grounded !== undefined) grounded = out.grounded
      }
    }

    return {
      employeeId: emp.id,
      agentId: emp.agentId,
      message,
      reply: reply || '（本轮没有产出文本，请检查模型提供器配置）',
      trace,
      grounded,
    }
  }
}

/** 把运行时事件翻译成人话，便于在界面上展示。 */
function describeEvent(ev: AgentEvent): { type: string; detail: string } | undefined {
  switch (ev.type) {
    case 'skill.call':
      return ev.skillId === 'kb.query' ? { type: 'knowledge', detail: '检索企业知识库…' } : undefined
    case 'skill.result':
      if (ev.skillId === 'kb.query') {
        const out = ev.output as { grounded?: boolean; hitCount?: number } | undefined
        return {
          type: 'knowledge',
          detail: out?.grounded
            ? `命中 ${out?.hitCount ?? 0} 条依据`
            : '知识库里没查到依据（将如实告知，不编造）',
        }
      }
      return undefined
    case 'agent.think':
      return { type: 'think', detail: ev.text }
    case 'connector.call':
      return { type: 'external', detail: `外发到 ${ev.connectorId}` }
    case 'connector.result':
      return { type: 'external', detail: `外发结果：${ev.ok ? '成功' : '失败'}` }
    case 'error':
      return { type: 'error', detail: ev.error }
    default:
      return undefined
  }
}
