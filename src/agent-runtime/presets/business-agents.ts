/**
 * 业务数字员工模板预设 —— 5 个开箱即用的领域智能体插件（可插拔）。
 *
 * 设计要点（呼应融合规划 T1.2）：
 *  - 每个数字员工 = 领域系统提示词 + 可选知识库技能 + 输出模板 + 连接器白名单。
 *  - 零代码配置：修改下方 BUSINESS_AGENTS 数组即可新增 / 调整业务数字员工。
 *  - 安全白名单：仅客服 / 营销允许对接外部 HTTP 连接器；合同 / 发票 / 简历默认
 *    只在本地私有化环境运行，不向外部系统外发，守住「数据不出域」护城河。
 *  - 复用基座：DomainAgent 复用 SoloAgent 的「知识库增强 → 模型生成 → 可对接外发」
 *    编排逻辑，只是注入了领域角色与输出约束。
 */
import type {
  Agent,
  AgentEvent,
  AgentRunInput,
  Plugin,
  RuntimeContext,
} from '../core/types'
import type {
  KnowledgeCategory,
  KnowledgePermission,
  RetrievalHit,
} from '../../knowledge-base/types'

/** 知识库服务的最小结构契约（鸭子类型，避免领域模板与实现强耦合）。 */
interface KnowledgeServiceLike {
  retrieve(
    query: string,
    options?: {
      topK?: number
      minScore?: number
      minMatchRatio?: number
      clearance?: KnowledgePermission
    },
  ): { hits: RetrievalHit[]; context: string; grounded: boolean }
}

/** 单个业务数字员工的配置（零代码可改）。 */
export interface DomainAgentConfig {
  id: string
  name: string
  version?: string
  description?: string
  capabilities?: string[]
  /** 领域角色与行为规则（注入 system）。 */
  systemPrompt: string
  /** 指定专属知识库技能 id；缺省用通用企业知识库 skill-knowledge。 */
  knowledgeSkillId?: string
  /** 输出结构约束（注入 system 末尾）。 */
  outputTemplate?: string
  /** 允许对接的连接器白名单（安全）；为空表示纯本地。 */
  allowedConnectors?: string[]
  /** 可读取的知识库目录（数据中台权限：只读本领域相关分类）。 */
  knowledgeCategories?: KnowledgeCategory[]
  /** 知识检索返回条数（默认 4）。 */
  knowledgeTopK?: number
  /** 该数字员工的数据密级（决定能读到哪些敏感资料，默认 internal）。 */
  clearance?: KnowledgePermission
}

/** 领域智能体：领域化的 SOLO Agent，可插拔 / 可独立 / 可对接。 */
export class DomainAgent implements Agent {
  readonly kind = 'agent' as const
  readonly id: string
  readonly name: string
  readonly version: string
  readonly description?: string
  readonly capabilities?: string[]
  private readonly cfg: DomainAgentConfig

  constructor(cfg: DomainAgentConfig) {
    this.cfg = cfg
    this.id = cfg.id
    this.name = cfg.name
    this.version = cfg.version ?? '1.0.0'
    this.description = cfg.description
    this.capabilities = cfg.capabilities ?? ['chat']
  }

  /**
   * 从数据中台（知识库服务）检索本领域相关资料。
   * 无知识库服务时返回空（回退到通用 skill-knowledge）。
   */
  private retrieveFromKnowledgeBase(
    ctx: RuntimeContext,
    query: string,
  ): { hits: RetrievalHit[]; context: string; grounded: boolean } | undefined {
    const kb = ctx.services?.['knowledgeBase'] as KnowledgeServiceLike | undefined
    if (!kb || typeof kb.retrieve !== 'function') return undefined

    const topK = this.cfg.knowledgeTopK ?? 4
    const allowed = this.cfg.knowledgeCategories
    // 多分类时先放宽条数再按目录过滤，保证各目录都有机会入选
    const raw = kb.retrieve(query, {
      topK: allowed && allowed.length > 1 ? topK * 4 : topK,
      clearance: this.cfg.clearance ?? 'internal',
    })
    const hits = allowed && allowed.length > 0
      ? raw.hits.filter((h) => allowed.includes(h.category)).slice(0, topK)
      : raw.hits

    const context = hits
      .map(
        (h, i) =>
          `[${i + 1}] 来源：${h.category} · ${h.title}${h.source ? `（${h.source}）` : ''} · 相关度 ${h.score}\n${h.text}`,
      )
      .join('\n\n---\n\n')

    return { hits, context, grounded: hits.length > 0 }
  }

