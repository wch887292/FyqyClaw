/**
 * 类型化扩展注册表 —— 可插拔能力的中央登记处。
 * 按 ExtensionKind 分桶存储，支持增删查与变更事件。
 */
import { EventEmitter } from 'node:events'
import type {
  AnyExtension,
  ExtensionKind,
  ExtensionOfKind,
} from '../core/types'

export class ExtensionRegistry {
  private readonly buckets = new Map<ExtensionKind, Map<string, AnyExtension>>()
  private readonly emitter = new EventEmitter()
  /** 记录每个扩展的所属插件 id，便于卸载时回收。 */
  private readonly owner = new Map<string, string>()

  constructor() {
    this.emitter.setMaxListeners(100)
  }

  /** 登记一个扩展；重复 id 将被覆盖（实现热替换）。 */
  add(extension: AnyExtension, pluginId?: string): void {
    const kind = extension.kind
    if (!this.buckets.has(kind)) this.buckets.set(kind, new Map())
    const bucket = this.buckets.get(kind)!
    bucket.set(extension.id, extension)
    if (pluginId) this.owner.set(extension.id, pluginId)
    this.emitter.emit('changed', { kind, id: extension.id, action: 'add' })
  }

  /** 移除指定扩展（通常由插件卸载触发）。 */
  remove(id: string): void {
    for (const [kind, bucket] of this.buckets) {
      if (bucket.has(id)) {
        bucket.delete(id)
        this.owner.delete(id)
        this.emitter.emit('changed', { kind, id, action: 'remove' })
        return
      }
    }
  }

  /** 移除某插件登记的全部扩展。 */
  removeByOwner(pluginId: string): string[] {
    const removed: string[] = []
    for (const [id, owner] of this.owner) {
      if (owner === pluginId) {
        this.remove(id)
        removed.push(id)
      }
    }
    return removed
  }

  get<K extends ExtensionKind>(kind: K, id: string): ExtensionOfKind<K> | undefined {
    return (this.buckets.get(kind)?.get(id) as ExtensionOfKind<K> | undefined) ?? undefined
  }

  getAll<K extends ExtensionKind>(kind: K): ExtensionOfKind<K>[] {
    return Array.from(this.buckets.get(kind)?.values() ?? []) as ExtensionOfKind<K>[]
  }

  /** 列出某插件登记的扩展 id。 */
  ownedBy(pluginId: string): string[] {
    return Array.from(this.owner.entries())
      .filter(([, owner]) => owner === pluginId)
      .map(([id]) => id)
  }

  /** 订阅注册表变更（用于热更新 UI / 网关路由）。 */
  onChanged(listener: (e: { kind: ExtensionKind; id: string; action: 'add' | 'remove' }) => void): void {
    this.emitter.on('changed', listener)
  }
}
