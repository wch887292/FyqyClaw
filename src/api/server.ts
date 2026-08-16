import type { ApiRoute, ApiRequest, ApiResponse, ApiConfig } from './types'
import { ModelAdapterManager } from '@model-adapter/manager'
import { AgentEngine } from '@orchestrator/agent/engine'
import { ContextManager } from '@orchestrator/context/context-manager'
import { CodeReviewEngine } from '@orchestrator/review/code-review'
import { SandboxManager } from '@sandbox/manager'
import { MCPServerManager } from '@mcp/manager'
import { SkillsManager } from '@skills/manager'

/**
 * ApiServer —— HTTP 接口编排层（实验性 / 当前未对外暴露）。
 *
 * 说明：本类定义了聊天、代码生成、审查、Agent 执行等路由，但**目前没有 listen()
 * 实现，也不会被任何入口实例化**。即 1.x 版本暂未提供对外 REST API 服务，
 * 请勿在生产环境依赖此模块。后续版本若启用，需先补齐：
 *   1) 基于 http/server 的真实监听与优雅关闭；
 *   2) 鉴权（authKey）强制校验与速率限制；
 *   3) 端口绑定的安全评估（仅本地回环 127.0.0.1）。
 */
export class ApiServer {
  private config: ApiConfig
  private routes: Map<string, ApiRoute> = new Map()
  private modelManager: ModelAdapterManager
  private agentEngine: AgentEngine
  private contextManager: ContextManager
  private codeReviewEngine: CodeReviewEngine
  private sandboxManager: SandboxManager
  private mcpManager: MCPServerManager
  private skillsManager: SkillsManager

  constructor(config?: Partial<ApiConfig>) {
    this.config = {
      port: 8080,
      authKey: '',
      enabled: false,
      ...config,
    }

    this.modelManager = new ModelAdapterManager()
    this.agentEngine = new AgentEngine()
    this.contextManager = new ContextManager()
    this.codeReviewEngine = new CodeReviewEngine()
    this.sandboxManager = new SandboxManager()
    this.mcpManager = new MCPServerManager()
    this.skillsManager = new SkillsManager()

    this.registerRoutes()
  }

