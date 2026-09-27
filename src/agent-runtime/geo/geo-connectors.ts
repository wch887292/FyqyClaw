/**
 * GEO 连接器 —— T2.4 GEO 自动化 agent（品牌投喂 + 多平台分发 + 收录排名查询）。
 *
 * 设计红线（呼应融合规划现实红线 #3：不自研分发平台 / 搜索引擎，护城河是「编排 + 安全 + 私有化」）：
 *  - 分发连接器：对接第三方内容分发平台（官网/公众号/知乎/小红书/产品社区/行业媒体），
 *    默认需人工确认，绝不自动群发。
 *  - 收录查询连接器：对接搜索引擎收录/排名查询 API，本地无密钥时回退 echo 占位（不伪造排名）。
 *  - 离线可跑：未配置真实第三方密钥时回退 Echo 占位，演示完整闭环，不真发、不真查。
 *
 * 未来接真实第三方：在 secrets 配置 geoDistributeEndpoint + geoDistributeKey（分发）、
 * geoRankEndpoint + geoRankKey（收录查询），并把 Http 提供器内的 TODO(接入点) 替换为真实请求。
 *
 * 署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 吴赐虹
 */
import type { Connector, ConnectorResult, RuntimeContext } from '../core/types'

/** 支持的分发/收录查询平台（可扩展）。 */
export type GeoPlatform =
  | '官网'
  | '公众号'
  | '知乎'
  | '小红书'
  | '产品社区'
  | '行业媒体'

export interface DistributeInput {
  content: string
  platform: GeoPlatform
  url?: string
}

export interface DistributeResult {
  ok: boolean
  published: boolean
  needsApproval: boolean
  platform: GeoPlatform
  reason?: string
  provider: 'echo' | 'remote'
}

export interface RankInput {
  brand: string
  keywords: string[]
  platform?: GeoPlatform
}

export interface RankItem {
  platform: GeoPlatform
  keyword: string
  indexed: boolean
  rank?: number
  note: string
}

export interface RankResult {
  ok: boolean
  brand: string
  items: RankItem[]
  provider: 'echo' | 'remote'
}

/**
 * 分发提供器抽象：本地 echo（占位）与远程第三方共用同一契约，
 * 让上层（geo.run 工作流 / 网关）无需感知背后是占位还是真实 API。
 */
export interface DistributeProvider {
  readonly mode: 'echo' | 'remote'
  distribute(input: DistributeInput): Promise<DistributeResult>
}

/** 收录查询提供器抽象。 */
export interface RankProvider {
  readonly mode: 'echo' | 'remote'
  rank(input: RankInput): Promise<RankResult>
}

/** 合规红线（GEO 分发口径），写入对外物料与闸门提示。 */
export const GEO_COMPLIANCE_POLICY = {
  requireHumanApproval: true,
  rateLimitPerDay: 5,
  rules: [
    '分发前必须由人工确认内容无误（默认不自动发布）',
    '不批量群发、不刷量；每日分发上限防滥用',
    '第三方分发 API 密钥本地保存，内容零出境',
    '收录查询只读公开索引，绝不伪造排名',
  ],
}

/* ------------------------------- Echo 离线占位 ------------------------------- */

/** 离线占位分发：无第三方密钥时演示完整流程，绝不真实发布。 */
export class EchoDistributeProvider implements DistributeProvider {
  readonly mode = 'echo' as const

  async distribute(input: DistributeInput): Promise<DistributeResult> {
    return {
      ok: true,
      published: false,
      needsApproval: true,
      platform: input.platform,
      reason:
        'echo 模式不接入真实第三方，且外发默认需人工确认，故不真实发布（仅记录待人工复核的分发计划）。',
      provider: 'echo',
    }
  }
}

/** 离线占位收录查询：无第三方密钥时演示结构，标注「未接入真实查询」。 */
export class EchoRankProvider implements RankProvider {
  readonly mode = 'echo' as const

  async rank(input: RankInput): Promise<RankResult> {
    const items: RankItem[] = input.keywords.map((kw) => ({
      platform: input.platform ?? '官网',
      keyword: kw,
      indexed: false,
      note:
        '（echo 占位）未接入搜索引擎收录查询 API，实际收录/排名需配置第三方查询密钥后返回真实数据，绝不伪造。',
    }))
    return { ok: true, brand: input.brand, items, provider: 'echo' }
  }
}

/* ------------------------------- 远程骨架（可对接真实第三方） ------------------------------- */

/** 远程第三方分发提供器骨架（MCP 接真实内容分发 API）。 */
export class HttpDistributeProvider implements DistributeProvider {
  readonly mode = 'remote' as const
  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
  ) {}

  async distribute(input: DistributeInput): Promise<DistributeResult> {
    // TODO(接入点)：在人工确认开关（geoAutoDistribute）经显式开启后，调用 this.endpoint 真实分发。
    // 出于合规闸门，当前默认仍返回「未发布，需人工确认」，避免误群发。
    void this.endpoint
    void this.apiKey
    return {
      ok: true,
      published: false,
      needsApproval: true,
      platform: input.platform,
      reason:
        '远程模式已对接第三方分发 API 骨架；出于合规闸门，真实分发需显式人工确认开关（geoAutoDistribute）开启。',
      provider: 'remote',
    }
  }
}

