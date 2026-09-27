/**
 * HTTP 网关宿主 —— 让智能体运行时「可独立托管」且「可对接」任意外部系统。
 *
 * 对外暴露：
 *  - GET  /health                         健康检查
 *  - GET  /meta                           运行时元数据（agents/skills/connectors/plugins）—— 可插拔可见性
 *  - POST /sessions                       创建会话 {agentId} -> {sessionId}
 *  - POST /sessions/:id/messages          发送消息，SSE 流式返回原生事件
 *  - POST /v1/chat/completions            OpenAI 兼容接口（SSE），第三方零改造接入
 *  - GET  /studio                         数字员工工作台（非技术用户零代码界面）
 *  - GET  /api/studio/blueprints          可选角色 / 知识目录 / 输出风格
 *  - GET  /api/studio/employees           已上线数字员工
 *  - POST /api/studio/chat                对话式引导：大白话 → 员工草稿
 *  - POST /api/studio/employees           创建并热上线数字员工
 *  - DELETE /api/studio/employees/:id     下线数字员工
 *  - POST /api/studio/employees/:id/test  试运行
 *  - GET  /kb                             知识库管理面板（喂资料）
 *  - GET  /api/kb/categories|stats|docs   目录 / 统计 / 资料清单
 *  - POST /api/kb/docs                    录入资料（自动分块入库）
 *  - DELETE /api/kb/docs/:id              删除资料
 *  - POST /api/kb/search                  检索测试（验证资料能否被查到）
 *  - POST /api/marketing/generate         营销文案生成（主题+平台→多版本文案+合规提示）
 *  - POST /api/marketing/publish          营销内容外发（受人工确认闸门，默认不真发）
 *  - GET  /geo                              GEO 自动化工作台（品牌投喂+分发+收录查询+定时任务）
 *  - POST /api/geo/feed                    品牌内容投喂（真读物料→结构化内容包）
 *  - POST /api/geo/run                     跑一次 GEO 工作流（投喂→分发→收录查询）
 *  - GET  /api/geo/schedule                 定时任务状态
 *  - POST /api/geo/schedule/start|stop|run  启停 / 立即执行定时任务
 *
 * 零外部依赖，仅用 Node 内置 http，可直接部署为独立服务。
 */
import { createServer, IncomingMessage, ServerResponse } from 'node:http'
import { createFyqyRuntime } from '../presets/default-runtime'
import { Studio } from '../studio/studio'
import { STUDIO_HTML } from '../studio/ui'
import { KnowledgeConsole } from '../../knowledge-base/console'
import { CONSOLE_HTML } from '../../knowledge-base/console-ui'
import { GEO_HTML } from '../geo/ui'
import { runGeoWorkflow, type GeoWorkflowReport } from '../geo/geo-agent'
import { PLATFORM_HTML } from '../platform/ui'
import type { TeamAuth, Role } from '../platform/auth'
import type { AuditLog } from '../platform/audit'
import type { Marketplace } from '../platform/marketplace'
import type { KnowledgeBase } from '../../knowledge-base/knowledge-base'
import type { IngestInput, KnowledgePermission } from '../../knowledge-base/types'
import type { AgentRuntime } from '../runtime/agent-runtime'
import type { DigitalEmployeeDraft } from '../studio/types'

export interface GatewayOptions {
  port?: number
  host?: string
  /** Studio 数字员工定义持久化目录（不传则随进程内存）。 */
  studioDir?: string
  /** 知识库数据目录（不传则仅内存；传入则资料落本地磁盘，零出境）。 */
  kbDir?: string
  /** GEO 物料目录（含 llms.txt / GEO 品牌事实页.md），供 T2.4 投喂技能真实读取。 */
  geoMaterialDir?: string
  /** 平台安全数据目录（团队账号 + 审计落盘，零出境）；不传则仅内存。 */
  securityDir?: string
}

