/**
 * 轻量 RAG 检索 —— BM25 打分（纯函数实现，无外部向量库依赖）。
 *
 * 为什么不用向量库：V1 追求「本地零出境 + 零重依赖 + 可审计」。
 * BM25 对制度 / 合同 / 手册这类关键词密集的企业文本召回足够好，
 * 且完全离线、结果可解释（能给出命中的原句与出处，天然抗幻觉）。
 * 后续 V2 可在此模块后追加向量召回做混合检索，接口不变。
 */
import { termFrequency, tokenize } from './parser'
import type { KnowledgeChunk, RetrievalHit } from './types'

const K1 = 1.5 // 词频饱和参数
const B = 0.75 // 长度归一化参数

export interface ScoreOptions {
  topK?: number
  minScore?: number
  /**
   * 查询词命中率闸门（抗幻觉关键）：命中块至少覆盖多少比例的「查询词」才算有效。
   * 0.2 表示 5 个查询词里至少命中 2 个。用于过滤掉仅靠「公司」「怎么」这类
   * 高频共用词擦边的噪声命中。默认 0.2；设为 0 可关闭。
   */
  minMatchRatio?: number
}

/**
 * 对候选块做 BM25 打分并返回 TopK 命中。
 * 无任何查询词命中、或命中率低于 minMatchRatio 时返回空数组
 * （上层据此判定 grounded=false，如实告知无资料，而非编造）。
 */
export function bm25Search(
  chunks: KnowledgeChunk[],
  query: string,
  options: ScoreOptions = {},
): RetrievalHit[] {
  const topK = options.topK ?? 5
  const minScore = options.minScore ?? 0
  const minMatchRatio = options.minMatchRatio ?? 0.2

  const queryTerms = Array.from(new Set(tokenize(query)))
  if (queryTerms.length === 0 || chunks.length === 0) return []
  const requiredMatches = Math.max(1, Math.ceil(minMatchRatio * queryTerms.length))

  // 预计算每块词频与长度
  const stats = chunks.map((chunk) => {
    const tf = termFrequency(chunk.terms)
    return { chunk, tf, dl: chunk.terms.length }
  })

  const N = stats.length
  const avgdl = stats.reduce((sum, s) => sum + s.dl, 0) / N || 1

  // 文档频率 df
  const df = new Map<string, number>()
  for (const s of stats) {
    for (const term of new Set(s.tf.keys())) {
      df.set(term, (df.get(term) ?? 0) + 1)
    }
  }

  const scored: RetrievalHit[] = []
  for (const s of stats) {
    // 命中率闸门：统计该块覆盖了多少个不同的查询词
    let matchedTerms = 0
    for (const term of queryTerms) if (s.tf.has(term)) matchedTerms++
    if (matchedTerms < requiredMatches) continue

    let score = 0
    for (const term of queryTerms) {
      const f = s.tf.get(term)
      if (!f) continue
      const n = df.get(term) ?? 0
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5))
      const denom = f + K1 * (1 - B + (B * s.dl) / avgdl)
      score += idf * ((f * (K1 + 1)) / denom)
    }
    if (score > 0) {
      scored.push({
        chunkId: s.chunk.id,
        docId: s.chunk.docId,
        title: s.chunk.title ?? s.chunk.docId,
        category: s.chunk.category,
        source: s.chunk.source,
        score: Number(score.toFixed(4)),
        text: s.chunk.text,
      })
    }
  }

  return scored
    .filter((h) => h.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}

/** 把命中块拼成可直接喂给模型的知识上下文（带出处编号，便于引用与审计）。 */
export function buildContext(hits: RetrievalHit[]): string {
  if (hits.length === 0) return ''
  return hits
    .map(
      (h, i) =>
        `[${i + 1}] 来源：${h.category} · ${h.title}${h.source ? `（${h.source}）` : ''} · 相关度 ${h.score}\n${h.text}`,
    )
    .join('\n\n---\n\n')
}
