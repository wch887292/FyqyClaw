/**
 * 知识库（数据中台）—— 类型定义
 *
 * 定位：企业 AI 一站式平台的「② 数据中台层」落点。
 * 五个业务数字员工（客服 / 合同 / 报销 / 简历 / 营销）共用同一知识源，
 * 企业上传制度 / 产品 / 客户 / 培训 / 合同法务资料即形成「专属 AI 大脑」。
 *
 * 设计原则（与运行时一致）：
 *  - 纯 TS + Node 内置，不依赖 Electron / DOM，可嵌入、可独立、可被 agent/skill 取用。
 *  - 数据本地存储（JSON 文件 / 内存），默认零出境，符合「数据主权」护城河。
 *  - 检索为轻量 RAG（分词 + BM25 打分），不依赖外部向量库；不伪造内容。
 */

/** 知识分类 —— 对应企业数据中台的五类目录。 */
export const KNOWLEDGE_CATEGORIES = [
  '制度',
  '产品',
  '客户',
  '培训',
  '合同法务',
] as const

export type KnowledgeCategory = (typeof KNOWLEDGE_CATEGORIES)[number]

/** 权限分级 —— 决定哪些角色 / 数字员工可以读到该知识。 */
export type KnowledgePermission = 'public' | 'internal' | 'confidential'

/** 知识目录的白话说明（面向非技术用户，界面上直接展示）。 */
export const CATEGORY_HINTS: Record<KnowledgeCategory, string> = {
  制度: '员工手册、考勤、报销、审批权限等公司规矩',
  产品: '产品介绍、报价规则、交付周期、服务条款',
  客户: '客户资料、合作纪要、历史订单（通常属敏感）',
  培训: '新人培训、岗位手册、操作规范',
  合同法务: '合同模板、审查要点、法务意见',
}

/** 数据范围的白话说明。 */
export const CLEARANCE_HINTS: Record<KnowledgePermission, string> = {
  public: '公开：只能用对外公开的资料',
  internal: '内部：可看公司内部资料（推荐）',
  confidential: '机密：可看客户资料、报价底线等敏感内容',
}

/** 数据范围的中文短标签。 */
export const PERMISSION_LABELS: Record<KnowledgePermission, string> = {
  public: '公开',
  internal: '内部',
  confidential: '机密',
}


export interface KnowledgeDoc {
  id: string
  category: KnowledgeCategory
  title: string
  /** 原始全文（本地保存，可追溯）。 */
  content: string
  /** 来源标识（文件名 / URL / 系统）。 */
  source?: string
  permission: KnowledgePermission
  tags?: string[]
  /** 归属企业 / 租户（多租户隔离）。 */
  tenantId?: string
  createdAt: number
  updatedAt: number
  chunkCount: number
}

export interface KnowledgeChunk {
  id: string
  docId: string
  category: KnowledgeCategory
  permission: KnowledgePermission
  tenantId?: string
  /** 分块序号（自 0 起）。 */
  index: number
  text: string
  /** 冗余存出处，使检索命中自带可追溯信息（无需回查文档）。 */
  title: string
  source?: string
  /** 预分词结果（供 BM25 打分复用）。 */
  terms: string[]
}

/** 检索请求。 */
export interface RetrieveOptions {
  category?: KnowledgeCategory
  permission?: KnowledgePermission
  tenantId?: string
  topK?: number
  /** 最低得分阈值，低于则丢弃（防幻觉：宁缺毋滥）。 */
  minScore?: number
  /** 查询词命中率闸门（0~1），低于则该块不计入命中。防「共用词擦边」噪声。 */
  minMatchRatio?: number
}

/** 一条检索命中的结果（带可追溯出处）。 */
export interface RetrievalHit {
  chunkId: string
  docId: string
  title: string
  category: KnowledgeCategory
  source?: string
  score: number
  text: string
}

export interface RetrieveResult {
  query: string
  hits: RetrievalHit[]
  /** 拼接好的、可直接喂给模型的知识上下文。 */
  context: string
  /** 是否命中（false 表示知识库中无相关内容，应如实告知而非编造）。 */
  grounded: boolean
}

export interface IngestInput {
  category: KnowledgeCategory
  title: string
  content: string
  source?: string
  permission?: KnowledgePermission
  tags?: string[]
  tenantId?: string
}

export interface KnowledgeStats {
  docCount: number
  chunkCount: number
  byCategory: Record<string, number>
  totalChars: number
}
