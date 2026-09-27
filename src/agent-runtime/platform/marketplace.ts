/**
 * 数字员工市场（T3.4 · 开放 skills/plugin 生态）。
 *
 * 署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 吴赐虹
 *
 * 设计要点（呼应融合规划 T3.4）：
 *  - 市场 = 一份可浏览的「数字员工清单」，每个 item 是一个 DomainAgentConfig。
 *  - 预置清单 = 5 个内置业务员工（与运行时同构）+ 若干市场专属员工（生态补齐内容密度）。
 *  - 安装 = 把选中 item 包成一个临时 Plugin 并经运行时热插拔（installPlugin），零停机上线。
 *  - 不自研员工逻辑，只做「编排 + 安全 + 私有化」分发；真实垂直能力由企业用 Studio 自行沉淀或接 MCP。
 */
import type { AgentRuntime } from '../runtime/agent-runtime'
import type { Plugin } from '../core/types'
import { DomainAgent, BUSINESS_AGENTS, type DomainAgentConfig } from '../presets/business-agents'

export interface MarketItem extends DomainAgentConfig {
  /** 市场分类（便于检索）。 */
  category: string
  author: string
  tags: string[]
  /** 是否首页推荐。 */
  featured?: boolean
}

/** 市场专属预置员工（不在内置运行时强制装载，需用户从市场安装）。 */
const MARKET_EXTRA: MarketItem[] = [
  {
    id: 'agent-hr',
    name: 'HR 制度问答顾问',
    version: '1.0.0',
    description: '解答员工入转调离、考勤假期、薪酬福利等制度问题，引用公司制度原文，不臆测。',
    capabilities: ['chat', 'knowledge', 'hr'],
    systemPrompt:
      '你是企业 HR 制度问答顾问。依据公司制度知识库，准确解答员工关于入转调离、考勤、假期、薪酬福利、社保公积金的常见问题。仅引用已知制度条文作答；制度未覆盖或存在地区差异时，引导咨询 HR，不臆测、不承诺。',
    outputTemplate: '以「结论 + 制度依据 + 适用范围 + 温馨提示」结构回复。',
    knowledgeCategories: ['制度', '培训'],
    clearance: 'internal',
    allowedConnectors: [],
    category: '人力资源',
    author: '飞扬企源市场',
    tags: ['hr', '制度', '员工服务'],
    featured: true,
  },
  {
    id: 'agent-trainer',
    name: '新员工培训教练',
    version: '1.0.0',
    description: '按岗位为新员工生成学习路径与考核要点，跟踪培训进度，输出带出师标准的陪练。',
    capabilities: ['chat', 'knowledge', 'training'],
    systemPrompt:
      '你是企业新员工培训教练。依据培训知识库与岗位要求，为新员工规划 7/30/90 天学习路径，拆解考核要点，并以问答形式陪练。进度与结论以培训制度为准，涉及个人考核结果须提示以直属上级正式评定为准。',
    outputTemplate: '输出【阶段目标】/【学习清单】/ 【自测题】/ 【出师标准】四段。',
    knowledgeCategories: ['培训', '制度'],
    clearance: 'internal',
    allowedConnectors: [],
    category: '人力资源',
    author: '飞扬企源市场',
    tags: ['培训', '陪练', 'onboarding'],
  },
  {
    id: 'agent-finance',
    name: '经营数据参谋',
    version: '1.0.0',
    description: '面向老板的经营指标解读：毛利、人效、现金流预警，引用数据并标注口径，不造数。',
    capabilities: ['chat', 'knowledge', 'finance'],
    systemPrompt:
      '你是企业经营数据参谋，服务企业负责人。结合经营制度与上传的财务/运营数据，解读毛利、人效、现金流、库存周转等关键指标，给出预警与改善建议。所有数字必须引用用户提供的真实数据或标注「需接入数据源」，严禁编造经营数据。',
    outputTemplate: '输出【核心指标】/【风险预警】/【改善建议】/ 【数据口径说明】四段。',
    knowledgeCategories: ['制度'],
    clearance: 'internal',
    allowedConnectors: [],
    category: '经营',
    author: '飞扬企源市场',
    tags: ['经营', '财务', '决策'],
    featured: true,
  },
]

/** 完整市场清单：内置（标记为内置，默认已装）+ 市场专属。 */
export const MARKET_ITEMS: MarketItem[] = [
  ...BUSINESS_AGENTS.map<MarketItem>((a) => ({
    ...a,
    category: '业务',
    author: '飞扬企源内置',
    tags: ['内置', '开箱即用'],
    featured: true,
  })),
  ...MARKET_EXTRA,
]

const AGENT_CONFIG_KEYS: (keyof DomainAgentConfig)[] = [
  'id',
  'name',
  'version',
  'description',
  'capabilities',
  'systemPrompt',
  'knowledgeSkillId',
  'outputTemplate',
  'allowedConnectors',
  'knowledgeCategories',
  'knowledgeTopK',
  'clearance',
]

/**
 * 数字员工市场中心（可插拔运行时服务）。
 * 注册名：marketplace
 */
export class Marketplace {
  list(): MarketItem[] {
    return MARKET_ITEMS
  }

  get(id: string): MarketItem | undefined {
    return MARKET_ITEMS.find((m: MarketItem) => m.id === id)
  }

  /** 安装一个市场员工：热插拔为临时 Plugin 并注册到运行时。 */
  async install(runtime: AgentRuntime, id: string): Promise<{ ok: boolean; error?: string }> {
    const item = this.get(id)
    if (!item) return { ok: false, error: '市场未找到该数字员工' }
    if (runtime.getExtension('agent', id)) return { ok: false, error: '该数字员工已安装' }

    const cfg = {} as DomainAgentConfig
    for (const k of AGENT_CONFIG_KEYS) {
      const v = (item as unknown as Record<string, unknown>)[k as string]
      if (v !== undefined) (cfg as unknown as Record<string, unknown>)[k] = v
    }
    const plugin: Plugin = {
      manifest: {
        id: `market-${id}`,
        name: item.name,
        version: item.version ?? '1.0.0',
        description: item.description,
        author: item.author,
        tags: item.tags,
      },
      activate(api) {
        api.register(new DomainAgent(cfg))
      },
    }
    await runtime.installPlugin(plugin)
    return { ok: true }
  }
}

export function createMarketPlugin(): Plugin {
  return {
    manifest: {
      id: 'fyqy-marketplace',
      name: '数字员工市场',
      version: '1.0.0',
      description: 'T3.4 开放 plugin 生态：浏览并热插拔数字员工。',
      author: '晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心（吴赐虹）',
      tags: ['platform', 'marketplace', 'digital-employee'],
    },
    activate(api) {
      api.registerService('marketplace', new Marketplace())
    },
  }
}
