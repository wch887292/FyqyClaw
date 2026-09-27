/**
 * 知识库（数据中台）模块公共导出。
 *
 * 用法：
 *   import { createKnowledgeBasePlugin, KnowledgeBase } from './knowledge-base'
 *   await runtime.installPlugin(createKnowledgeBasePlugin())
 *   const kb = runtime.getService<KnowledgeBase>('knowledgeBase')
 */
export { KnowledgeBase } from './knowledge-base'
export type { KnowledgeBaseOptions } from './knowledge-base'
export { createKnowledgeBasePlugin, knowledgeBasePlugin, KB_SERVICE_NAME } from './plugin'
export { KnowledgeConsole, ConsoleError } from './console'
export type { ConsoleSearchResult } from './console'
export { CONSOLE_HTML } from './console-ui'
export {
  KNOWLEDGE_CATEGORIES,
  CATEGORY_HINTS,
  CLEARANCE_HINTS,
  PERMISSION_LABELS,
} from './types'
export type {
  IngestInput,
  KnowledgeCategory,
  KnowledgeChunk,
  KnowledgeDoc,
  KnowledgePermission,
  KnowledgeStats,
  RetrievalHit,
  RetrieveOptions,
  RetrieveResult,
} from './types'
export { chunkText, tokenize } from './parser'
export { bm25Search, buildContext } from './retriever'
