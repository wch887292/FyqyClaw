/**
 * GEO 自动化 Agent —— T2.4（品牌内容投喂 + 多平台分发 + 收录排名查询）封装为 SOLO 工作流。
 *
 * 交付物（呼应升级规划 T2.4）：
 *  - geo.feed 技能：真实读取品牌物料（llms.txt / GEO-品牌事实页.md），抽取品牌事实，产出结构化内容包。
 *  - geo.run 技能 / runGeoWorkflow：编排「投喂 → 多平台分发（合规闸门）→ 收录排名查询」的 SOLO 工作流。
 *  - geoPlugin：注册技能 + GEO 连接器 + 轻量定时调度器（默认注册 geo-daily 任务，禁用待启）。
 *
 * 现实红线：不自研分发平台 / 搜索引擎，只编排 + 守合规 + 私有化。分发默认需人工确认，绝不自动群发。
 *
 * 署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 吴赐虹
 */
import { existsSync, readFileSync } from 'node:fs'
import type { Plugin, PluginHostAPI, RuntimeContext, Skill, SkillResult } from '../core/types'
import {
  GeoDistributeConnector,
  GeoRankConnector,
  type GeoPlatform,
  type RankResult,
} from './geo-connectors'
import { GeoScheduler } from './scheduler'

/** 结构化品牌内容包（投喂产物）。 */
export interface BrandContentPackage {
  brand: string
  /** 从物料中抽取的关键事实（人话、可对外）。 */
  facts: string[]
  /** 一句话摘要（用于多平台分发的统一内容）。 */
  oneLiner: string
  /** 目标分发平台。 */
  platforms: GeoPlatform[]
  /** 物料来源文件路径。 */
  sources: string[]
  generatedAt: number
}

/** 一次 GEO 工作流的运行报告。 */
export interface GeoWorkflowReport {
  ok: boolean
  generatedAt: number
  brandPackage?: BrandContentPackage
  distribute: { platform: string; needsApproval: boolean; published: boolean; reason?: string }[]
  rank?: RankResult
  error?: string
}

/** 默认物料路径：优先用配置的 geoMaterialDir，否则退回进程工作目录。 */
function defaultMaterialPaths(dir?: string): string[] {
  const base = dir ?? process.cwd()
  return [`${base}/llms.txt`, `${base}/GEO-品牌事实页.md`]
}

/**
 * geo.feed —— 品牌内容投喂技能（真实读取物料，非占位）。
 * 把 llms.txt / GEO 品牌事实页 抽取为可复用的结构化内容包。
 */
export class GeoFeedSkill implements Skill {
  readonly kind = 'skill' as const
  readonly id = 'geo-feed'
  readonly name = 'GEO 品牌内容投喂'
  readonly version = '1.0.0'
  readonly category = 'geo'
  readonly description = '读取品牌事实物料（llms.txt / GEO 品牌事实页），产出结构化品牌内容包'

