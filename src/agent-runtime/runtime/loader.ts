/**
 * PluginLoader —— 插件加载器（可插拔的落地层）。
 *
 * 支持三种来源：
 *  1. 内存插件对象（内置 / 程序化注入）；
 *  2. 从已编译模块动态 import（热加载磁盘上的插件）；
 *  3. 批量加载。
 * 卸载统一委托给 AgentRuntime 的插件生命周期管理。
 */
import type { AgentRuntime } from './agent-runtime'
import type { Plugin } from '../core/types'

export class PluginLoader {
  constructor(private readonly runtime: AgentRuntime) {}

  async load(plugin: Plugin): Promise<void> {
    await this.runtime.installPlugin(plugin)
  }

  async loadMany(plugins: Plugin[]): Promise<void> {
    for (const p of plugins) await this.load(p)
  }

  /** 从模块动态加载插件（模块 default 导出 Plugin）。可对接磁盘热加载。 */
  async loadFromModule(specifier: string): Promise<void> {
    const mod = await import(specifier)
    const plugin: Plugin = mod.default ?? mod.plugin
    if (!plugin || typeof plugin.activate !== 'function') {
      throw new Error(`module ${specifier} does not export a Plugin`)
    }
    await this.load(plugin)
  }

  async unload(id: string): Promise<void> {
    await this.runtime.uninstallPlugin(id)
  }
}
