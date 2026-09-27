/**
 * KnowledgeBase —— 企业知识库（数据中台）核心实现。
 *
 * 能力：
 *  - 五类目录：制度 / 产品 / 客户 / 培训 / 合同法务
 *  - 上传解析：文本 → 自动分块（chunk）+ 分词索引
 *  - RAG 检索：BM25 打分，返回带出处的命中，附「无资料」判定（抗幻觉）
 *  - 权限分级：public / internal / confidential + 租户隔离
 *  - 本地持久化：JSON 文件（默认零出境）；不传 dataDir 则纯内存
 *
 * 纯 Node 内置实现，不依赖 Electron / DOM，可被 agent / skill / 宿主复用。
 */
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import { chunkText, tokenize } from './parser'
import { bm25Search, buildContext } from './retriever'
import type {
  IngestInput,
  KnowledgeCategory,
  KnowledgeChunk,
  KnowledgeDoc,
  KnowledgePermission,
  KnowledgeStats,
  RetrieveOptions,
  RetrieveResult,
} from './types'

/** 权限等级（数值越大越机密）。 */
const PERMISSION_LEVEL: Record<KnowledgePermission, number> = {
  public: 0,
  internal: 1,
  confidential: 2,
}

export interface KnowledgeBaseOptions {
  /** 本地数据目录；不传则仅内存驻留（不落盘）。 */
  dataDir?: string
  /** 默认租户（多租户隔离）。 */
  tenantId?: string
  /** 分块大小（字符）。 */
  chunkSize?: number
}

export class KnowledgeBase {
  private readonly docs = new Map<string, KnowledgeDoc>()
  private readonly chunks: KnowledgeChunk[] = []
  private readonly dataDir?: string
  private readonly defaultTenant?: string
  private readonly chunkSize: number
  private counter = 0

  constructor(options: KnowledgeBaseOptions = {}) {
    this.dataDir = options.dataDir
    this.defaultTenant = options.tenantId
    this.chunkSize = options.chunkSize ?? 500
  }

  /* ----------------------------- 持久化 ----------------------------- */

  private get storePath(): string | undefined {
    return this.dataDir ? join(this.dataDir, 'knowledge-base.json') : undefined
  }

  /** 从本地磁盘加载（无文件则视为空库）。 */
  async load(): Promise<number> {
    const path = this.storePath
    if (!path) return 0
    try {
      const raw = await fs.readFile(path, 'utf-8')
      const parsed = JSON.parse(raw) as { docs?: KnowledgeDoc[]; chunks?: KnowledgeChunk[] }
      this.docs.clear()
      this.chunks.length = 0
      for (const doc of parsed.docs ?? []) this.docs.set(doc.id, doc)
      for (const chunk of parsed.chunks ?? []) this.chunks.push(chunk)
      return this.docs.size
    } catch {
      return 0 // 文件不存在或损坏：视为空库，不抛错
    }
  }

  /** 落盘到本地（零出境）。 */
  async persist(): Promise<void> {
    const path = this.storePath
    if (!path) return
    await fs.mkdir(dirname(path), { recursive: true })
    const payload = {
      version: 1,
      savedAt: Date.now(),
      docs: Array.from(this.docs.values()),
      chunks: this.chunks,
    }
    await fs.writeFile(path, JSON.stringify(payload, null, 2), 'utf-8')
  }

  /* ------------------------------ 写入 ------------------------------ */

  /** 上传解析：把一份资料切块、建索引并入库。 */
  async ingest(input: IngestInput): Promise<KnowledgeDoc> {
    const now = Date.now()
    const id = `doc_${now}_${(++this.counter).toString(36)}`
    const permission: KnowledgePermission = input.permission ?? 'internal'
    const tenantId = input.tenantId ?? this.defaultTenant

    const pieces = chunkText(input.content, { size: this.chunkSize })
    const doc: KnowledgeDoc = {
      id,
      category: input.category,
      title: input.title,
      content: input.content,
      source: input.source,
      permission,
      tags: input.tags,
      tenantId,
      createdAt: now,
      updatedAt: now,
      chunkCount: pieces.length,
    }
    this.docs.set(id, doc)

    pieces.forEach((text, index) => {
      this.chunks.push({
        id: `${id}#${index}`,
        docId: id,
        category: input.category,
        permission,
        tenantId,
        index,
        text,
        title: input.title,
        source: input.source,
        terms: tokenize(`${input.title} ${text}`),
      })
    })

    await this.persist()
    return doc
  }

  /** 删除一份文档及其全部块。 */
  async remove(docId: string): Promise<boolean> {
    if (!this.docs.delete(docId)) return false
    for (let i = this.chunks.length - 1; i >= 0; i--) {
      if (this.chunks[i].docId === docId) this.chunks.splice(i, 1)
    }
    await this.persist()
    return true
  }

  /* ------------------------------ 检索 ------------------------------ */

  /**
   * RAG 检索：按目录 / 租户 / 权限过滤候选块，再做 BM25 打分。
   * @param clearance 调用方最高密级，默认 confidential（本地所有者）。
   */
  retrieve(
    query: string,
    options: RetrieveOptions & { clearance?: KnowledgePermission } = {},
  ): RetrieveResult {
    const clearance = options.clearance ?? 'confidential'
    const maxLevel = PERMISSION_LEVEL[clearance]

    const candidates = this.chunks.filter((chunk) => {
      if (options.category && chunk.category !== options.category) return false
      if (options.tenantId && chunk.tenantId && chunk.tenantId !== options.tenantId) return false
      if (options.permission && chunk.permission !== options.permission) return false
      // 权限闸门：密级高于调用方可见范围则不可见
      if (PERMISSION_LEVEL[chunk.permission] > maxLevel) return false
      return true
    })

    const hits = bm25Search(candidates, query, {
      topK: options.topK ?? 5,
      minScore: options.minScore ?? 0,
      minMatchRatio: options.minMatchRatio ?? 0.2,
    })

    return {
      query,
      hits,
      context: buildContext(hits),
      grounded: hits.length > 0,
    }
  }

  /* ------------------------------ 查询 ------------------------------ */

  list(options: { category?: KnowledgeCategory; tenantId?: string } = {}): KnowledgeDoc[] {
    return Array.from(this.docs.values())
      .filter((d) => !options.category || d.category === options.category)
      .filter((d) => !options.tenantId || !d.tenantId || d.tenantId === options.tenantId)
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  getDoc(id: string): KnowledgeDoc | undefined {
    return this.docs.get(id)
  }

  getStats(): KnowledgeStats {
    const byCategory: Record<string, number> = {}
    let totalChars = 0
    for (const doc of this.docs.values()) {
      byCategory[doc.category] = (byCategory[doc.category] ?? 0) + 1
      totalChars += doc.content.length
    }
    return {
      docCount: this.docs.size,
      chunkCount: this.chunks.length,
      byCategory,
      totalChars,
    }
  }
}
