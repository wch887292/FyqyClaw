/**
 * FyqyClaw Agent Runtime — 核心类型定义
 *
 * 设计目标（三大特性）：
 *  - 可插拔 (Pluggable)：agent / skill / tool / model-provider / connector / transport 全部以「扩展」
 *    形式在统一的 ExtensionRegistry 中登记，支持运行时安装 / 卸载 / 热替换。
 *  - 可独立 (Standalone)：本文件及其上层运行时不依赖 Electron / DOM / IPC，纯 TS + Node 内置，
 *    可作为库嵌入任意 Node 应用，也可由 CLI / HTTP 网关独立托管。
 *  - 可对接 (Integrable)：通过 Connector 扩展点对接任意外部系统（HTTP / WebSocket / MCP /
 *    Webhook / 企业AI一站式平台）；对外暴露 OpenAI 兼容网关，第三方无需改造即可接入。
 */

/** 扩展点种类 —— 每个种类对应一种可插拔能力。 */
export interface ExtensionRegistry {
  agent: Agent
  skill: Skill
  tool: Tool
  'model-provider': ModelProvider
  connector: Connector
  transport: Transport
}

export type ExtensionKind = keyof ExtensionRegistry
export type AnyExtension = ExtensionRegistry[ExtensionKind]
export type ExtensionOfKind<K extends ExtensionKind> = ExtensionRegistry[K]

/** 所有扩展共享的元信息。 */
export interface ExtensionMeta {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  tags?: string[]
}

/** 对话消息。 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  ts?: number
}

/** 一次智能体运行的输入。 */
export interface AgentRunInput {
  sessionId: string
  message: string
  history: AgentMessage[]
  metadata?: Record<string, unknown>
}

/* ------------------------------------------------------------------ */
/* 扩展点接口                                                          */
/* ------------------------------------------------------------------ */

/** 智能体：处理一轮会话消息，产出事件流。 */
export interface Agent extends ExtensionMeta {
  kind: 'agent'
  capabilities?: string[]
  run(input: AgentRunInput, ctx: RuntimeContext): AsyncIterable<AgentEvent>
}

/** 技能：单一、受控的能力单元（纯函数式，便于安全审计）。 */
export interface Skill extends ExtensionMeta {
  kind: 'skill'
  category?: string
  inputSchema?: Record<string, unknown>
  execute(input: Record<string, unknown>, ctx: RuntimeContext): Promise<SkillResult>
}

export interface SkillResult {
  ok: boolean
  output?: unknown
  error?: string
}

/** 工具：暴露给智能体调用的函数（常作为 Connector 的薄封装）。 */
export interface Tool extends ExtensionMeta {
  kind: 'tool'
  inputSchema?: Record<string, unknown>
  invoke(args: Record<string, unknown>, ctx: RuntimeContext): Promise<ToolResult>
}

export interface ToolResult {
  ok: boolean
  data?: unknown
  error?: string
}

/** 模型提供器：对话补全后端（公有云 / 本地 Ollama / 私有部署）。 */
export interface ModelProvider extends ExtensionMeta {
  kind: 'model-provider'
  models: string[]
  complete(req: ModelRequest, ctx: RuntimeContext): AsyncIterable<ModelChunk>
}

export interface ModelRequest {
  model: string
  messages: AgentMessage[]
  temperature?: number
  maxTokens?: number
}

export interface ModelChunk {
  type: 'text' | 'done' | 'error'
  text?: string
  error?: string
}

/** 连接器：可对接外部系统的适配层（可插拔地扩展「对外连接」能力）。 */
export interface Connector extends ExtensionMeta {
  kind: 'connector'
  protocol: 'http' | 'ws' | 'mcp' | 'webhook' | 'sdk' | 'custom'
  call(action: string, payload: Record<string, unknown>, ctx: RuntimeContext): Promise<ConnectorResult>
  /** 可选：订阅来自外部系统的入站事件（实现无人值守运营的关键）。 */
  listen?(handler: (event: InboundEvent) => void, ctx: RuntimeContext): Promise<() => void>
}

export interface ConnectorResult {
  ok: boolean
  data?: unknown
  error?: string
}