export async function startGateway(opts: GatewayOptions = {}): Promise<{
  close: () => void
  port: number
  studio: Studio
  kbConsole: KnowledgeConsole
  runtime: AgentRuntime
}> {
  const runtime = await createFyqyRuntime({
    knowledgeDir: opts.kbDir,
    geoMaterialDir: opts.geoMaterialDir,
    securityDir: opts.securityDir,
  })
  const studio = new Studio(runtime, { storeDir: opts.studioDir })
  await studio.load()
  const kb = runtime.getService<KnowledgeBase>('knowledgeBase')
  if (!kb) throw new Error('知识库服务未注册，无法启动网关')
  const kbConsole = new KnowledgeConsole(kb)
  const port = opts.port ?? 8787
  const host = opts.host ?? '0.0.0.0'

  const server = createServer((req, res) => {
    handle(req, res, runtime, studio, kbConsole).catch((err) => {
      res.statusCode = 500
      res.end(JSON.stringify({ error: (err as Error).message }))
    })
  })

  await new Promise<void>((resolve) => server.listen(port, host, resolve))
  return {
    port,
    close: () => new Promise<void>((r) => server.close(() => r())),
    studio,
    kbConsole,
    runtime,
  }
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw) return {}
  return JSON.parse(raw)
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(data))
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  runtime: AgentRuntime,
  studio: Studio,
  kbConsole: KnowledgeConsole,
): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
  const path = url.pathname
  const method = req.method ?? 'GET'
  const token =
    typeof req.headers['x-auth-token'] === 'string'
      ? (req.headers['x-auth-token'] as string)
      : undefined

  // T3 平台服务（权限/审计/市场）
  const authSvc = runtime.getService<TeamAuth>('teamAuth')
  const auditSvc = runtime.getService<AuditLog>('auditLog')
  const marketplaceSvc = runtime.getService<Marketplace>('marketplace')
  const recordAudit = (action: string, resource: string, detail: string, ok: boolean): void => {
    const actor = authSvc?.getActorName(token) ?? 'anonymous'
    auditSvc?.record({ actor, action, resource, detail, ok })
  }

  if (method === 'GET' && path === '/health') {
    res.end(JSON.stringify({ ok: true, runtime: 'fyqyclaw-agent-runtime' }))
    return
  }

  if (method === 'GET' && path === '/meta') {
    res.setHeader('content-type', 'application/json')
    res.end(
      JSON.stringify({
        agents: runtime.getExtensions('agent').map((a) => ({ id: a.id, name: a.name })),
        skills: runtime.getExtensions('skill').map((s) => ({ id: s.id, name: s.name })),
        connectors: runtime.getExtensions('connector').map((c) => ({ id: c.id, protocol: c.protocol })),
        modelProviders: runtime.getExtensions('model-provider').map((m) => ({ id: m.id, models: m.models })),
        plugins: runtime.listPlugins().map((p) => ({ id: p.manifest.id, name: p.manifest.name })),
      }),
    )
    return
  }

  /* ------------------------- Studio（零代码工作台） ------------------------- */

  if (method === 'GET' && (path === '/studio' || path === '/studio/')) {
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.end(STUDIO_HTML)
    return
  }

  if (method === 'GET' && path === '/api/studio/blueprints') {
    sendJson(res, studio.listBlueprints())
    return
  }

  if (method === 'GET' && path === '/api/studio/employees') {
    sendJson(res, { employees: studio.listEmployees() })
    return
  }

  if (method === 'POST' && path === '/api/studio/chat') {
    const body = (await readBody(req)) as { text?: string; draft?: Partial<DigitalEmployeeDraft> }
    if (!body.text) {
      sendJson(res, { error: '缺少 text' }, 400)
      return
    }
    sendJson(res, studio.chat(body.text, body.draft ?? {}))
    return
  }

  if (method === 'POST' && path === '/api/studio/employees') {
    const body = (await readBody(req)) as { draft?: Partial<DigitalEmployeeDraft> }
    try {
      const employee = await studio.create(body.draft ?? {})
      recordAudit('studio:create', `employee:${employee.id}`, `工作台创建数字员工 ${employee.name}`, true)
      sendJson(res, { employee }, 201)
    } catch (err) {
      recordAudit('studio:create', 'employee', `失败：${(err as Error).message}`, false)
      sendJson(res, { error: (err as Error).message }, 400)
    }
    return
  }

  const empTest = path.match(/^\/api\/studio\/employees\/([^/]+)\/test$/)
  if (method === 'POST' && empTest) {
    const body = (await readBody(req)) as { message?: string }
    try {
      sendJson(res, await studio.tryRun(decodeURIComponent(empTest[1]), body.message ?? ''))
    } catch (err) {
      sendJson(res, { error: (err as Error).message }, 400)
    }
    return
  }

  const empDel = path.match(/^\/api\/studio\/employees\/([^/]+)$/)
  if (method === 'DELETE' && empDel) {
    const ok = await studio.remove(decodeURIComponent(empDel[1]))
    sendJson(res, { ok }, ok ? 200 : 404)
    return
  }

  /* ------------------------- 知识库管理面板（喂资料） ------------------------- */

  if (method === 'GET' && (path === '/kb' || path === '/kb/')) {
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.end(CONSOLE_HTML)
    return
  }

  if (method === 'GET' && path === '/api/kb/categories') {
    sendJson(res, { categories: kbConsole.categories(), permissions: kbConsole.permissions() })
    return
  }

  if (method === 'GET' && path === '/api/kb/stats') {
    sendJson(res, kbConsole.stats())
    return
  }

  if (method === 'GET' && path === '/api/kb/docs') {
    sendJson(res, { docs: kbConsole.list(url.searchParams.get('category') ?? undefined) })
    return
  }

  if (method === 'POST' && path === '/api/kb/docs') {
    const body = (await readBody(req)) as Partial<IngestInput>
    try {
      const doc = await kbConsole.ingest(body)
      sendJson(res, { doc }, 201)
    } catch (err) {
      sendJson(res, { error: (err as Error).message }, 400)
    }
    return
  }

  const kbDel = path.match(/^\/api\/kb\/docs\/([^/]+)$/)
  if (method === 'DELETE' && kbDel) {
    try {
      const ok = await kbConsole.remove(decodeURIComponent(kbDel[1]))
      recordAudit('kb:write', `doc:${decodeURIComponent(kbDel[1])}`, ok ? '删除资料成功' : '资料未找到', ok)
      sendJson(res, { ok }, ok ? 200 : 404)
    } catch (err) {
      recordAudit('kb:write', `doc:${decodeURIComponent(kbDel[1])}`, `异常：${(err as Error).message}`, false)
      sendJson(res, { error: (err as Error).message }, 400)
    }
    return
  }

  if (method === 'POST' && path === '/api/kb/search') {
    const body = (await readBody(req)) as {
      query?: string
      category?: string
      topK?: number
      clearance?: KnowledgePermission
    }
    try {
      sendJson(
        res,
        kbConsole.search(body.query ?? '', {
          category: body.category,
          topK: body.topK,
          clearance: body.clearance,
        }),
      )
    } catch (err) {
      sendJson(res, { error: (err as Error).message }, 400)
    }
    return
  }

  /* ------------------------- T2.3 营销数字员工（MCP 对接 + 合规闸门） ------------------------- */

  if (method === 'POST' && path === '/api/marketing/generate') {
    const body = (await readBody(req)) as { topic?: string; platform?: string; brandTone?: string }
    if (!body.topic) {
      sendJson(res, { error: '缺少 topic' }, 400)
      return
    }
    const conn = runtime.getExtension('connector', 'connector-marketing-mcp')
    if (!conn) {
      sendJson(res, { error: '营销连接器未注册' }, 500)
      return
    }
    const r = await conn.call(
      'generate',
      { topic: body.topic, platform: body.platform ?? '朋友圈', brandTone: body.brandTone },
      runtime.createContext(),
    )
    sendJson(res, r.data ?? { error: r.error }, r.ok ? 200 : 500)
    return
  }

  if (method === 'POST' && path === '/api/marketing/publish') {
    const body = (await readBody(req)) as { content?: string; platform?: string }
    if (!body.content) {
      sendJson(res, { error: '缺少 content' }, 400)
      return
    }
    const conn = runtime.getExtension('connector', 'connector-marketing-mcp')
    if (!conn) {
      sendJson(res, { error: '营销连接器未注册' }, 500)
      return
    }
    const r = await conn.call(
      'publish',
      { content: body.content, platform: body.platform ?? '朋友圈' },
      runtime.createContext(),
    )
    recordAudit('agent:external', `marketing:${body.platform ?? '朋友圈'}`, r.ok ? '外发受合规闸门（默认不真发）' : `失败：${r.error ?? ''}`, r.ok)
    sendJson(res, r.data ?? { error: r.error }, r.ok ? 200 : 500)
    return
  }

  /* ------------------------- T2.4 GEO 自动化（投喂+分发+收录查询+定时任务） ------------------------- */

  if (method === 'GET' && (path === '/geo' || path === '/geo/')) {
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.end(GEO_HTML)
    return
  }

  if (method === 'POST' && path === '/api/geo/feed') {
    const feed = runtime.getExtension('skill', 'geo-feed')
    if (!feed) {
      sendJson(res, { ok: false, error: 'geo-feed 技能未注册' }, 500)
      return
    }
    const r = await feed.execute({}, runtime.createContext())
    sendJson(res, r.ok ? { ok: true, package: r.output } : { ok: false, error: r.error }, r.ok ? 200 : 500)
    return
  }

  if (method === 'POST' && path === '/api/geo/run') {
    const report: GeoWorkflowReport = await runGeoWorkflow(runtime.createContext())
    sendJson(res, report, report.ok ? 200 : 500)
    return
  }

  const sched = runtime.getService<{
    list: () => { id: string; spec: string; intervalMs: number; enabled: boolean; runCount: number; lastRunAt?: number; lastResult?: string }[]
    start: (id?: string) => string[]
    stop: (id?: string) => string[]
    runNow: (id: string) => Promise<unknown>
  }>('geoScheduler')

  if (method === 'GET' && path === '/api/geo/schedule') {
    if (!sched) {
      sendJson(res, { ok: false, error: 'geoScheduler 未注册' }, 500)
      return
    }
    sendJson(res, { ok: true, jobs: sched.list() })
    return
  }

  const schedAct = path.match(/^\/api\/geo\/schedule\/(start|stop|run)$/)
  if (method === 'POST' && schedAct) {
    if (!sched) {
      sendJson(res, { ok: false, error: 'geoScheduler 未注册' }, 500)
      return
    }
    const body = (await readBody(req)) as { id?: string }
    const act = schedAct[1]
    try {
      if (act === 'start') sched.start(body.id)
      else if (act === 'stop') sched.stop(body.id)
      else if (act === 'run') await sched.runNow(body.id ?? 'geo-daily')
      sendJson(res, { ok: true, jobs: sched.list() })
    } catch (err) {
      sendJson(res, { ok: false, error: (err as Error).message }, 400)
    }
    return
  }

  /* ------------------------- T3 平台：权限/审计/数字员工市场 ------------------------- */

  if (method === 'GET' && (path === '/platform' || path === '/platform/')) {
    res.setHeader('content-type', 'text/html; charset=utf-8')
    res.end(PLATFORM_HTML)
    return
  }

  if (method === 'GET' && path === '/api/auth/accounts') {
    if (!authSvc) {
      sendJson(res, { error: 'teamAuth 未注册' }, 500)
      return
    }
    sendJson(res, { accounts: authSvc.listAccounts() })
    return
  }

  if (method === 'POST' && path === '/api/auth/login') {
    if (!authSvc) {
      sendJson(res, { error: 'teamAuth 未注册' }, 500)
      return
    }
    const body = (await readBody(req)) as { name?: string; password?: string }
    const r = authSvc.authenticate(body.name ?? '', body.password ?? '')
    recordAudit(
      'auth:manage',
      `login:${body.name ?? ''}`,
      r.token ? '登录成功' : '登录失败',
      Boolean(r.token),
    )
    sendJson(res, r, r.token ? 200 : 401)
    return
  }

  if (method === 'POST' && path === '/api/auth/accounts') {
    if (!authSvc) {
      sendJson(res, { error: 'teamAuth 未注册' }, 500)
      return
    }
    if (!authSvc.can(token, 'auth:manage')) {
      sendJson(res, { error: '无权限：需 admin' }, 403)
      return
    }
    const body = (await readBody(req)) as { name?: string; password?: string; role?: Role }
    if (!body.name || !body.password) {
      sendJson(res, { error: '缺少 name / password' }, 400)
      return
    }
    const acc = authSvc.createAccount(body.name, body.role ?? 'viewer', body.password)
    recordAudit('auth:manage', `account:${acc.id}`, `创建账号 ${acc.name}/${acc.role}`, true)
    sendJson(res, { account: acc }, 201)
    return
  }

  if (method === 'GET' && path === '/api/audit/logs') {
    if (!auditSvc) {
      sendJson(res, { error: 'auditLog 未注册' }, 500)
      return
    }
    const sp = url.searchParams
    const entries = auditSvc.query({
      actor: sp.get('actor') ?? undefined,
      action: sp.get('action') ?? undefined,
      since: sp.get('since') ? Number(sp.get('since')) : undefined,
      limit: sp.get('limit') ? Number(sp.get('limit')) : 30,
    })
    sendJson(res, { entries })
    return
  }

  if (method === 'GET' && path === '/api/market/list') {
    if (!marketplaceSvc) {
      sendJson(res, { error: 'marketplace 未注册' }, 500)
      return
    }
    const installed = runtime.getExtensions('agent').map((a) => a.id)
    sendJson(res, {
      items: marketplaceSvc.list().map((it) => ({ ...it, installed: installed.includes(it.id) })),
    })
    return
  }

  if (method === 'POST' && path === '/api/market/install') {
    if (!marketplaceSvc) {
      sendJson(res, { error: 'marketplace 未注册' }, 500)
      return
    }
    if (!authSvc || !authSvc.can(token, 'market:install')) {
      sendJson(res, { error: '无权限：需 operator 及以上' }, 403)
      return
    }
    const body = (await readBody(req)) as { id?: string }
    const r = await marketplaceSvc.install(runtime, body.id ?? '')
    recordAudit(
      'market:install',
      `agent:${body.id ?? ''}`,
      r.ok ? '从市场安装数字员工成功' : `失败：${r.error ?? ''}`,
      r.ok,
    )
    sendJson(res, r, r.ok ? 201 : 400)
    return
  }

  /* ------------------------------- 会话 ------------------------------- */

  if (method === 'POST' && path === '/sessions') {
    const body = (await readBody(req)) as { agentId?: string }
    const session = runtime.createSession(body.agentId ?? 'agent-solo')
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ sessionId: session.sessionId }))
    return
  }

  const m = path.match(/^\/sessions\/([^/]+)\/messages$/)
  if (method === 'POST' && m) {
    const body = (await readBody(req)) as { message: string }
    const session = runtime.createSession('agent-solo', { sessionId: m[1] })
    res.setHeader('content-type', 'text/event-stream')
    res.setHeader('cache-control', 'no-cache')
    res.setHeader('connection', 'keep-alive')
    for await (const ev of session.send(body.message)) {
      res.write(`data: ${JSON.stringify(ev)}\n\n`)
    }
    res.write('event: done\ndata: {}\n\n')
    res.end()
    return
  }

  // OpenAI 兼容接口（可对接：第三方 / 企业平台零改造接入）
  if (method === 'POST' && path === '/v1/chat/completions') {
    const body = (await readBody(req)) as { messages?: { role: string; content: string }[] }
    const lastUser = [...(body.messages ?? [])].reverse().find((x) => x.role === 'user')
    const question = lastUser?.content ?? ''
    const session = runtime.createSession('agent-solo')
    res.setHeader('content-type', 'text/event-stream')
    res.setHeader('cache-control', 'no-cache')
    for await (const ev of session.send(question)) {
      if (ev.type === 'agent.message') {
        res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: ev.text } }] })}\n\n`)
      } else if (ev.type === 'error') {
        res.write(`data: ${JSON.stringify({ error: ev.error })}\n\n`)
      }
    }
    res.write(`data: ${JSON.stringify({ choices: [{ delta: {} }] })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
    return
  }

  res.statusCode = 404
  res.end(JSON.stringify({ error: 'not found' }))
}
