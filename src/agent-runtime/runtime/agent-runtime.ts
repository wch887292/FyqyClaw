/**
 * AgentRuntime —— 智能体运行时容器（可插拔 / 可独立 / 可对接 的核心）。
 *
 * 职责：
 *  - 持有 ExtensionRegistry，管理 agent/skill/tool/model-provider/connector/transport 的登记。
 *  - 管理 Plugin 生命周期（安装 / 卸载 / 热替换）。
 *  - 作为依赖注入容器，向扩展提供 RuntimeContext。
 *  - 创建并托管 AgentSession。
 *  - 通过 Transport 把事件流分发到任意宿主（Electron IPC / WebSocket / stdout）。
 *
 * 完全不依赖 Electron / DOM，可作为库嵌入，也可由 CLI / 网关独立托管。
 */
import { ExtensionRegistry } from './registry'
import { createRuntimeContext, MemorySecretStore, SimpleLogger } from '../core/context'
import type {
  Agent,
  AgentEvent,
  AgentRuntimeAPI,
  AnyExtension,
  ExtensionKind,
  ExtensionOfKind,
  LoadedPlugin,
  Logger,
  Plugin,
  RuntimeContext,
  SecretStore,
  Transport,
} from '../core/types'
import { AgentSession } from './session'

export interface AgentRuntimeOptions {
  config?: Record<string, unknown>
  logger?: Logger
  secrets?: SecretStore
  transports?: Transport[]
}

export class AgentRuntime {
  readonly registry = new ExtensionRegistry()
  readonly config: Record<string, unknown>
  readonly logger: Logger
  readonly secrets: SecretStore
  private readonly transports: Transport[] = []
  private readonly plugins = new Map<string, LoadedPlugin>()
  /** 运行时级服务注册表（如知识库），跨扩展共享。键=服务名，值={impl, owner}。 */
  private readonly services = new Map<string, { impl: unknown; owner: string }>()

  constructor(opts: AgentRuntimeOptions = {}) {
    this.config = opts.config ?? {}
    this.logger = opts.logger ?? new SimpleLogger()
    this.secrets = opts.secrets ?? new MemorySecretStore()
    for (const t of opts.transports ?? []) this.addTransport(t)
  }

  /* ----------------------- 传输层（可独立呈现） ----------------------- */

  addTransport(transport: Transport): void {
    this.transports.push(transport)
    void transport.start?.()
  }

  removeTransport(id: string): void {
    const idx = this.transports.findIndex((t) => t.id === id)
    if (idx >= 0) {
      void this.transports[idx].stop?.()
      this.transports.splice(idx, 1)
    }
  }

  /** 把事件分发到所有已注册传输层（宿主据此呈现 / 转发）。 */
  emit(event: AgentEvent): void {
    for (const t of this.transports) {
      try {
        t.send(event)
      } catch (err) {
        this.logger.error(`transport ${t.id} failed: ${(err as Error).message}`)
      }
    }
  }

  /* ----------------------- 插件生命周期（可插拔） ----------------------- */

  /** 安装插件：执行 activate，登记其扩展，并记录归属。 */
  async installPlugin(plugin: Plugin): Promise<LoadedPlugin> {
    const manifest = plugin.manifest
    if (this.plugins.has(manifest.id)) {
      this.logger.warn(`plugin ${manifest.id} already installed, re-installing`)
      await this.uninstallPlugin(manifest.id)
    }
    this.logger.info(`installing plugin ${manifest.id}@${manifest.version}`)
    const added: string[] = []
    const api = {
      register: (ext: AnyExtension) => {
        this.registry.add(ext, manifest.id)
        added.push(ext.id)
      },
      registerService: (name: string, impl: unknown) => {
        this.services.set(name, { impl, owner: manifest.id })
        this.logger.info(`service registered: ${name} (owner=${manifest.id})`)
      },
      runtime: this.getApi(),
      logger: this.logger,
    }
    await plugin.activate(api)
    const loaded: LoadedPlugin = { manifest, plugin, extensionIds: added }
    this.plugins.set(manifest.id, loaded)
    this.logger.info(`plugin ${manifest.id} installed: ${added.length} extensions`)
    return loaded
  }

  /** 卸载插件：执行 deactivate 并回收其全部扩展。 */
  async uninstallPlugin(id: string): Promise<void> {
    const loaded = this.plugins.get(id)
    if (!loaded) return
    this.logger.info(`uninstalling plugin ${id}`)
    try {
      await loaded.plugin.deactivate?.()
    } catch (err) {
      this.logger.error(`plugin ${id} deactivate failed: ${(err as Error).message}`)
    }
    this.registry.removeByOwner(id)
    for (const [name, svc] of this.services) {
      if (svc.owner === id) this.services.delete(name)
    }
    this.plugins.delete(id)
  }

  listPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values())
  }

  /* ----------------------- 查询接口 ----------------------- */

  getExtensions<K extends ExtensionKind>(kind: K): ExtensionOfKind<K>[] {
    return this.registry.getAll(kind)
  }

  getExtension<K extends ExtensionKind>(kind: K, id: string): ExtensionOfKind<K> | undefined {
    return this.registry.get(kind, id)
  }

  /** 构造供扩展使用的运行时 API（最小接口，避免扩展耦合容器）。 */
  getApi(): AgentRuntimeAPI {
    return {
      getExtensions: (kind) => this.getExtensions(kind),
      getExtension: (kind, id) => this.getExtension(kind, id),
      config: this.config,
      secrets: this.secrets,
      logger: this.logger,
      createContext: () => this.createContext(),
    }
  }

  /** 取用运行时级服务（如知识库）。 */
  getService<T = unknown>(name: string): T | undefined {
    return this.services.get(name)?.impl as T | undefined
  }

  /** 构造注入到扩展实例的运行时上下文。 */
  createContext(): RuntimeContext {
    const services: Record<string, unknown> = {}
    for (const [name, svc] of this.services) services[name] = svc.impl
    return createRuntimeContext({
      runtime: this.getApi(),
      config: this.config,
      logger: this.logger,
      secrets: this.secrets,
      emit: (e) => this.emit(e),
      services,
    })
  }

  /* ----------------------- 会话（可对接执行） ----------------------- */

  /** 创建一个智能体会话。 */
  createSession(agentId: string, options: { sessionId?: string } = {}): AgentSession {
    const agent = this.registry.get('agent', agentId) as Agent | undefined
    if (!agent) {
      throw new Error(`agent not found: ${agentId} (installed: ${this.registry.getAll('agent').map((a) => a.id).join(', ')})`)
    }
    return new AgentSession({
      agent,
      sessionId: options.sessionId ?? `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      runtime: this,
    })
  }
}
