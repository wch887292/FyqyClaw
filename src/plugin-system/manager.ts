import type { Plugin, PluginManifest, PluginAPI } from './types'

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private api: PluginAPI
  private pluginPath: string

  constructor(pluginPath: string = '') {
    this.pluginPath = pluginPath

    this.api = {
      registerCommand: (command, handler) => {
        console.log(`[Plugin] 注册命令: ${command}`)
        // TODO: 注册到命令系统
      },
      registerView: (viewId, component) => {
        console.log(`[Plugin] 注册视图: ${viewId}`)
        // TODO: 注册到视图系统
      },
      getWorkspacePath: () => undefined,
      getConfig: (key) => undefined,
      subscriptions: [],
    }
  }

  async loadPlugin(manifest: PluginManifest, factory: () => Plugin): Promise<void> {
    if (this.plugins.has(manifest.name)) {
      console.warn(`[Plugin] 插件 ${manifest.name} 已加载`)
      return
    }

    try {
      const plugin = factory()
      await plugin.activate(this.api)
      this.plugins.set(manifest.name, plugin)
      console.log(`[Plugin] 插件加载成功: ${manifest.name}@${manifest.version}`)
    } catch (error) {
      console.error(`[Plugin] 插件加载失败: ${manifest.name}`, error)
    }
  }

  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (!plugin) return

    try {
      await plugin.deactivate?.()
      this.api.subscriptions.forEach(sub => sub.dispose())
      this.plugins.delete(name)
      console.log(`[Plugin] 插件已卸载: ${name}`)
    } catch (error) {
      console.error(`[Plugin] 插件卸载失败: ${name}`, error)
    }
  }

  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)
  }

  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
  }
}