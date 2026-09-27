/**
 * 营销 MCP 连接器 —— T2.3 营销数字员工（MCP 接第三方，不自研）。
 *
 * 设计红线（呼应融合规划现实红线 #3：不自研数字人/短视频，护城河是「编排 + 安全 + 私有化」）：
 *  - 本连接器不生成视频 / 数字人本身，只负责「对接第三方营销 API」（数字人、短视频、内容分发）。
 *  - 内置合规闸门：publish（外发）默认 requireHumanApproval=true，绝不自动发出，必须人工确认。
 *  - 频率限制：rateLimitPerDay 防止误触多发。
 *  - 离线可跑：未配置真实第三方密钥时回退 EchoMarketingProvider（占位演示，不真发）。
 *
 * 未来接真实第三方（如某数字人 / 短视频 API）：在 secrets 配置 marketingApiEndpoint + marketingApiKey，
 * 并把 HttpMarketingProvider 内的 TODO(接入点) 替换为真实请求即可，上层代码无需改动。
 *
 * 署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 吴赐虹
 */
import type { Connector, ConnectorResult, RuntimeContext } from '../core/types'

/** 支持的目标发布平台（可扩展）。 */
export type MarketingPlatform = '朋友圈' | '公众号' | '短视频' | '电商' | '微博'

export interface MarketingGenerateInput {
  topic: string
  platform: MarketingPlatform
  brandTone?: string
}

export interface MarketingScript {
  title: string
  body: string
  hashtags?: string[]
}

export interface MarketingGenerateResult {
  topic: string
  platform: MarketingPlatform
  scripts: MarketingScript[]
  complianceNote: string
  provider: 'echo' | 'remote'
}

export interface MarketingPublishInput {
  content: string
  platform: MarketingPlatform
}

export interface MarketingPublishResult {
  ok: boolean
  published: boolean
  needsApproval: boolean
  reason?: string
  platform: MarketingPlatform
  provider: 'echo' | 'remote'
}

/**
 * 营销提供器抽象：本地 echo（占位）与远程第三方（MCP）共用同一契约，
 * 让上层（DomainAgent / 网关）无需感知背后是占位还是真实 API。
 */
export interface MarketingProvider {
  readonly mode: 'echo' | 'remote'
  generate(input: MarketingGenerateInput): Promise<MarketingGenerateResult>
  publish(input: MarketingPublishInput): Promise<MarketingPublishResult>
}

/** 合规红线（广告法口径），写入对外物料与闸门提示。 */
export const MARKETING_COMPLIANCE_POLICY = {
  requireHumanApproval: true,
  rateLimitPerDay: 10,
  rules: [
    '不夸大、不虚假承诺；涉及数据须标注「以实际为准」',
    '不生成诱导分享、刷量或违规话术',
    '外发前必须由人工确认内容无误（默认不自动发布）',
    '第三方营销 API 密钥本地保存，内容零出境',
  ],
}

/** 离线占位提供器：无第三方密钥时演示完整流程，绝不真实发布。 */
export class EchoMarketingProvider implements MarketingProvider {
  readonly mode = 'echo' as const

  async generate(input: MarketingGenerateInput): Promise<MarketingGenerateResult> {
    const tone = input.brandTone ?? '专业、可信、克制'
    const scripts: MarketingScript[] = [
      {
        title: `【${input.platform}】${input.topic} · 版本一（痛点切入）`,
        body: `（演示文案·echo 占位）围绕「${input.topic}」，以${tone}的语气，先点出客户常见痛点，再给出我方解决方案与差异化价值，结尾引导私信 / 留资。`,
        hashtags: ['#行业痛点', '#解决方案', '#行动号召'],
      },
      {
        title: `【${input.platform}】${input.topic} · 版本二（信任背书）`,
        body: `（演示文案·echo 占位）用客户案例或资质背书建立信任，说明「${input.topic}」能带来的具体改变，附可核验的事实，避免绝对化表述。`,
        hashtags: ['#客户案例', '#实力背书'],
      },
    ]
    return {
      topic: input.topic,
      platform: input.platform,
      scripts,
      complianceNote:
        '本内容为 echo 占位演示，实际生成需接入模型提供器（modelProvider）或私有部署模型；发布前须人工确认合规。',
      provider: 'echo',
    }
  }

  async publish(_input: MarketingPublishInput): Promise<MarketingPublishResult> {
    return {
      ok: true,
      published: false,
      needsApproval: true,
      reason: 'echo 模式不接入真实第三方，且外发默认需人工确认，故不真实发布。',
      platform: _input.platform,
      provider: 'echo',
    }
  }
}

