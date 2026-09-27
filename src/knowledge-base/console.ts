/**
 * KnowledgeConsole —— 知识库管理面板的服务层。
 *
 * 与 Studio（造员工）配套：Studio 负责「谁来用知识」，本模块负责「知识怎么进来、怎么管」。
 * 对上层（网关 / 界面）暴露一组稳定的增删查检方法，并在服务层做入参校验，
 * 避免把校验逻辑散落到 HTTP 路由里。
 *
 * 纯 TS，不依赖 Electron / DOM。
 */
import type { KnowledgeBase } from './knowledge-base'
import { CATEGORY_HINTS, CLEARANCE_HINTS, KNOWLEDGE_CATEGORIES, PERMISSION_LABELS } from './types'
import type {
  IngestInput,
  KnowledgeCategory,
  KnowledgeDoc,
  KnowledgePermission,
  KnowledgeStats,
  RetrievalHit,
} from './types'

/** 面板检索结果（比底层多带一句"人话结论"，便于界面直接展示）。 */
export interface ConsoleSearchResult {
  query: string
  grounded: boolean
  hits: RetrievalHit[]
  /** 面向界面的结论：命中 / 未命中（用于提示"该补哪类资料"）。 */
  verdict: string
}

export class ConsoleError extends Error {}

const PERMISSIONS: KnowledgePermission[] = ['public', 'internal', 'confidential']

export class KnowledgeConsole {
  constructor(private readonly kb: KnowledgeBase) {}

  stats(): KnowledgeStats {
    return this.kb.getStats()
  }

  /** 五类目录 + 白话说明（界面下拉与筛选用）。 */
  categories(): { value: KnowledgeCategory; label: string; hint: string }[] {
    return KNOWLEDGE_CATEGORIES.map((c) => ({ value: c, label: c, hint: CATEGORY_HINTS[c] }))
  }

  /** 数据范围选项（界面用）。 */
  permissions(): { value: KnowledgePermission; label: string; hint: string }[] {
    return (Object.keys(CLEARANCE_HINTS) as KnowledgePermission[]).map((p) => ({
      value: p,
      label: PERMISSION_LABELS[p],
      hint: CLEARANCE_HINTS[p],
    }))
  }

  list(category?: string): KnowledgeDoc[] {
    const cat = this.normalizeCategory(category)
    return this.kb.list(cat ? { category: cat } : {}).map(projectDoc)
  }

  get(id: string): KnowledgeDoc | undefined {
    const doc = this.kb.getDoc(id)
    return doc ? projectDoc(doc) : undefined
  }

  async ingest(input: Partial<IngestInput>): Promise<KnowledgeDoc> {
    const category = this.normalizeCategory(input.category)
    if (!category) {
      throw new ConsoleError(`资料分类必填，且须为：${KNOWLEDGE_CATEGORIES.join(' / ')}`)
    }
    const title = (input.title ?? '').trim()
    if (!title) throw new ConsoleError('资料标题必填')
    const content = (input.content ?? '').trim()
    if (!content) throw new ConsoleError('资料正文不能为空')
    if (content.length < 10) throw new ConsoleError('资料正文太短（少于 10 字），可能不是有效内容')

    const permission = input.permission ?? 'internal'
    if (!PERMISSIONS.includes(permission)) {
      throw new ConsoleError(`数据范围须为：${PERMISSIONS.join(' / ')}`)
    }

    const doc = await this.kb.ingest({
      category,
      title,
      content,
      source: (input.source ?? '').trim() || undefined,
      permission,
      tags: input.tags,
    })
    return projectDoc(doc)
  }

  async remove(id: string): Promise<boolean> {
    if (!id) throw new ConsoleError('缺少资料 id')
    return this.kb.remove(id)
  }

  /**
   * 检索测试：用于验证"这份资料到底能不能被检索到"。
   * 这是喂资料环节最需要的反馈——上传完立刻试一句真实的业务问法。
   */
  search(
    query: string,
    options: { category?: string; topK?: number; clearance?: KnowledgePermission; minMatchRatio?: number } = {},
  ): ConsoleSearchResult {
    const q = (query ?? '').trim()
    if (!q) throw new ConsoleError('请输入要检索的问题')

    const result = this.kb.retrieve(q, {
      category: this.normalizeCategory(options.category) ?? undefined,
      topK: options.topK ?? 5,
      clearance: options.clearance ?? 'confidential',
      minMatchRatio: options.minMatchRatio,
    })

    const verdict = result.grounded
      ? `命中 ${result.hits.length} 条，最高相关度 ${result.hits[0]?.score ?? 0}`
      : '没有命中：知识库里缺少能回答这个问题的资料，或换个更接近原文的说法试试'

    return { query: q, grounded: result.grounded, hits: result.hits, verdict }
  }

  private normalizeCategory(value: unknown): KnowledgeCategory | undefined {
    if (typeof value !== 'string' || !value) return undefined
    return (KNOWLEDGE_CATEGORIES as readonly string[]).includes(value)
      ? (value as KnowledgeCategory)
      : undefined
  }
}

/** 面板不需要把整篇原文塞回列表（体积大），只回传摘要与元信息。 */
function projectDoc(doc: KnowledgeDoc): KnowledgeDoc {
  return {
    ...doc,
    content: doc.content.length > 200 ? doc.content.slice(0, 200) + '…' : doc.content,
  }
}
