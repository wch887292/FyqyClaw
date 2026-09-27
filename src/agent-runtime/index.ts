/**
 * FyqyClaw Agent Runtime —— 公共 API 出口。
 *
 * 三大特性：
 *  - 可插拔：ExtensionRegistry + Plugin 生命周期（agent/skill/tool/model-provider/connector/transport）。
 *  - 可独立：AgentRuntime 不依赖 Electron，可作为库嵌入，或由 CLI / 网关托管。
 *  - 可对接：Connector 扩展点 + OpenAI 兼容网关，对接任意外部系统与企业AI一站式平台。
 */
export * from './core/types'
export * from './core/context'
export { ExtensionRegistry } from './runtime/registry'
export { AgentRuntime } from './runtime/agent-runtime'
export { AgentSession } from './runtime/session'
export { PluginLoader } from './runtime/loader'
export { createFyqyRuntime } from './presets/default-runtime'
export { builtinPlugins } from './builtins'
export {
  businessPlugin,
  BUSINESS_AGENTS,
  DomainAgent,
  type DomainAgentConfig,
} from './presets/business-agents'
export {
  KnowledgeBase,
  createKnowledgeBasePlugin,
  knowledgeBasePlugin,
  KB_SERVICE_NAME,
  KNOWLEDGE_CATEGORIES,
  PERMISSION_LABELS,
  KnowledgeConsole,
  ConsoleError,
  CONSOLE_HTML,
  chunkText,
  tokenize,
  bm25Search,
  buildContext,
  type ConsoleSearchResult,
  type IngestInput,
  type KnowledgeCategory,
  type KnowledgeDoc,
  type KnowledgePermission,
  type KnowledgeStats,
  type RetrievalHit,
  type RetrieveOptions,
  type RetrieveResult,
} from '../knowledge-base'
export { runCli } from './hosts/cli'
export { startGateway } from './hosts/gateway'
export {
  Studio,
  STUDIO_HTML,
  ROLE_BLUEPRINTS,
  OUTPUT_STYLES,
  CATEGORY_HINTS,
  CLEARANCE_HINTS,
  compileEmployee,
  normalizeDraft,
  validateDraft,
  StudioValidationError,
  type CompiledEmployee,
  type DigitalEmployee,
  type DigitalEmployeeDraft,
  type GuidedResult,
  type OutputStyle,
  type RoleBlueprint,
  type StudioBlueprints,
  type StudioOptions,
  type StudioRole,
  type TryRunResult,
} from './studio'
