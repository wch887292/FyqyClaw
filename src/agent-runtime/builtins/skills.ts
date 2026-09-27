/**
 * 内置技能（可插拔的 skill 扩展）。
 *  - NotifySkill：调用 HTTP 连接器把消息推送到外部系统（体现 技能 → 连接器 的可对接链路）。
 *  - KnowledgeSkill：企业知识库问答（RAG 占位实现，对接 ②数据中台 知识库）。
 */
import type { RuntimeContext, Skill, SkillResult } from '../core/types'

/** 通知类技能：把一条消息通过连接器外发。 */
export class NotifySkill implements Skill {
  readonly kind = 'skill'
  readonly id = 'skill-notify'
  readonly name = '外部通知'
  readonly version = '1.0.0'
  readonly category = 'utility'
  readonly description = '通过连接器把消息推送到企业AI一站式平台或第三方系统'

  async execute(input: Record<string, unknown>, ctx: RuntimeContext): Promise<SkillResult> {
    const connector = ctx.runtime.getExtension('connector', 'connector-http')
    if (!connector) return { ok: false, error: 'no http connector registered' }
    const res = await connector.call('notify', { text: String(input.text ?? '') }, ctx)
    return { ok: res.ok, output: res.data, error: res.error }
  }
}

/**
 * 知识库问答技能（RAG 占位）。
 * 真实实现：把企业制度/产品/客户等文档向量化后检索。此处用本地索引演示流程。
 */
export class KnowledgeSkill implements Skill {
  readonly kind = 'skill'
  readonly id = 'skill-knowledge'
  readonly name = '企业知识库问答'
  readonly version = '1.0.0'
  readonly category = 'knowledge'
  readonly description = '基于企业专属知识库做精准问答（RAG）'

  async execute(input: Record<string, unknown>, ctx: RuntimeContext): Promise<SkillResult> {
    const question = String(input.question ?? '')
    const base = (ctx.config.knowledgeBase as Record<string, string>) ?? {}
    const hit = Object.entries(base).find(([k]) => question.includes(k))
    if (hit) return { ok: true, output: hit[1] }
    return {
      ok: true,
      output: `（知识库占位）未命中「${question}」。接入向量库后将返回企业专属精准答案。`,
    }
  }
}
