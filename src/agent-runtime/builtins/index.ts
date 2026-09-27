/**
 * 内置插件包 —— 把内置扩展打包成可插拔的 Plugin 单元。
 * 宿主通过 PluginLoader.loadMany(builtinPlugins) 一键装载，亦可按需只装部分。
 */
import type { Plugin } from '../core/types'
import { EchoProvider, OpenAICompatProvider } from './model-providers'
import { HttpConnector, McpBridgeConnector } from './connectors'
import { KnowledgeSkill, NotifySkill } from './skills'
import { SoloAgent } from './agents'

/** 模型提供器插件：内置 Echo（离线）+ 可选的 OpenAI 兼容（需配置）。 */
export const modelPlugin: Plugin = {
  manifest: {
    id: 'builtin-models',
    name: 'Built-in Model Providers',
    version: '1.0.0',
    author: 'FyqyClaw',
  },
  activate(api) {
    api.register(new EchoProvider())
    // 生产环境示例（注释掉以免无网络时尝试连接）：
    // api.register(new OpenAICompatProvider('http://localhost:11434/v1', ['qwen2.5:7b'], 'Ollama'))
  },
}

/** 连接器插件：HTTP + MCP 桥接。 */
export const connectorPlugin: Plugin = {
  manifest: {
    id: 'builtin-connectors',
    name: 'Built-in Connectors',
    version: '1.0.0',
    author: 'FyqyClaw',
  },
  activate(api) {
    api.register(new HttpConnector())
    // MCP 桥接：把真实调用委托给现有 src/mcp/manager（由宿主注入 delegate）
    api.register(
      new McpBridgeConnector(async (tool, args) => {
        const mgr = (api.runtime.config.mcpBridge as ((t: string, a: Record<string, unknown>) => Promise<unknown>) | undefined)
        if (!mgr) throw new Error('mcpBridge not configured')
        return mgr(tool, args)
      }),
    )
  },
}

/** 技能插件：知识库问答 + 外部通知。 */
export const skillPlugin: Plugin = {
  manifest: {
    id: 'builtin-skills',
    name: 'Built-in Skills',
    version: '1.0.0',
    author: 'FyqyClaw',
  },
  activate(api) {
    api.register(new KnowledgeSkill())
    api.register(new NotifySkill())
  },
}

/** 智能体插件：SOLO Agent。 */
export const agentPlugin: Plugin = {
  manifest: {
    id: 'builtin-agents',
    name: 'Built-in Agents',
    version: '1.0.0',
    author: 'FyqyClaw',
  },
  activate(api) {
    api.register(new SoloAgent())
  },
}

/** 全部内置插件（默认装载集合）。 */
export const builtinPlugins: Plugin[] = [
  modelPlugin,
  connectorPlugin,
  skillPlugin,
  agentPlugin,
]