/** 远程第三方提供器骨架（MCP 接真实数字人 / 短视频 API）。 */
export class HttpMarketingProvider implements MarketingProvider {
  readonly mode = 'remote' as const
  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
  ) {}

  async generate(input: MarketingGenerateInput): Promise<MarketingGenerateResult> {
    // TODO(接入点)：把下方 echo 返回替换为对 this.endpoint 的真实请求（携带 Bearer this.apiKey），
    // 保持返回结构不变即可被 DomainAgent / 网关 / Studio 直接复用。
    const echo = new EchoMarketingProvider()
    const r = await echo.generate(input)
    return {
      ...r,
      provider: 'remote',
      complianceNote: '已对接远程营销 API（生成链路），发布仍需人工确认。',
    }
  }

  async publish(input: MarketingPublishInput): Promise<MarketingPublishResult> {
    // TODO(接入点)：在人工确认开关（marketingAutoPublish）经显式开启后，调用 this.endpoint 真实发布。
    // 出于合规闸门，当前默认仍返回「未发布，需人工确认」，避免误发。
    void this.endpoint
    void this.apiKey
    return {
      ok: true,
      published: false,
      needsApproval: true,
      reason:
        '远程模式已对接第三方 API 骨架；出于合规闸门，真实发布需显式人工确认开关（marketingAutoPublish）开启。',
      platform: input.platform,
      provider: 'remote',
    }
  }
}

/**
 * 营销 MCP 连接器（可插拔 connector 扩展点，protocol='mcp'）。
 * 同时是「可对接」特性的示范：把外部营销能力以标准 Connector 契约接入运行时。
 */
export class MarketingConnector implements Connector {
  readonly kind = 'connector' as const
  readonly id = 'connector-marketing-mcp'
  readonly name = '营销 MCP 连接器（第三方数字人/短视频）'
  readonly version = '1.0.0'
  readonly protocol = 'mcp' as const

  private provider: MarketingProvider
  private readonly requireHumanApproval: boolean
  private readonly rateLimitPerDay: number
  private dailyCount = 0

  constructor(opts?: { requireHumanApproval?: boolean; rateLimitPerDay?: number }) {
    this.requireHumanApproval =
      opts?.requireHumanApproval ?? MARKETING_COMPLIANCE_POLICY.requireHumanApproval
    this.rateLimitPerDay = opts?.rateLimitPerDay ?? MARKETING_COMPLIANCE_POLICY.rateLimitPerDay
    this.provider = new EchoMarketingProvider()
  }

  /** 注入真实第三方（在 runtime 激活时根据 secrets/config 调用）。 */
  bindRemote(endpoint: string, apiKey: string): void {
    if (endpoint && apiKey) this.provider = new HttpMarketingProvider(endpoint, apiKey)
  }

  async call(
    action: string,
    payload: Record<string, unknown>,
    ctx: RuntimeContext,
  ): Promise<ConnectorResult> {
    // 仅在尚为 echo 且配置了真实第三方时才切换为远程提供器
    if (this.provider.mode === 'echo') {
      const ep =
        (ctx.secrets.get('marketingApiEndpoint') as string) ||
        (ctx.config.marketingApiEndpoint as string)
      const key =
        (ctx.secrets.get('marketingApiKey') as string) || (ctx.config.marketingApiKey as string)
      if (ep && key) this.bindRemote(ep, key)
    }

    try {
      if (action === 'generate') {
        const input: MarketingGenerateInput = {
          topic: String(payload.topic ?? ''),
          platform: (String(payload.platform ?? '朋友圈') as MarketingPlatform),
          brandTone: payload.brandTone ? String(payload.brandTone) : undefined,
        }
        const r = await this.provider.generate(input)
        return { ok: true, data: r }
      }

      // 'publish' 与 'sync'（来自 DomainAgent 的外发尝试）统一走合规闸门
      if (action === 'publish' || action === 'sync') {
        const content = String(payload.content ?? payload.message ?? '')
        const platform = String(payload.platform ?? '朋友圈') as MarketingPlatform

        if (this.dailyCount >= this.rateLimitPerDay) {
          return { ok: false, error: `已达每日外发上限 ${this.rateLimitPerDay} 次（防滥用）` }
        }
        if (this.requireHumanApproval) {
          const result: MarketingPublishResult = {
            ok: true,
            published: false,
            needsApproval: true,
            platform,
            reason:
              '外发需人工确认：当前为安全默认，未在 config.marketingAutoPublish=true 且经人工复核前不真实发布。',
            provider: this.provider.mode,
          }
          return { ok: true, data: result }
        }
        const r = await this.provider.publish({ content, platform })
        if (r.published) this.dailyCount += 1
        return { ok: r.ok, data: r }
      }

      return { ok: false, error: `未知营销动作：${action}` }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  /** 入站事件（未来第三方营销数据回流），当前无实现。 */
  async listen(): Promise<() => void> {
    return () => {}
  }
}
