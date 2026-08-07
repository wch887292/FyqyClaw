export interface PluginManifest {
  name: string
  version: string
  description: string
  author: string
  main: string
  activationEvents?: string[]
  contributes?: {
    commands?: PluginCommand[]
    menus?: PluginMenu[]
    views?: PluginView[]
  }
}

export interface PluginCommand {
  command: string
  title: string
  category?: string
}

export interface PluginMenu {
  command: string
  group: string
  when?: string
}

export interface PluginView {
  id: string
  name: string
  type: 'sidebar' | 'panel' | 'editor'
}

export interface Plugin {
  manifest: PluginManifest
  activate(context: PluginAPI): Promise<void>
  deactivate?(): Promise<void>
}

export interface PluginAPI {
  registerCommand(command: string, handler: (...args: unknown[]) => unknown): void
  registerView(viewId: string, component: unknown): void
  getWorkspacePath(): string | undefined
  getConfig(key: string): unknown
  subscriptions: { dispose(): void }[]
}