  private registerRoutes(): void {
    // Chat completion
    this.registerRoute({
      path: '/api/v1/chat/completion',
      method: 'POST',
      handler: async (req) => {
        try {
          const { messages, model, stream } = req.body as any
          const result = await this.modelManager.complete({ messages, model, stream })
          return { code: 200, msg: 'success', data: result }
        } catch (error) {
          return { code: 500, msg: `推理失败: ${error}` }
        }
      },
      auth: true,
    })

    // Code generation
    this.registerRoute({
      path: '/api/v1/code/generate',
      method: 'POST',
      handler: async (req) => {
        try {
          const { description, language } = req.body as any
          const task = await this.agentEngine.executeTask(`生成${language}代码: ${description}`)
          return { code: 200, msg: 'success', data: task }
        } catch (error) {
          return { code: 500, msg: `代码生成失败: ${error}` }
        }
      },
      auth: true,
    })

    // Code review
    this.registerRoute({
      path: '/api/v1/code/review',
      method: 'POST',
      handler: async (req) => {
        try {
          const { diff, language, filePath } = req.body as any
          const results = await this.codeReviewEngine.review({ diff, language, filePath })
          return { code: 200, msg: 'success', data: results }
        } catch (error) {
          return { code: 500, msg: `代码审查失败: ${error}` }
        }
      },
      auth: true,
    })

    // Agent task execution
    this.registerRoute({
      path: '/api/v1/agent/run',
      method: 'POST',
      handler: async (req) => {
        try {
          const { description } = req.body as any
          const task = await this.agentEngine.executeTask(description)
          return { code: 200, msg: 'success', data: task }
        } catch (error) {
          return { code: 500, msg: `智能体任务执行失败: ${error}` }
        }
      },
      auth: true,
    })

    // Context loading
    this.registerRoute({
      path: '/api/v1/context/load',
      method: 'POST',
      handler: async (req) => {
        try {
          const { type, path } = req.body as any
          if (type === 'file') {
            const item = await this.contextManager.loadFileContext(path)
            return { code: 200, msg: 'success', data: item }
          } else if (type === 'folder') {
            const item = await this.contextManager.loadFolderContext(path)
            return { code: 200, msg: 'success', data: item }
          }
          return { code: 400, msg: '不支持的上下文类型' }
        } catch (error) {
          return { code: 500, msg: `上下文加载失败: ${error}` }
        }
      },
      auth: true,
    })

    // Model switch
    this.registerRoute({
      path: '/api/v1/model/switch',
      method: 'POST',
      handler: async (req) => {
        try {
          const { model, provider, apiKey, endpoint } = req.body as any
          if (model && provider) {
            this.modelManager.configureCustomModel({
              provider,
              modelName: model,
              apiKey,
              endpoint,
            })
          }
          if (model) {
            this.modelManager.setDefaultModel(model)
          }
          return { code: 200, msg: '模型切换成功' }
        } catch (error) {
          return { code: 500, msg: `模型切换失败: ${error}` }
        }
      },
      auth: true,
    })

    // Privacy mode config
    this.registerRoute({
      path: '/api/v1/security/privacy',
      method: 'POST',
      handler: async (req) => {
        try {
          const { enabled } = req.body as any
          this.sandboxManager.setPrivacyMode(enabled)
          return { code: 200, msg: `隐私模式已${enabled ? '开启' : '关闭'}` }
        } catch (error) {
          return { code: 500, msg: `配置失败: ${error}` }
        }
      },
      auth: true,
    })

    // MCP tool registration
    this.registerRoute({
      path: '/api/v1/mcp/register',
      method: 'POST',
      handler: async (req) => {
        try {
          const { id, name, transport, endpoint, command, args, permissions } = req.body as any
          const success = await this.mcpManager.registerServer({
            id: id || `mcp-${Date.now()}`,
            name: name || 'MCP Server',
            transport: transport || 'http',
            endpoint,
            command,
            args,
            enabled: true,
            permissions: permissions || {
              allowNetwork: true,
              allowFileAccess: false,
              allowCommandExecution: false,
              riskLevel: 'medium',
            },
          })
          return { code: 200, msg: success ? 'MCP 工具注册成功' : 'MCP 工具已存在', data: { success } }
        } catch (error) {
          return { code: 500, msg: `MCP 注册失败: ${error}` }
        }
      },
      auth: true,
    })

    // Skills install
    this.registerRoute({
      path: '/api/v1/skills/install',
      method: 'POST',
      handler: async (req) => {
        try {
          const { skillId, source, filePath } = req.body as any
          let success = false
          if (source === 'marketplace') {
            success = await this.skillsManager.installFromMarketplace(skillId)
          } else if (source === 'local') {
            success = await this.skillsManager.importLocalSkill(filePath)
          }
          return { code: 200, msg: '技能安装成功', data: { success } }
        } catch (error) {
          return { code: 500, msg: `技能安装失败: ${error}` }
        }
      },
      auth: true,
    })
  }

  registerRoute(route: ApiRoute): void {
    const key = `${route.method}:${route.path}`
    this.routes.set(key, route)
  }

  async handleRequest(method: string, path: string, req: Partial<ApiRequest>): Promise<ApiResponse> {
    const key = `${method.toUpperCase()}:${path}`
    const route = this.routes.get(key)

    if (!route) {
      return { code: 404, msg: '接口不存在' }
    }

    // Auth check
    if (route.auth && this.config.authKey) {
      const authHeader = req.headers?.authorization || req.headers?.['x-api-key'] || ''
      if (authHeader !== `Bearer ${this.config.authKey}` && authHeader !== this.config.authKey) {
        return { code: 401, msg: '未授权访问' }
      }
    }

    try {
      return await route.handler({
        body: req.body,
        params: {},
        query: {},
        headers: req.headers || {},
      })
    } catch (error) {
      return { code: 500, msg: `服务器内部错误: ${error}` }
    }
  }

  getRoutes(): ApiRoute[] {
    return Array.from(this.routes.values())
  }
}