import type { Plugin, PluginManifest, PluginAPI } from './types'

interface RegisteredCommand {
  plugin: string
  handler: (...args: unknown[]) => unknown
}

interface RegisteredView {
  plugin: string
  component: unknown
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map()
  private api!: PluginAPI
  private commands: Map<string, RegisteredCommand> = new Map()
  private views: Map<string, RegisteredView> = new Map()
  private config: Map<string, unknown> = new Map()
  private pluginPath: string
  private workspaceResolver?: () => string | undefined

  constructor(pluginPath: string = '') {
    this.pluginPath = pluginPath

    this.api = {
      registerCommand: (command: string, handler: (...args: unknown[]) => unknown) => this.registerCommand(command, handler),
      registerView: (viewId: string, component: unknown) => this.registerView(viewId, component),
      getWorkspacePath: () => this.workspaceResolver?.() ?? (this.pluginPath || undefined),
      getConfig: (key: string) => this.config.get(key),
      subscriptions: [],
    }
  }

  /** 注入工作区根目录解析器（如读取当前打开的项目目录） */
  setWorkspaceResolver(resolver: () => string | undefined): void {
    this.workspaceResolver = resolver
  }

  /** 写入/读取插件可访问的配置项 */
  setConfig(key: string, value: unknown): void {
    this.config.set(key, value)
  }

  private registerCommand(command: string, handler: (...args: unknown[]) => unknown): void {
    const plugin = this.activeLoadingPlugin
    this.commands.set(command, { plugin: plugin || 'unknown', handler })
    console.log(`[Plugin] 注册命令: ${command}${plugin ? ` (来自 ${plugin})` : ''}`)
  }

  private registerView(viewId: string, component: unknown): void {
    const plugin = this.activeLoadingPlugin
    this.views.set(viewId, { plugin: plugin || 'unknown', component })
    console.log(`[Plugin] 注册视图: ${viewId}${plugin ? ` (来自 ${plugin})` : ''}`)
  }

  /** 执行已注册命令；未注册返回 undefined */
  executeCommand(command: string, ...args: unknown[]): unknown {
    const reg = this.commands.get(command)
    if (!reg) {
      console.warn(`[Plugin] 命令未注册: ${command}`)
      return undefined
    }
    return reg.handler(...args)
  }

  getCommands(): string[] {
    return Array.from(this.commands.keys())
  }

  getView(viewId: string): unknown {
    return this.views.get(viewId)?.component
  }

  getViews(): { id: string; plugin: string }[] {
    return Array.from(this.views.entries()).map(([id, v]) => ({ id, plugin: v.plugin }))
  }

  private activeLoadingPlugin?: string

  async loadPlugin(manifest: PluginManifest, factory: () => Plugin): Promise<void> {
    if (this.plugins.has(manifest.name)) {
      console.warn(`[Plugin] 插件 ${manifest.name} 已加载`)
      return
    }

    this.activeLoadingPlugin = manifest.name
    try {
      const plugin = factory()
      await plugin.activate(this.api)
      this.plugins.set(manifest.name, plugin)
      console.log(`[Plugin] 插件加载成功: ${manifest.name}@${manifest.version}`)
    } catch (error) {
      console.error(`[Plugin] 插件加载失败: ${manifest.name}`, error)
    } finally {
      this.activeLoadingPlugin = undefined
    }
  }

  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name)
    if (!plugin) return

    try {
      await plugin.deactivate?.()
      this.api.subscriptions.forEach(sub => sub.dispose())
      this.api.subscriptions = []
      // 清理该插件注册的命令与视图
      for (const [cmd, reg] of this.commands) {
        if (reg.plugin === name) this.commands.delete(cmd)
      }
      for (const [viewId, reg] of this.views) {
        if (reg.plugin === name) this.views.delete(viewId)
      }
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
