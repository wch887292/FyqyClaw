/**
 * 知识库（数据中台）可运行验证 —— 实测五项能力：
 *  1) 五类目录入库与自动分块
 *  2) RAG 检索（BM25，带出处）
 *  3) 权限分级闸门（confidential 资料对 internal 密级调用方不可见）
 *  4) 抗幻觉（无资料时 grounded=false 并给出「不得编造」提示）
 *  5) 技能化调用（kb.ingest / kb.query / kb.stats 经运行时技能注册表执行）
 *
 * 运行：npx tsx src/knowledge-base/demo.ts
 */
import { createFyqyRuntime } from '../agent-runtime/presets/default-runtime'
import { KnowledgeBase } from './knowledge-base'
import type { AgentEvent, Skill } from '../agent-runtime/core/types'

const SAMPLE_DOCS = [
  {
    category: '制度',
    title: '员工考勤与休假管理办法',
    permission: 'internal',
    content: `第一条 公司实行标准工时制，每日工作 8 小时，每周 40 小时。
第二条 上班时间为上午 9:00 至下午 18:00，午休 12:00 至 13:00。
第三条 员工迟到 30 分钟以内计迟到，每月累计迟到超过 3 次扣发当月全勤奖。
第四条 员工依法享有年休假，入职满 1 年不满 10 年者年休假 5 天，满 10 年不满 20 年者 10 天。`,
  },
  {
    category: '产品',
    title: 'FyqyClaw 企业本地私有化智能体平台产品说明',
    permission: 'public',
    content: `FyqyClaw（飞扬企源AI）是一款可插拔、可独立、可对接的企业本地私有化智能体平台。
平台支持私有化部署，数据本地存储、不上公有云，满足政企数据主权与合规要求。
内置业务数字员工覆盖客服应答、合同审查、发票报销、简历筛选、营销文案五大场景。
平台提供 OpenAI 兼容网关，第三方可零改造接入。`,
  },
  {
    category: '客户',
    title: '泉州鞋材行业客户合作纪要',
    permission: 'confidential',
    content: `本次与泉州某鞋材制造企业达成合作意向，试点其客服与合同审查数字员工。
客户核心诉求为降低人工客服成本并提升合同风险识别率。合同金额与折扣信息另行签署保密附件。`,
  },
  {
    category: '培训',
    title: '新员工入职培训手册',
    permission: 'internal',
    content: `欢迎加入！入职第一周需完成：1) 参观厂区与安全培训；2) 熟悉公司规章制度；
3) 由导师带教熟悉岗位职责；4) 完成入职考核。安全培训未通过者不得进入生产车间。`,
  },
  {
    category: '合同法务',
    title: '采购合同审查要点',
    permission: 'internal',
    content: `采购合同审查要点：一、核查对方主体资格与经营范围；二、明确标的、数量、质量与验收标准；
三、约定价款、支付方式与发票类型；四、关注违约责任与争议解决条款；五、警惕预付款比例过高的条款。`,
  },
] as const