  async *run(input: AgentRunInput, ctx: RuntimeContext): AsyncIterable<AgentEvent> {
    const { sessionId, message } = input
    yield { type: 'session.start', sessionId }

    const providerId = (ctx.config.modelProvider as string) ?? 'model-echo'
    const provider =
      ctx.runtime.getExtension('model-provider', providerId) ??
      ctx.runtime.getExtensions('model-provider')[0]
    if (!provider) {
      yield { type: 'error', sessionId, error: 'no model provider available' }
      return
    }

    // 领域知识库增强：优先用数据中台（知识库服务 + RAG），回退到通用知识技能
    let kbContext = ''
    let ungrounded = false
    const hasKnowledgeBase = Boolean(ctx.services?.['knowledgeBase'])
    if (hasKnowledgeBase) {
      yield { type: 'skill.call', sessionId, skillId: 'kb.query', input: { query: message } }
      const r = this.retrieveFromKnowledgeBase(ctx, message)
      kbContext = r?.context ?? ''
      ungrounded = !(r?.grounded ?? false)
      yield {
        type: 'skill.result',
        sessionId,
        skillId: 'kb.query',
        ok: true,
        output: { grounded: r?.grounded ?? false, hitCount: r?.hits.length ?? 0 },
      }
    } else {
      const skillId = this.cfg.knowledgeSkillId ?? 'skill-knowledge'
      const knowledge = ctx.runtime.getExtension('skill', skillId)
      if (knowledge) {
        yield { type: 'skill.call', sessionId, skillId: knowledge.id, input: { question: message } }
        const r = await knowledge.execute({ question: message }, ctx)
        kbContext = r.ok ? String(r.output ?? '') : ''
        yield { type: 'skill.result', sessionId, skillId: knowledge.id, ok: r.ok, output: r.output }
      }
    }

    yield { type: 'agent.think', sessionId, text: `「${this.name}」正在处理…` }

    const sys = [
      this.cfg.systemPrompt,
      this.cfg.outputTemplate ? `输出要求：\n${this.cfg.outputTemplate}` : '',
      kbContext ? `企业知识库参考：\n${kbContext}` : '',
      ungrounded
        ? '注意：知识库中未检索到相关资料。请如实告知用户「暂未查到相关依据」，不要编造内容；可建议补充资料或转人工。'
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const messages = [
      { role: 'system' as const, content: sys },
      ...input.history.filter((m) => m.role !== 'tool'),
    ]

    for await (const chunk of provider.complete(
      { model: provider.models[0], messages, temperature: 0.7 },
      ctx,
    )) {
      if (chunk.type === 'text') {
        yield { type: 'agent.message', sessionId, text: chunk.text ?? '' }
      } else if (chunk.type === 'error') {
        yield { type: 'error', sessionId, error: chunk.error ?? 'model error' }
      }
    }

    // 可对接：仅白名单内的连接器可外发（安全管控）
    const allowed = this.cfg.allowedConnectors ?? []
    for (const cid of allowed) {
      const conn = ctx.runtime.getExtension('connector', cid)
      if (conn) {
        yield { type: 'connector.call', sessionId, connectorId: conn.id, action: 'sync' }
        const r = await conn.call('sync', { agent: this.id, sessionId, message }, ctx)
        yield {
          type: 'connector.result',
          sessionId,
          connectorId: conn.id,
          ok: r.ok,
          data: r.data,
        }
      }
    }

    yield { type: 'session.end', sessionId }
  }
}

/* ------------------------------------------------------------------ */
/* 5 个业务数字员工模板（零代码配置 + 可插拔）                          */
/* ------------------------------------------------------------------ */

export const BUSINESS_AGENTS: DomainAgentConfig[] = [
  {
    id: 'agent-cs',
    name: '客服应答数字员工',
    version: '1.0.0',
    description: '基于企业知识库友好、准确地回答客户产品/价格/交付/售后咨询，不确定事项引导转人工。',
    capabilities: ['chat', 'knowledge', 'customer-service'],
    systemPrompt:
      '你是「飞扬企源AI」的企业客服数字员工。基于企业知识库，用友好、专业、简洁的语气回答客户关于产品、价格、交付与售后的咨询。仅依据已知信息作答；遇到无法确认的事项，明确说明并引导转人工，不得编造或过度承诺。',
    outputTemplate: '以「结论先行 + 要点 + 后续动作」三段结构回复，必要时附知识库出处。',
    knowledgeCategories: ['产品', '客户'],
    clearance: 'internal',
    allowedConnectors: ['connector-http'],
  },
  {
    id: 'agent-contract',
    name: '合同审查数字员工',
    version: '1.0.0',
    description: '识别合同风险条款（付款/违约/保密/知识产权/管辖），输出结构化风险清单与修改建议。',
    capabilities: ['contract-review', 'knowledge'],
    systemPrompt:
      '你是企业合同审查数字员工，服务于法务与商务团队。基于合同法务知识库，识别合同中的风险条款（付款条件、违约责任、保密义务、知识产权、管辖争议），给出风险等级（高/中/低）与具体修改建议。输出须结构化、可追溯，并明确声明不替代律师正式法律意见。',
    knowledgeSkillId: 'skill-knowledge',
    outputTemplate:
      '输出【风险清单】(条款+等级+依据) / 【修改建议】(具体措辞) / 【待确认事项】三段。',
    knowledgeCategories: ['合同法务', '制度'],
    clearance: 'internal',
    allowedConnectors: [], // 纯本地：合同涉商业秘密，不外发
  },
  {
    id: 'agent-invoice',
    name: '发票报销数字员工',
    version: '1.0.0',
    description: '依据报销制度核验发票合规性（抬头/税号/类目/金额/权限），输出可报销/需补正清单。',
    capabilities: ['invoice-review', 'knowledge'],
    systemPrompt:
      '你是企业发票报销数字员工，依据公司报销制度核验发票与单据的合规性：抬头与税号一致、类目在预算内、金额与审批权限匹配、票据真实有效。输出「可报销 / 需补正」清单并标注原因；对疑似不合规项直接指出，不替用户绕过制度。',
    knowledgeSkillId: 'skill-knowledge',
    outputTemplate: '输出【核验结论】(可报销/需补正) / 【明细】/ 【补正项与原因】三段。',
    knowledgeCategories: ['制度'],
    clearance: 'internal',
    allowedConnectors: [],
  },
  {
    id: 'agent-resume',
    name: '简历筛选数字员工',
    version: '1.0.0',
    description: '依据岗位 JD 与评分维度对简历打分，输出匹配度与优劣势摘要，保护候选人隐私。',
    capabilities: ['resume-screen', 'knowledge'],
    systemPrompt:
      '你是企业招聘简历筛选数字员工。依据岗位 JD 与评分维度（匹配度、相关经验、稳定性、风险项）对候选人打分并输出摘要。严格保护候选人隐私：不在结论外泄露身份证号、手机号等敏感字段；对明显不匹配者给出明确淘汰理由，避免主观歧视。',
    knowledgeSkillId: 'skill-knowledge',
    outputTemplate: '输出【综合评分/100】/ 【核心优势】/ 【风险与短板】/ 【录用建议】四段。',
    knowledgeCategories: ['制度', '培训'],
    clearance: 'internal',
    allowedConnectors: [],
  },
  {
    id: 'agent-marketing',
    name: '营销文案数字员工',
    version: '1.0.0',
    description: '依据品牌调性与合规红线，生成多平台营销文案（朋友圈/公众号/短视频/电商）。',
    capabilities: ['marketing-copy', 'knowledge'],
    systemPrompt:
      '你是企业营销文案数字员工。依据品牌调性、目标平台（朋友圈 / 公众号 / 短视频 / 电商详情）与合规红线，生成可直接使用的多版本文案。严格遵守广告法：不夸大、不虚假承诺；涉及数据须标注「以实际为准」；不生成诱导分享或违规话术。',
    outputTemplate:
      '输出 3 个版本，每版含【标题】+【正文】+【话题标签(可选)】；末尾附一条合规自检。',
    knowledgeCategories: ['产品'],
    clearance: 'public',
    allowedConnectors: ['connector-marketing-mcp'], // 外发走第三方 MCP（合规闸门，不自研）
  },
]

/** 业务数字员工插件：一键注册全部 5 个领域智能体。 */
export const businessPlugin: Plugin = {
  manifest: {
    id: 'fyqy-business-agents',
    name: 'FyqyClaw 业务数字员工',
    version: '1.0.0',
    description: '5 个开箱即用的领域智能体：客服 / 合同审查 / 发票报销 / 简历筛选 / 营销文案。',
    author: '晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心（吴赐虹）',
    tags: ['business', 'digital-employee', 'agents'],
  },
  activate(api) {
    for (const cfg of BUSINESS_AGENTS) {
      api.register(new DomainAgent(cfg))
    }
  },
}
