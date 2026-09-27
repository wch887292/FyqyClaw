/**
 * 知识库插件 —— 把 KnowledgeBase 以「可插拔」方式接入智能体运行时。
 *
 * 激活时：
 *  1) 构造 KnowledgeBase 并从本地加载已有资料；
 *  2) 通过 registerService('knowledgeBase', kb) 注册为运行时级服务，
 *     供任意 agent / skill 通过 ctx.services.knowledgeBase 取用（数据中台能力共享）；
 *  3) 登记 4 个技能：kb.ingest（上传解析）、kb.query（RAG 检索）、kb.list、kb.stats。
 *
 * 卸载时随插件一并回收服务与技能（可插拔语义）。
 */
import { KnowledgeBase } from './knowledge-base'
import type { KnowledgeCategory, KnowledgePermission } from './types'
import type { Plugin, RuntimeContext, Skill, SkillResult } from '../agent-runtime/core/types'

export const KB_SERVICE_NAME = 'knowledgeBase'

/** 从上下文取知识库实例（未安装插件时返回 undefined，技能如实报错而非崩溃）。 */
function getKB(ctx: RuntimeContext): KnowledgeBase | undefined {
  return ctx.services?.[KB_SERVICE_NAME] as KnowledgeBase | undefined
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

const ingestSkill: Skill = {
  kind: 'skill',
  id: 'kb.ingest',
  name: '知识入库',
  version: '1.0.0',
  category: 'knowledge',
  description: '上传企业资料（制度/产品/客户/培训/合同法务），自动分块建索引',
  inputSchema: {
    type: 'object',
    required: ['category', 'title', 'content'],
    properties: {
      category: { type: 'string', enum: ['制度', '产品', '客户', '培训', '合同法务'] },
      title: { type: 'string' },
      content: { type: 'string' },
      source: { type: 'string' },
      permission: { type: 'string', enum: ['public', 'internal', 'confidential'] },
      tags: { type: 'array', items: { type: 'string' } },
    },
  },
  async execute(input: Record<string, unknown>, ctx: RuntimeContext): Promise<SkillResult> {
    const kb = getKB(ctx)
    if (!kb) return { ok: false, error: '知识库服务未安装（请先加载 knowledge-base 插件）' }
    const category = asString(input.category) as KnowledgeCategory | undefined
    const title = asString(input.title)
    const content = asString(input.content)
    if (!category || !title || !content) {
      return { ok: false, error: '缺少必填项：category / title / content' }
    }
    const doc = await kb.ingest({
      category,
      title,
      content,
      source: asString(input.source),
      permission: asString(input.permission) as KnowledgePermission | undefined,
      tags: Array.isArray(input.tags) ? (input.tags as string[]) : undefined,
    })
    return { ok: true, output: { id: doc.id, category: doc.category, chunkCount: doc.chunkCount } }
  },
}

const querySkill: Skill = {
  kind: 'skill',
  id: 'kb.query',
  name: '知识检索',
  version: '1.0.0',
  category: 'knowledge',
  description: 'RAG 检索企业知识库，返回带出处的命中片段（无资料时如实告知）',
  inputSchema: {
    type: 'object',
    required: ['query'],
    properties: {
      query: { type: 'string' },
      category: { type: 'string', enum: ['制度', '产品', '客户', '培训', '合同法务'] },
      topK: { type: 'number' },
      minScore: { type: 'number' },
      minMatchRatio: { type: 'number' },
      clearance: { type: 'string', enum: ['public', 'internal', 'confidential'] },
    },
  },
  async execute(input: Record<string, unknown>, ctx: RuntimeContext): Promise<SkillResult> {
    const kb = getKB(ctx)
    if (!kb) return { ok: false, error: '知识库服务未安装' }
    const query = asString(input.query)
    if (!query) return { ok: false, error: '缺少必填项：query' }
    const result = kb.retrieve(query, {
      category: asString(input.category) as KnowledgeCategory | undefined,
      topK: typeof input.topK === 'number' ? input.topK : undefined,
      minScore: typeof input.minScore === 'number' ? input.minScore : undefined,
      minMatchRatio: typeof input.minMatchRatio === 'number' ? input.minMatchRatio : undefined,
      clearance: asString(input.clearance) as KnowledgePermission | undefined,
    })
    return {
      ok: true,
      output: {
        grounded: result.grounded,
        hitCount: result.hits.length,
        hits: result.hits,
        context: result.context,
        // 抗幻觉提示：无命中时明确要求模型不得编造
        note: result.grounded ? undefined : '知识库中无相关资料，请如实告知用户，不要编造内容。',
      },
    }
  },
}

const listSkill: Skill = {
  kind: 'skill',
  id: 'kb.list',
  name: '知识清单',
  version: '1.0.0',
  category: 'knowledge',
  description: '列出已入库资料（可按分类过滤）',
  async execute(input: Record<string, unknown>, ctx: RuntimeContext): Promise<SkillResult> {
    const kb = getKB(ctx)
    if (!kb) return { ok: false, error: '知识库服务未安装' }
    const docs = kb.list({ category: asString(input.category) as KnowledgeCategory | undefined }).map(
      (d) => ({ id: d.id, category: d.category, title: d.title, permission: d.permission, chunkCount: d.chunkCount, source: d.source }),
    )
    return { ok: true, output: docs }
  },
}

const statsSkill: Skill = {
  kind: 'skill',
  id: 'kb.stats',
  name: '知识统计',
  version: '1.0.0',
  category: 'knowledge',
  description: '知识库概览（文档数/块数/分类分布）',
  async execute(_input: Record<string, unknown>, ctx: RuntimeContext): Promise<SkillResult> {
    const kb = getKB(ctx)
    if (!kb) return { ok: false, error: '知识库服务未安装' }
    return { ok: true, output: kb.getStats() }
  },
}

/** 知识库插件：可插拔地为一个运行时挂载「数据中台」能力。 */
export function createKnowledgeBasePlugin(instance?: KnowledgeBase): Plugin {
  return {
    manifest: {
      id: 'fyqy.knowledge-base',
      name: '企业知识库（数据中台）',
      version: '1.0.0',
      description: '五类目录 + 上传解析 + RAG 检索 + 权限分级，作为运行时共享服务',
      author: '晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心（吴赐虹）',
      tags: ['knowledge', 'rag', 'data-platform'],
    },
    async activate(api) {
      const dataDir =
        (api.runtime.config['knowledgeDir'] as string | undefined) ??
        (api.runtime.config['dataDir'] as string | undefined)
      const tenantId = api.runtime.config['tenantId'] as string | undefined
      const kb = instance ?? new KnowledgeBase(dataDir ? { dataDir, tenantId } : { tenantId })
      if (!instance) await kb.load()
      api.registerService(KB_SERVICE_NAME, kb)
      api.register(ingestSkill)
      api.register(querySkill)
      api.register(listSkill)
      api.register(statsSkill)
      api.logger.info(`知识库已挂载：${kb.getStats().docCount} 篇资料 / ${kb.getStats().chunkCount} 块`)
    },
  }
}

export const knowledgeBasePlugin = createKnowledgeBasePlugin()