  async execute(input: Record<string, unknown>, ctx: RuntimeContext): Promise<SkillResult> {
    const dir = (input.dir as string) || (ctx.config.geoMaterialDir as string) || undefined
    const paths =
      Array.isArray(input.paths) && (input.paths as unknown[]).length > 0
        ? (input.paths as string[])
        : defaultMaterialPaths(dir)

    const facts: string[] = []
    const sources: string[] = []
    for (const p of paths) {
      if (!existsSync(p)) continue
      const text = readFileSync(p, 'utf8')
      sources.push(p)
      for (const line of text.split('\n')) {
        // 去掉 markdown 标题 / 列表符号，保留有信息量的短句作为事实
        const t = line
          .trim()
          .replace(/^#{1,6}\s*/, '')
          .replace(/^[-*]\s*/, '')
          .replace(/[*_`]/g, '')
        if (t.length >= 4 && t.length <= 200) facts.push(t)
      }
    }
    if (facts.length === 0) {
      return {
        ok: false,
        error: `未读取到任何品牌物料，请检查 geoMaterialDir / paths（当前目录：${dir ?? process.cwd()}）`,
      }
    }

    const pkg: BrandContentPackage = {
      brand: 'FyqyClaw（飞扬企源AI）',
      facts: facts.slice(0, 50),
      oneLiner: facts.slice(0, 3).join('；'),
      platforms: ['官网', '公众号', '知乎', '小红书', '产品社区', '行业媒体'],
      sources,
      generatedAt: Date.now(),
    }
    return { ok: true, output: pkg }
  }
}

/**
 * 核心编排：品牌投喂 → 多平台分发 → 收录排名查询。
 * 接收运行时上下文（RuntimeContext），便于技能与定时任务复用同一实现。
 */
export async function runGeoWorkflow(ctx: RuntimeContext): Promise<GeoWorkflowReport> {
  const feed = ctx.runtime.getExtension('skill', 'geo-feed')
  if (!feed) return { ok: false, generatedAt: Date.now(), distribute: [], error: 'geo-feed 技能未注册' }

  const fr = await feed.execute({}, ctx)
  if (!fr.ok) return { ok: false, generatedAt: Date.now(), distribute: [], error: fr.error }
  const pkg = fr.output as BrandContentPackage

  const distribute: GeoWorkflowReport['distribute'] = []
  const distConn = ctx.runtime.getExtension('connector', 'connector-geo-distribute')
  if (distConn) {
    for (const platform of pkg.platforms) {
      const r = await distConn.call('distribute', { content: pkg.oneLiner, platform }, ctx)
      const d = (r.data ?? {}) as { published: boolean; needsApproval: boolean; reason?: string }
      distribute.push({
        platform,
        needsApproval: d.needsApproval ?? true,
        published: d.published ?? false,
        reason: d.reason,
      })
    }
  }

  let rank: RankResult | undefined
  const rankConn = ctx.runtime.getExtension('connector', 'connector-geo-rank')
  if (rankConn) {
    const keywords = pkg.facts.slice(0, 5).map((f) => f.slice(0, 12))
    const rr = await rankConn.call('rank', { brand: pkg.brand, keywords }, ctx)
    rank = (rr.data ?? undefined) as RankResult | undefined
  }

  return { ok: true, generatedAt: Date.now(), brandPackage: pkg, distribute, rank }
}

/** geo.run —— 触发一次 GEO 工作流的技能（供网关 / 会话调用）。 */
export class GeoRunSkill implements Skill {
  readonly kind = 'skill' as const
  readonly id = 'geo-run'
  readonly name = 'GEO 自动化工作流'
  readonly version = '1.0.0'
  readonly category = 'geo'
  readonly description = '编排执行：品牌投喂 → 多平台分发 → 收录排名查询'

  async execute(_input: Record<string, unknown>, ctx: RuntimeContext): Promise<SkillResult> {
    const report = await runGeoWorkflow(ctx)
    return { ok: report.ok, output: report, error: report.error }
  }
}

/**
 * GEO 自动化插件（可插拔单元）。
 * 注册：2 个技能（feed/run）+ 2 个连接器（分发/收录）+ 1 个定时调度器服务（默认 geo-daily 任务，禁用）。
 */
export const geoPlugin: Plugin = {
  manifest: {
    id: 'fyqy-geo',
    name: 'GEO 自动化 Agent',
    version: '1.0.0',
    description: 'T2.4 GEO 自动化：品牌投喂 + 多平台分发 + 收录排名查询 SOLO 工作流 + 定时任务',
    author: '晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心（吴赐虹）',
    tags: ['geo', 'automation', 'solo-workflow'],
  },
  activate(api: PluginHostAPI): void {
    api.register(new GeoFeedSkill())
    api.register(new GeoRunSkill())
    api.register(new GeoDistributeConnector())
    api.register(new GeoRankConnector())

    const scheduler = new GeoScheduler()
    // 默认注册每日任务（每 6 小时），但禁用——由用户在面板/网关显式启动，避免误触外发
    scheduler.register({
      id: 'geo-daily',
      spec: 'GEO 工作流（品牌投喂 → 多平台分发 → 收录排名查询），每 6 小时',
      intervalMs: 6 * 3600 * 1000,
      // api.runtime 在类型上仅暴露 AgentRuntimeAPI，但运行时即真实实例，可安全创建上下文
      task: async () => {
        await runGeoWorkflow(api.runtime.createContext())
      },
    })
    api.registerService('geoScheduler', scheduler)
  },
}
