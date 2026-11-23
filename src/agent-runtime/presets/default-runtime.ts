/**
 * 默认运行时预设 —— 把内置插件接线成一个「开箱即用」的 FyqyClaw 智能体运行时。
 * 这是「可独立」特性的入口：任何 Node 应用 import 此函数即可得到完整运行时。
 */
import { AgentRuntime } from '../runtime/agent-runtime'
import { PluginLoader } from '../runtime/loader'
import { builtinPlugins } from '../builtins'
import { businessPlugin } from './business-agents'
import { knowledgeBasePlugin } from '../../knowledge-base/plugin'
import { MarketingConnector } from '../connectors/marketing-connector'
import { geoPlugin } from '../geo/geo-agent'
import { createSecurityPlugin } from '../platform/security-plugin'
import { createMarketPlugin } from '../platform/marketplace'
import { OpenAICompatProvider } from '../builtins/model-providers'
import type { Plugin } from '../core/types'

export interface FyqyRuntimeOptions {
  /** 外部 HTTP 端点（企业AI一站式平台 / 第三方）。 */
  httpEndpoint?: string
  /** 入站事件端点（无人值守运营）。 */
  inboundEndpoint?: string
  /** 知识库本地索引（内存态预置内容，key=标题）。 */
  knowledgeBase?: Record<string, string>
  /** 知识库本地数据目录（落盘持久化；零出境）。 */
  knowledgeDir?: string
  /** 多租户标识。 */
  tenantId?: string
  /** 默认模型提供器 id（缺省 model-echo）。 */
  modelProvider?: string
  /** 密钥（API Key 等）。 */
  secrets?: Record<string, string>
  /** MCP 调用桥接（对接现有 src/mcp/manager）。 */
  mcpBridge?: (tool: string, args: Record<string, unknown>) => Promise<unknown>
  /** GEO 物料目录（含 llms.txt / GEO-品牌事实页.md），供 T2.4 投喂技能真实读取。 */
  geoMaterialDir?: string
  /** 平台安全数据目录（团队账号 + 审计落盘，零出境）；不传则仅内存。 */
  securityDir?: string
  /**
   * 真实模型接入（OpenAI 兼容端点：本地 Ollama / 私有部署 / 公有云）。
   * 启动时探测端点可达性：可达 → 注册 model-openai-compat 并启用「真答」；
   * 不可达 → 诚实回落 model-echo 演示模型，不伪造回答。
   */
  openaiCompat?: { endpoint: string; models: string[]; name?: string }
}

/**
 * 探测 OpenAI 兼容端点是否可达（GET {endpoint}/models）。
 * 短超时快速失败，避免拖慢无模型环境下的启动。
 */
async function probeOpenAICompat(endpoint: string, timeoutMs = 2500): Promise<boolean> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/models`, { signal: ctrl.signal })
    clearTimeout(timer)
    return res.ok
  } catch {
    return false
  }
}

export async function createFyqyRuntime(opts: FyqyRuntimeOptions = {}): Promise<AgentRuntime> {
  // 真实模型接入（可插拔 model-provider 扩展点）：启动时探测，可达则用「真答」，不可达则诚实回落 echo
  let realModelPlugin: Plugin | null = null
  let modelProviderId = opts.modelProvider
  if (opts.openaiCompat?.endpoint) {
    const ep = opts.openaiCompat.endpoint
    const models =
      opts.openaiCompat.models.length > 0 ? opts.openaiCompat.models : ['qwen2.5-coder:1.5b']
    if (await probeOpenAICompat(ep)) {
      realModelPlugin = {
        manifest: {
          id: 'fyqy-real-model',
          name: opts.openaiCompat.name ?? 'Real Model (OpenAI-compat)',
          version: '1.0.0',
          description: `真实模型接入：${ep}（${models.join(', ')}），数据不出本地。`,
          author: '晋江市虹启智信息咨询工作室 · 飞扬研发中心（吴赐虹）',
          tags: ['model', 'openai-compat', 'local'],
        },
        activate(api) {
          api.register(new OpenAICompatProvider(ep, models, opts.openaiCompat?.name))
        },
      }
      modelProviderId = 'model-openai-compat'
      console.log(
        `[fyqy] 已接入真实模型服务 ${ep}（models: ${models.join(', ')}），试运行为「真答」模式`,
      )
    } else {
      console.warn(
        `[fyqy] 未探测到 OpenAI 兼容模型服务 ${ep}，回落 model-echo 演示模型（诚实降级，不伪造回答）`,
      )
    }
  }
  const secrets = new Map(Object.entries(opts.secrets ?? {}))
  const runtime = new AgentRuntime({
    config: {
      httpEndpoint: opts.httpEndpoint,
      inboundEndpoint: opts.inboundEndpoint,
      knowledgeBase: opts.knowledgeBase,
      knowledgeDir: opts.knowledgeDir,
      tenantId: opts.tenantId,
      modelProvider: modelProviderId,
      mcpBridge: opts.mcpBridge,
      geoMaterialDir: opts.geoMaterialDir,
      securityDir: opts.securityDir,
    },
    secrets: {
      get: (k) => secrets.get(k),
      set: (k, v) => {
        secrets.set(k, v)
      },
    },
  })
  const loader = new PluginLoader(runtime)
  // T2.3 营销数字员工：对接第三方数字人/短视频 API（不自研，合规闸门）
  const marketingConnectorPlugin: Plugin = {
    manifest: {
      id: 'fyqy-marketing-connector',
      name: '营销 MCP 连接器',
      version: '1.0.0',
      description: 'T2.3 营销数字员工：对接第三方数字人/短视频 API（不自研，合规闸门）。',
      author: '晋江市虹启智信息咨询工作室 · 飞扬研发中心（吴赐虹）',
      tags: ['marketing', 'mcp', 'connector'],
    },
    activate(api) {
      api.register(new MarketingConnector())
    },
  }
  // T3.2 平台安全与审计（团队账号 RBAC + 操作留痕，零出境落盘可选）
  const securityPlugin = createSecurityPlugin({ securityDir: opts.securityDir })
  // T3.4 数字员工市场（开放 plugin 生态，热插拔安装）
  const marketPlugin = createMarketPlugin()
  // 基座插件 + 数据中台（知识库）+ 业务数字员工 + 营销连接器 + GEO 自动化 + 平台安全/市场（开箱即用，体现「企业本地私有化智能体平台」定位）
  await loader.loadMany([
    ...builtinPlugins,
    knowledgeBasePlugin,
    businessPlugin,
    marketingConnectorPlugin,
    geoPlugin,
    securityPlugin,
    marketPlugin,
    ...(realModelPlugin ? [realModelPlugin] : []),
  ])
  return runtime
}
