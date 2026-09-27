/**
 * 文本切分与分词 —— 知识库检索的纯函数基础（无任何外部依赖）。
 *
 * - chunkText：按段落优先切分，打包成带重叠的定长块，尽量不切断段落语义。
 * - tokenize：中英文混合分词。中文取「二元组（bigram）+ 单字」，英文取长度≥1 的词，
 *   兼顾中文检索精度与英文技术词召回。
 */

/** 判断是否为 CJK 字符。 */
function isCJK(ch: string): boolean {
  const code = ch.codePointAt(0) ?? 0
  return (
    (code >= 0x4e00 && code <= 0x9fff) || // 常用汉字
    (code >= 0x3400 && code <= 0x4dbf) || // 扩展 A
    (code >= 0xf900 && code <= 0xfaff) // 兼容汉字
  )
}

/** 中英文混合分词：英文单词 + 中文 bigram + 中文单字。 */
export function tokenize(text: string): string[] {
  const lower = text.toLowerCase()
  const terms: string[] = []

  // 英文 / 数字词
  for (const m of lower.matchAll(/[a-z0-9][a-z0-9_+#.\-]*/g)) {
    terms.push(m[0])
  }

  // 抽取连续中文串，再产出 bigram + 单字
  for (const m of lower.matchAll(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]+/g)) {
    const run = m[0]
    for (let i = 0; i < run.length; i++) {
      terms.push(run[i])
      if (i + 1 < run.length) terms.push(run[i] + run[i + 1])
    }
  }

  return terms
}

/** 统计词频。 */
export function termFrequency(terms: string[]): Map<string, number> {
  const tf = new Map<string, number>()
  for (const t of terms) tf.set(t, (tf.get(t) ?? 0) + 1)
  return tf
}

export interface ChunkOptions {
  /** 目标块大小（字符数）。 */
  size?: number
  /** 相邻块重叠字符数，保证跨块语义连续。 */
  overlap?: number
  /** 单块硬上限，超过则强切（防止超长无换行文本）。 */
  maxSize?: number
}

/**
 * 把长文本切成适合检索与喂给模型的块。
 * 策略：先按空行分段 → 段落内按句切分 → 贪心打包到 size 附近，附加 overlap 重叠。
 */
export function chunkText(content: string, options: ChunkOptions = {}): string[] {
  const size = options.size ?? 500
  const overlap = options.overlap ?? 80
  const maxSize = options.maxSize ?? size * 2

  const text = content.replace(/\r\n/g, '\n').trim()
  if (!text) return []
  if (text.length <= size) return [text]

  // 1) 原子单元 = 段落 → 句子
  const paragraphs = text.split(/\n{2,}/)
  const units: string[] = []
  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue
    if (trimmed.length <= size) {
      units.push(trimmed)
      continue
    }
    // 段落过长：按中英文句末标点切句
    const sentences = trimmed.split(/(?<=[。！？!?；;\n])/)
    for (const s of sentences) {
      const st = s.trim()
      if (!st) continue
      if (st.length <= maxSize) {
        units.push(st)
      } else {
        // 极端长句：硬切
        for (let i = 0; i < st.length; i += size) units.push(st.slice(i, i + size))
      }
    }
  }

  // 2) 贪心打包成块
  const chunks: string[] = []
  let buffer = ''
  for (const unit of units) {
    if (!buffer) {
      buffer = unit
    } else if (buffer.length + unit.length + 1 <= size) {
      buffer += '\n' + unit
    } else {
      chunks.push(buffer)
      // 附加重叠：取上一块尾部 overlap 字符作为新块前缀
      const tail = buffer.slice(Math.max(0, buffer.length - overlap))
      buffer = tail + '\n' + unit
    }
  }
  if (buffer.trim()) chunks.push(buffer)

  return chunks.map((c) => c.trim()).filter(Boolean)
}