/** 远程第三方收录查询提供器骨架（MCP 接真实搜索引擎收录/排名 API）。 */
export class HttpRankProvider implements RankProvider {
  readonly mode = 'remote' as const
  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
  ) {}

  async rank(input: RankInput): Promise<RankResult> {
    // TODO(接入点)：把下方 echo 返回替换为对 this.endpoint 的真实请求（携带 Bearer this.apiKey），
    // 保持返回结构不变即可被 geo.run 工作流 / 网关直接复用。
    const echo = new EchoRankProvider()
    const r = await echo.rank(input)
    return { ...r, provider: 'remote' }
  }
}

/* ------------------------------- 连接器（可插拔 extension 点） ------------------------------- */

/**
 * GEO 分发连接器（可插拔 connector 扩展点，protocol='mcp'）。
 * 体现"可对接"：把外部内容分发能力以标准 Connector 契约接入运行时。
 */
export class GeoDistributeConnector implements Connector {
  readonly kind = 'connector' as const
  readonly id = 'connector-geo-distribute'
  readonly name = 'GEO 分发连接器（第三方内容分发平台）'
  readonly version = '1.0.0'
  readonly protocol = 'mcp' as const

  private provider: DistributeProvider = new EchoDistributeProvider()
  private readonly requireHumanApproval: boolean
  private readonly rateLimitPerDay: number
  private dailyCount = 0

  constructor(opts?: { requireHumanApproval?: boolean; rateLimitPerDay?: number }) {
    this.requireHumanApproval =
      opts?.requireHumanApproval ?? GEO_COMPLIANCE_POLICY.requireHumanApproval
    this.rateLimitPerDay = opts?.rateLimitPerDay ?? GEO_COMPLIANCE_POLICY.rateLimitPerDay
  }

  /** 注入真实第三方（在 runtime 激活时根据 secrets/config 调用）。 */
  bindRemote(endpoint: string, apiKey: string): void {
    if (endpoint && apiKey) this.provider = new HttpDistributeProvider(endpoint, apiKey)
  }

  async call(
    action: string,
    payload: Record<string, unknown>,
    ctx: RuntimeContext,
  ): Promise<ConnectorResult> {
    if (this.provider.mode === 'echo') {
      const ep =
        (ctx.secrets.get('geoDistributeEndpoint') as string) ||
        (ctx.config.geoDistributeEndpoint as string)
      const key =
        (ctx.secrets.get('geoDistributeKey') as string) || (ctx.config.geoDistributeKey as string)
      if (ep && key) this.bindRemote(ep, key)
    }

    try {
      if (action === 'distribute') {
        const content = String(payload.content ?? '')
        const platform = String(payload.platform ?? '官网') as GeoPlatform
        if (this.dailyCount >= this.rateLimitPerDay) {
          return { ok: false, error: `已达每日分发上限 ${this.rateLimitPerDay} 次（防滥用）` }
        }
        if (this.requireHumanApproval) {
          const result: DistributeResult = {
            ok: true,
            published: false,
            needsApproval: true,
            platform,
            reason:
              '外发需人工确认：当前为安全默认，未在 config.geoAutoDistribute=true 且经人工复核前不真实分发。',
            provider: this.provider.mode,
          }
          return { ok: true, data: result }
        }
        const r = await this.provider.distribute({ content, platform, url: payload.url ? String(payload.url) : undefined })
        if (r.published) this.dailyCount += 1
        return { ok: r.ok, data: r }
      }
      return { ok: false, error: `未知 GEO 分发动作：${action}` }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async listen(): Promise<() => void> {
    return () => {}
  }
}

/**
 * GEO 收录排名查询连接器（可插拔 connector 扩展点，protocol='mcp'）。
 * 只读公开索引，绝不伪造排名。
 */
export class GeoRankConnector implements Connector {
  readonly kind = 'connector' as const
  readonly id = 'connector-geo-rank'
  readonly name = 'GEO 收录排名查询连接器（搜索引擎收录/排名）'
  readonly version = '1.0.0'
  readonly protocol = 'mcp' as const

  private provider: RankProvider = new EchoRankProvider()

  constructor() {}

  /** 注入真实第三方（在 runtime 激活时根据 secrets/config 调用）。 */
  bindRemote(endpoint: string, apiKey: string): void {
    if (endpoint && apiKey) this.provider = new HttpRankProvider(endpoint, apiKey)
  }

  async call(
    action: string,
    payload: Record<string, unknown>,
    ctx: RuntimeContext,
  ): Promise<ConnectorResult> {
    if (this.provider.mode === 'echo') {
      const ep =
        (ctx.secrets.get('geoRankEndpoint') as string) || (ctx.config.geoRankEndpoint as string)
      const key =
        (ctx.secrets.get('geoRankKey') as string) || (ctx.config.geoRankKey as string)
      if (ep && key) this.bindRemote(ep, key)
    }

    try {
      if (action === 'rank') {
        const input: RankInput = {
          brand: String(payload.brand ?? 'FyqyClaw'),
          keywords: Array.isArray(payload.keywords)
            ? (payload.keywords as string[])
            : String(payload.keywords ?? '').split(/[,，\s]+/).filter(Boolean),
          platform: payload.platform ? (String(payload.platform) as GeoPlatform) : undefined,
        }
        const r = await this.provider.rank(input)
        return { ok: r.ok, data: r }
      }
      return { ok: false, error: `未知 GEO 收录查询动作：${action}` }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async listen(): Promise<() => void> {
    return () => {}
  }
}
