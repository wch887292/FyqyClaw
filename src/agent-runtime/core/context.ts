/**
 * 运行时上下文基础设施：日志、密钥、上下文构造器。
 * 纯 Node 实现，无 Electron 依赖。
 */
import type { AgentEvent, Logger, RuntimeContext, SecretStore } from './types'

export class SimpleLogger implements Logger {
  constructor(private readonly scope = 'agent-runtime') {}

  info(message: string): void {
    // eslint-disable-next-line no-console
    console.log(`[${this.scope}] INFO  ${message}`)
  }
  warn(message: string): void {
    // eslint-disable-next-line no-console
    console.warn(`[${this.scope}] WARN  ${message}`)
  }
  error(message: string): void {
    // eslint-disable-next-line no-console
    console.error(`[${this.scope}] ERROR ${message}`)
  }
}

export class MemorySecretStore implements SecretStore {
  private readonly store = new Map<string, string>()

  get(key: string): string | undefined {
    return this.store.get(key)
  }
  set(key: string, value: string): void {
    this.store.set(key, value)
  }
}

export interface ContextDeps {
  runtime: RuntimeContext['runtime']
  config: Record<string, unknown>
  logger?: Logger
  secrets?: SecretStore
  emit: (event: AgentEvent) => void
  services?: Record<string, unknown>
}

/** 构造一个注入到扩展的运行时上下文。 */
export function createRuntimeContext(deps: ContextDeps): RuntimeContext {
  const logger = deps.logger ?? new SimpleLogger()
  const secrets = deps.secrets ?? new MemorySecretStore()
  return {
    runtime: deps.runtime,
    config: deps.config,
    logger,
    secrets,
    emit: deps.emit,
    services: deps.services,
  }
}
