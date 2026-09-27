/**
 * Studio（非技术用户工作台）—— 类型定义
 *
 * 目标（融合规划 T2.1）：让不懂代码的老板，用「选一选 + 说一句话」的方式
 * 创建 / 编排 / 试运行自己的业务数字员工，全程不碰代码。
 *
 * 设计原则：
 *  - 零代码：所有可调项都收敛成「下拉选项 + 开关」，不暴露 prompt 工程细节。
 *  - 可插拔：创建出的数字员工 = 一个运行时 Plugin（热装热卸，立即生效）。
 *  - 可独立：纯 TS，不依赖 Electron / DOM；宿主可为网关或 CLI。
 *  - 可持久化：定义存本地 JSON，重启后自动重建（数据不出企业）。
 */
import type { KnowledgeCategory, KnowledgePermission } from '../../knowledge-base/types'

/** 可选的数字员工角色（对应内置领域模板）。 */
export type StudioRole =
  | 'customer-service'
  | 'contract'
  | 'invoice'
  | 'resume'
  | 'marketing'
  | 'custom'

/** 输出风格（映射到输出模板，用户不用写 prompt）。 */
export type OutputStyle = 'concise' | 'structured' | 'friendly'

/** 用户在界面上填的「草稿」（零代码表单）。 */
export interface DigitalEmployeeDraft {
  /** 数字员工名称，如「售后客服小飞」。 */
  name: string
  role: StudioRole
  /** 一句话业务场景描述（用户自己的话，注入角色提示）。 */
  scenario: string
  /** 可读取的知识库目录（数据中台权限）。 */
  categories: KnowledgeCategory[]
  /** 数据密级。 */
  clearance: KnowledgePermission
  /** 是否允许对接外部系统（仅客服 / 营销等对外角色可开）。 */
  allowExternal: boolean
  /** 输出风格。 */
  outputStyle: OutputStyle
  /** 高级模式：自定义补充要求（可选，留空则用模板默认）。 */
  extraInstruction?: string
}

/** 创建完成后的数字员工（含系统分配的 id）。 */
export interface DigitalEmployee extends DigitalEmployeeDraft {
  id: string
  /** 注册进运行时的 agent id。 */
  agentId: string
  /** 承载它的插件 id。 */
  pluginId: string
  createdAt: number
}

/** 角色蓝图：把领域模板包装成「用户看得懂」的选项。 */
export interface RoleBlueprint {
  role: StudioRole
  label: string
  /** 一句话说明（界面上展示）。 */
  hint: string
  /** 建议名称。 */
  suggestedName: string
  defaultCategories: KnowledgeCategory[]
  defaultClearance: KnowledgePermission
  defaultAllowExternal: boolean
  /** 业务系统提示词模板，{{scenario}} 会被替换为用户填的场景描述。 */
  systemPrompt: string
  /** 是否允许开启外发（安全闸门）。 */
  externalAllowed: boolean
  /** 补充说明（如外发合规提示），界面可选展示。 */
  note?: string
}

/** 对话式引导的一轮结果。 */
export interface GuidedResult {
  /** 助手回复（中文，解释它理解了什么、还缺什么）。 */
  reply: string
  /** 已识别出的草稿（可能不完整）。 */
  draft: Partial<DigitalEmployeeDraft>
  /** 缺失项的人类可读描述（用于界面提示）。 */
  missing: string[]
  /** 是否已可直接创建。 */
  ready: boolean
}

/** 试运行结果。 */
export interface TryRunResult {
  employeeId: string
  agentId: string
  message: string
  reply: string
  /** 关键事件（便于展示"它查了哪些资料、是否外发"）。 */
  trace: { type: string; detail: string }[]
  /** 是否检索到知识库依据。 */
  grounded: boolean
}
