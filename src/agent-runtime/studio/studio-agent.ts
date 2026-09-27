/**
 * 把「零代码草稿」编译成一个可插拔的数字员工（Plugin + DomainAgent）。
 *
 * 关键点：
 *  - 安全闸门在后端强制：即使前端被绕过，不允许外发的角色也绝不会开启外发通道。
 *  - 资源名冲突自动消解：同名数字员工生成不同 id，可共存。
 *  - 编译产物 = 标准 Plugin，走运行时既有热插拔通道（installPlugin / uninstallPlugin）。
 */
import { DomainAgent, type DomainAgentConfig } from '../presets/business-agents'
import type { Plugin } from '../core/types'
import { getBlueprint, getOutputTemplate } from './blueprints'
import { KNOWLEDGE_CATEGORIES } from '../../knowledge-base/types'
import type { DigitalEmployee, DigitalEmployeeDraft } from './types'

export class StudioValidationError extends Error {}

/** 校验并「净化」草稿：补齐默认值、强制安全策略。 */
export function normalizeDraft(input: Partial<DigitalEmployeeDraft>): DigitalEmployeeDraft {
  const role = input.role ?? 'custom'
  const bp = getBlueprint(role)

  const name = (input.name ?? '').trim() || bp.suggestedName
  const scenario = (input.scenario ?? '').trim() || bp.hint

  const rawCategories = Array.isArray(input.categories) ? input.categories : []
  const categories = rawCategories.filter((c) => (KNOWLEDGE_CATEGORIES as readonly string[]).includes(c))
  const finalCategories = categories.length > 0 ? categories : [...bp.defaultCategories]

  // 安全闸门（后端强制）：不允许外发的角色一律关闭外发
  const allowExternal = bp.externalAllowed ? Boolean(input.allowExternal) : false

  return {
    name,
    role,
    scenario,
    categories: finalCategories,
    clearance: input.clearance ?? bp.defaultClearance,
    allowExternal,
    outputStyle: input.outputStyle ?? 'structured',
    extraInstruction: (input.extraInstruction ?? '').trim() || undefined,
  }
}

/** 校验草稿是否足以创建（用于界面提示）。 */
export function validateDraft(draft: Partial<DigitalEmployeeDraft>): string[] {
  const problems: string[] = []
  if (!draft.name || !draft.name.trim()) problems.push('缺少「数字员工名称」')
  if (!draft.scenario || !draft.scenario.trim()) problems.push('缺少「一句话业务场景」')
  if (!draft.role) problems.push('未选择「角色类型」')
  return problems
}

export interface CompiledEmployee {
  employee: DigitalEmployee
  plugin: Plugin
  agentConfig: DomainAgentConfig
}

/** 编译：草稿 → 数字员工定义 + 可安装插件。 */
export function compileEmployee(draft: DigitalEmployeeDraft, now = Date.now()): CompiledEmployee {
  const normalized = normalizeDraft(draft)
  const bp = getBlueprint(normalized.role)
  const seq = now.toString(36).slice(-5)
  const id = `emp_${normalized.role.replace(/-/g, '')}_${seq}`
  const agentId = `studio-agent-${normalized.role.replace(/-/g, '')}-${seq}`
  const pluginId = `studio-plugin-${id}`

  const systemPrompt = bp.systemPrompt
    .replace(/\{\{name\}\}/g, normalized.name)
    .replace(/\{\{scenario\}\}/g, normalized.scenario)

  const extra = normalized.extraInstruction ? `\n补充要求：${normalized.extraInstruction}` : ''

  const agentConfig: DomainAgentConfig = {
    id: agentId,
    name: normalized.name,
    version: '1.0.0',
    description: normalized.scenario,
    capabilities: ['chat', 'knowledge', normalized.role],
    systemPrompt: systemPrompt + extra,
    outputTemplate: getOutputTemplate(normalized.outputStyle),
    allowedConnectors: normalized.allowExternal ? ['connector-http'] : [],
    knowledgeCategories: normalized.categories,
    clearance: normalized.clearance,
  }

  const employee: DigitalEmployee = { ...normalized, id, agentId, pluginId, createdAt: now }

  const plugin: Plugin = {
    manifest: {
      id: pluginId,
      name: normalized.name,
      version: '1.0.0',
      description: normalized.scenario,
      author: 'Studio · 晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心（吴赐虹）',
      tags: ['studio', 'digital-employee', normalized.role],
    },
    activate(api) {
      api.register(new DomainAgent(agentConfig))
      api.logger.info(`Studio 数字员工已上线：${normalized.name}（${agentId}）`)
    },
  }

  return { employee, plugin, agentConfig }
}
