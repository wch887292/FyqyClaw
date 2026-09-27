/**
 * Studio 工作台可运行验证 —— 实测七项：
 *  1) 对话式引导：一句大白话 → 员工草稿（角色/知识目录/风格/就绪判定）
 *  2) 零代码创建 → 数字员工热上线（运行时注册表立即可见）
 *  3) 试运行 → 真实跑一轮，返回回复 + 执行轨迹 + 知识库是否命中
 *  4) 安全闸门：不允许外发的角色，即使请求里开了外发也会被后端强制关闭
 *  5) 下线 → 插件卸载，运行时中扩展被回收
 *  6) 本地持久化 → 重启后自动重建（零出境）
 *  7) 网关端到端 → 真实 HTTP 打通 /studio 页面与 /api/studio/* 全部接口
 *
 * 运行：npx tsx src/agent-runtime/studio/demo.ts
 */
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createFyqyRuntime } from '../presets/default-runtime'
import { Studio } from './studio'
import { startGateway } from '../hosts/gateway'
import { normalizeDraft } from './studio-agent'
import type { KnowledgeBase } from '../../knowledge-base/knowledge-base'

function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`断言失败：${msg}`)
}

async function main(): Promise<void> {
  console.log('===== Studio 工作台验证开始 =====\n')

  const runtime = await createFyqyRuntime()
  const kb = runtime.getService<KnowledgeBase>('knowledgeBase')
  assert(kb, '知识库服务未注册')
  await kb!.ingest({
    category: '产品',
    title: 'FyqyClaw 产品与报价说明',
    permission: 'public',
    content:
      'FyqyClaw（飞扬企源AI）本地私有化智能体平台，标准版授权 3.8 万元起，含 5 个业务数字员工。\n' +
      '交付周期：签约后 5 个工作日内完成本地部署。售后提供 12 个月免费升级。',
  })

  const studio = new Studio(runtime)

  /* ---------------- 1) 对话式引导 ---------------- */
  console.log('【1】对话式引导（一句大白话 → 员工草稿）')
  const guided = studio.chat('做一个客服数字员工，读产品资料，回答客户询价，回复要简洁')
  console.log(guided.reply.split('\n').map((l) => '  ' + l).join('\n'))
  assert(guided.draft.role === 'customer-service', '角色应识别为客服')
  assert((guided.draft.categories ?? []).includes('产品'), '应识别出「产品」目录')
  assert(guided.draft.outputStyle === 'concise', '应识别出「简洁」风格')
  assert(guided.ready, '信息应已齐全可创建')
  console.log('  → 解析正确\n')

  /* ---------------- 2) 零代码创建（热上线） ---------------- */
  console.log('【2】零代码创建 → 热上线')
  const emp = await studio.create(guided.draft)
  console.log(`  ✓ 已上线：${emp.name}（${emp.agentId}）`)
  assert(emp.categories.includes('产品'), '知识目录应含产品')
  assert(runtime.getExtension('agent', emp.agentId), '运行时注册表应能查到该 agent')
  const before = runtime.getExtensions('agent').length
  console.log(`  当前运行时 agent 数：${before}\n`)

  /* ---------------- 3) 试运行 ---------------- */
  console.log('【3】试运行（真实跑一轮）')
  const run = await studio.tryRun(emp.id, '你们这个产品多少钱？多久能交付？')
  console.log(`  grounded=${run.grounded}`)
  for (const t of run.trace) console.log(`  · ${t.detail}`)
  console.log(`  回复：${run.reply.slice(0, 80).replace(/\n/g, ' ')}…`)
  assert(run.trace.some((t) => t.detail.includes('检索企业知识库')), '轨迹应含知识库检索')
  assert(run.grounded, '应检索到产品资料')
  assert(run.reply.length > 0, '应有回复文本')
  console.log()

  /* ---------------- 4) 安全闸门 ---------------- */
  console.log('【4】安全闸门（后端强制，不信任前端）')
  const forced = normalizeDraft({
    name: '越权合同员工',
    role: 'contract',
    scenario: '审合同',
    allowExternal: true, // 恶意/误操作：合同类不允许外发
    categories: ['合同法务'],
  })
  console.log(`  合同角色请求开启外发 → 实际结果：allowExternal=${forced.allowExternal}（应为 false）`)
  assert(forced.allowExternal === false, '合同类角色必须被强制关闭外发')
  const csForced = normalizeDraft({ name: '客服', role: 'customer-service', scenario: '答客户', allowExternal: true })
  assert(csForced.allowExternal === true, '客服角色应允许外发')
  console.log('  ✓ 闸门按角色生效\n')

  /* ---------------- 5) 下线 ---------------- */
  console.log('【5】下线（插件卸载 + 回收）')
  const ok = await studio.remove(emp.id)
  assert(ok, '下线应成功')
  assert(!runtime.getExtension('agent', emp.agentId), 'agent 应已从运行时回收')
  console.log(`  下线后运行时 agent 数：${runtime.getExtensions('agent').length}（原为 ${before}）`)
  console.log('  ✓ 热插拔闭环\n')

  /* ---------------- 6) 本地持久化 ---------------- */
  console.log('【6】本地持久化（零出境）')
  const dir = await mkdtemp(join(tmpdir(), 'fyqy-studio-'))
  const s1 = new Studio(runtime, { storeDir: dir })
  const saved = await s1.create({ name: '报销小飞', role: 'invoice', scenario: '核发票能否报销', categories: ['制度'] })
  const runtime2 = await createFyqyRuntime()
  const s2 = new Studio(runtime2, { storeDir: dir })
  const restored = await s2.load()
  console.log(`  写入 ${dir} → 重新加载 ${restored} 个数字员工`)
  assert(restored === 1, '应恢复 1 个数字员工')
  assert(runtime2.getExtension('agent', saved.agentId), '恢复后 agent 应已重新上线')
  console.log('  ✓ 重启可恢复\n')

  /* ---------------- 7) 网关端到端 ---------------- */
  console.log('【7】网关端到端（浏览器那条路）')
  const gw = await startGateway({ port: 8791, host: '127.0.0.1' })
  const base = `http://127.0.0.1:${gw.port}`
  try {
    const html = await (await fetch(`${base}/studio`)).text()
    console.log(`  GET /studio → ${html.length} 字节，含标题：${html.includes('数字员工工作台')}`)
    assert(html.includes('数字员工工作台'), '页面应含标题')

    const bp = (await (await fetch(`${base}/api/studio/blueprints`)).json()) as { roles: unknown[] }
    console.log(`  GET /api/studio/blueprints → ${bp.roles.length} 个角色`)
    assert(bp.roles.length >= 5, '至少 5 个角色')

    const chat = (await (
      await fetch(`${base}/api/studio/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: '帮我审采购合同的风险条款，读合同法务资料' }),
      })
    ).json()) as { draft: { role?: string }; ready: boolean }
    console.log(`  POST /api/studio/chat → 角色=${chat.draft.role} ready=${chat.ready}`)
    assert(chat.draft.role === 'contract', '应识别为合同角色')

    const created = (await (
      await fetch(`${base}/api/studio/employees`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          draft: { name: '网关合同小飞', role: 'contract', scenario: '审采购合同风险条款', categories: ['合同法务'] },
        }),
      })
    ).json()) as { employee: { id: string; agentId: string } }
    console.log(`  POST /api/studio/employees → ${created.employee.id}`)

    const list = (await (await fetch(`${base}/api/studio/employees`)).json()) as { employees: unknown[] }
    assert(list.employees.length === 1, '列表应有 1 个员工')

    const test = (await (
      await fetch(`${base}/api/studio/employees/${created.employee.id}/test`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: '这份采购合同付款条款有风险吗？' }),
      })
    ).json()) as { reply: string; trace: unknown[] }
    console.log(`  POST .../test → 回复 ${test.reply.length} 字 / 轨迹 ${test.trace.length} 条`)
    assert(test.reply.length > 0, '应有回复')

    const del = (await (
      await fetch(`${base}/api/studio/employees/${created.employee.id}`, { method: 'DELETE' })
    ).json()) as { ok: boolean }
    console.log(`  DELETE .../employees/:id → ok=${del.ok}`)
    assert(del.ok, '删除应成功')
  } finally {
    gw.close()
  }

  console.log('\n===== Studio 验证全部通过 =====')
}

main().catch((err) => {
  console.error('验证失败:', err)
  process.exit(1)
})