async function main(): Promise<void> {
  console.log('===== 知识库（数据中台）验证开始 =====\n')
  const runtime = await createFyqyRuntime()

  // 插件应已把知识库注册为运行时服务
  const kb = runtime.getService<KnowledgeBase>('knowledgeBase')
  if (!kb) throw new Error('知识库服务未注册')

  console.log('【1】五类目录入库与自动分块')
  for (const doc of SAMPLE_DOCS) {
    const created = await kb.ingest({ ...doc, source: 'demo', tags: ['demo'] })
    console.log(`  ✓ [${created.category}] ${created.title} → ${created.chunkCount} 块`)
  }
  const stats = kb.getStats()
  console.log('  统计:', JSON.stringify(stats), '\n')

  console.log('【2】RAG 检索（带出处）')
  const r1 = kb.retrieve('年休假有几天？', { topK: 3 })
  console.log(`  查询「年休假有几天？」 grounded=${r1.grounded} 命中=${r1.hits.length}`)
  for (const h of r1.hits) {
    console.log(`    - [${h.category}] ${h.title} (score=${h.score})`)
  }
  console.log()

  console.log('【3】权限分级闸门')
  // 精确验证：限定「客户」目录（该目录仅有一篇 confidential 资料），
  // 排除其它 internal/public 文档的干扰命中。
  const withClearanceInternal = kb.retrieve('泉州鞋材客户合作', {
    category: '客户',
    topK: 3,
    clearance: 'internal',
  })
  const withClearanceConfidential = kb.retrieve('泉州鞋材客户合作', {
    category: '客户',
    topK: 3,
    clearance: 'confidential',
  })
  console.log(`  internal 密级查询客户目录 → 命中 ${withClearanceInternal.hits.length}（应为 0，客户资料为 confidential）`)
  console.log(`  confidential 密级查询客户目录 → 命中 ${withClearanceConfidential.hits.length}（应 > 0）`)
  if (withClearanceInternal.hits.length !== 0) {
    throw new Error('权限闸门失效：internal 密级不应看到 confidential 资料')
  }
  if (withClearanceConfidential.hits.length === 0) {
    throw new Error('权限闸门失效：confidential 密级应能看到客户资料')
  }
  console.log()

  console.log('【4】抗幻觉（无资料如实告知）')
  const r4 = kb.retrieve('我们公司在火星的分公司怎么报销宇宙飞船燃料？', { topK: 3, minScore: 0.5 })
  console.log(`  grounded=${r4.grounded}（应为 false）`)
  if (r4.grounded) throw new Error('抗幻觉失效：无关问题不应命中')
  console.log()

  console.log('【5】技能化调用（经运行时注册表）')
  const ctx = runtime.createContext()
  const querySkill = runtime.getExtension('skill', 'kb.query') as Skill | undefined
  if (!querySkill) throw new Error('kb.query 技能未注册')
  const skillResult = await querySkill.execute({ query: '采购合同要审查哪些要点？', topK: 2 }, ctx)
  const out = skillResult.output as { grounded: boolean; hitCount: number; note?: string }
  console.log(`  kb.query 经技能调用 → ok=${skillResult.ok} grounded=${out.grounded} hits=${out.hitCount}`)
  console.log(`  调用后服务列表包含: ${Object.keys(ctx.services ?? {}).join(', ')}`)
  console.log()

  console.log('【6】本地持久化（零出境）')
  const { mkdtemp } = await import('node:fs/promises')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = await mkdtemp(join(tmpdir(), 'fyqy-kb-'))
  const kbA = new KnowledgeBase({ dataDir: dir })
  await kbA.ingest({ category: '制度', title: '临时制度', content: '这是一条用于验证本地落盘的制度内容。' })
  const kbB = new KnowledgeBase({ dataDir: dir })
  const loaded = await kbB.load()
  console.log(`  写入 ${dir}`)
  console.log(`  重新加载 → ${loaded} 篇（应为 1），检索命中 ${kbB.retrieve('临时制度').hits.length}`)
  if (loaded !== 1) throw new Error('持久化失效：重新加载未读到资料')
  console.log()

  console.log('【7】数据中台 → 业务数字员工联动')
  await kb.ingest({
    category: '制度',
    title: '差旅与费用报销制度',
    permission: 'internal',
    content:
      '第一条 报销凭证须为发票或财政票据，抬头必须为公司全称，个人抬头的餐饮发票一律不予报销。\n' +
      '第二条 差旅住宿标准：一线城市不超过 500 元/晚，其他城市不超过 350 元/晚。\n' +
      '第三条 单笔报销 5000 元以上须经部门负责人与财务负责人双签。',
  })
  const session = runtime.createSession('agent-invoice')
  const events: AgentEvent[] = []
  for await (const ev of session.send('这张餐饮发票抬头是个人不是公司，能报销吗？')) events.push(ev)
  const call = events.find((e) => e.type === 'skill.call' && e.skillId === 'kb.query')
  const result = events.find((e) => e.type === 'skill.result' && e.skillId === 'kb.query') as
    | { ok: boolean; output?: { grounded?: boolean; hitCount?: number } }
    | undefined
  console.log(`  会话 agent-invoice 触发 kb.query：${call ? '是' : '否'}`)
  console.log(`  检索结果 grounded=${result?.output?.grounded} hits=${result?.output?.hitCount}`)
  if (!call) throw new Error('联动失效：业务数字员工未调用知识库')
  if (!result?.output?.grounded) throw new Error('联动失效：应检索到报销制度却未命中')
  console.log()

  console.log('===== 知识库验证全部通过 =====')
}

main().catch((err) => {
  console.error('验证失败:', err)
  process.exit(1)
})