export interface InboundEvent {
  source: string
  type: string
  payload: unknown
}

/** 传输层：运行时如何把事件流「呈现」给宿主（IPC / WebSocket / stdout）。 */
export interface Transport extends ExtensionMeta {
  kind: 'transport'
  send(event: AgentEvent): void
  start?(): Promise<void>
  stop?(): Promise<void>
}

/* ------------------------------------------------------------------ */
/* 事件流                                                              */
/* ------------------------------------------------------------------ */

/** 运行时统一事件 —— 所有扩展通过 ctx.emit 产出，由 Transport 分发到宿主。 */
export type AgentEvent =
  | { type: 'session.start'; sessionId: string }
  | { type: 'agent.think'; sessionId: string; text: string }
  | { type: 'agent.message'; sessionId: string; text: string }
  | { type: 'skill.call'; sessionId: string; skillId: string; input: unknown }
  | { type: 'skill.result'; sessionId: string; skillId: string; ok: boolean; output?: unknown }
  | { type: 'tool.call'; sessionId: string; toolId: string; args: unknown }
  | { type: 'tool.result'; sessionId: string; toolId: string; ok: boolean; data?: unknown }
  | { type: 'connector.call'; sessionId: string; connectorId: string; action: string }
  | { type: 'connector.result'; sessionId: string; connectorId: string; ok: boolean; data?: unknown }
  | { type: 'error'; sessionId: string; error: string }
  | { type: 'session.end'; sessionId: string }

/* ------------------------------------------------------------------ */
/* 运行时上下文（依赖注入容器）                                        */
/* ------------------------------------------------------------------ */

export interface Logger {
  info(message: string): void
  warn(message: string): void
  error(message: string): void
}

export interface SecretStore {
  get(key: string): string | undefined
  set(key: string, value: string): void
}

/** 扩展可调用的最小运行时 API（避免扩展直接依赖容器实现）。 */
export interface AgentRuntimeAPI {
  getExtensions<K extends ExtensionKind>(kind: K): ExtensionOfKind<K>[]
  getExtension<K extends ExtensionKind>(kind: K, id: string): ExtensionOfKind<K> | undefined
  config: Record<string, unknown>
  secrets: SecretStore
  logger: Logger
  /** 构造一个注入到扩展实例的运行时上下文（供技能 / 定时任务复用同一编排逻辑）。 */
  createContext(): RuntimeContext
}

/** 注入到每个扩展运行实例的上下文。 */
export interface RuntimeContext {
  runtime: AgentRuntimeAPI
  config: Record<string, unknown>
  logger: Logger
  secrets: SecretStore
  emit(event: AgentEvent): void
  /**
   * 运行时级服务注册表（可选）。用于挂载跨扩展共享的能力（如知识库、向量检索），
   * 让 agent / skill 在不耦合具体实现的前提下按名取用「数据中台」能力。
   */
  services?: Record<string, unknown>
}

/* ------------------------------------------------------------------ */
/* 插件（可插拔单元）                                                  */
/* ------------------------------------------------------------------ */

/** 插件宿主 API：插件在 activate 时向运行时登记扩展。 */
export interface PluginHostAPI {
  register(extension: AnyExtension): void
  /** 向运行时注册一个跨扩展共享的服务（如知识库），供其它扩展按名取用。 */
  registerService(name: string, impl: unknown): void
  runtime: AgentRuntimeAPI
  logger: Logger
}

/** 插件清单。 */
export interface PluginManifest {
  id: string
  name: string
  version: string
  description?: string
  author?: string
  /** 标签（用于市场检索与分类）。 */
  tags?: string[]
  /** 依赖的其它插件 id。 */
  dependencies?: string[]
  /** 要求的最低运行时版本，如 '1.0.0'。 */
  engines?: { runtime?: string }
}

/** 一个插件 = 清单 + 生命周期。activate 时登记扩展，deactivate 时清理。 */
export interface Plugin {
  manifest: PluginManifest
  activate(api: PluginHostAPI): Promise<void> | void
  deactivate?(): Promise<void> | void
}

/** 已加载插件的运行时状态。 */
export interface LoadedPlugin {
  manifest: PluginManifest
  plugin: Plugin
  extensionIds: string[]
}
