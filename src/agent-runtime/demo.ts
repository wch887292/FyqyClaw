/**
 * 可运行演示：串联「可插拔 / 可独立 / 可对接」三大特性。
 * 运行：npx tsx src/agent-runtime/demo.ts
 */
import {
  AgentRuntime,
  PluginLoader,
  createFyqyRuntime,
  startGateway,
  type Plugin,
  type Skill,
} from './index'

async function main() {
  console.log('\n========== FyqyClaw 智能体运行时 · 三特性演示 ==========\n')

  /* -------------------- 1) 可插拔：运行时内热插拔插件 -------------------- */
  console.log('【可插拔】在运行时内动态安装一个自定义「计算器」技能插件：')
  const runtime = await createFyqyRuntime()
  const calculator: Skill = {
    kind: 'skill',
    id: 'skill-calc',
    name: '计算器',
    version: '1.0.0',
    description: '演示热插拔',
    async execute(input) {
      return { ok: true, output: Number(input.a) + Number(input.b) }
    },
  }
  const calcPlugin: Plugin = {
    manifest: { id: 'demo-calc', name: 'Demo Calculator', version: '1.0.0' },
    activate: (api) => api.register(calculator),
  }
  const loader = new PluginLoader(runtime)
  await loader.load(calcPlugin)
  const skills = runtime.getExtensions('skill').map((s) => s.id)
  console.log('  已注册技能：', skills.join(', '))
  console.log('  计算器 2+3 =', (await calculator.execute({ a: 2, b: 3 }, runtime.createContext())).output)
  await loader.unload('demo-calc')
  console.log('  卸载后技能：', runtime.getExtensions('skill').map((s) => s.id).join(', '))

  /* -------------------- 2) 可独立：脱离 Electron 直接运行会话 -------------------- */
  console.log('\n【可独立】脱离任何 UI，直接创建会话并消费事件流：')
  const session = runtime.createSession('agent-solo')
  let reply = ''
  for await (const ev of session.send('请用一句话介绍飞扬企源AI 的智能体能力。')) {
    if (ev.type === 'agent.message') reply += ev.text
  }
  console.log('  智能体回复：', reply.slice(0, 120), reply.length > 120 ? '…' : '')

  /* -------------------- 3) 可对接：启动 OpenAI 兼容网关并被外部调用 -------------------- */
  console.log('\n【可对接】启动独立 HTTP 网关（OpenAI 兼容），由外部 HTTP 客户端接入：')
  const gw = await startGateway({ port: 8799 })
  console.log(`  网关已启动：http://localhost:${gw.port}`)

  const meta = await fetch(`http://localhost:${gw.port}/meta`).then((r) => r.json())
  console.log('  /meta 可见能力：', 'agents=' + meta.agents.length, 'skills=' + meta.skills.length, 'connectors=' + meta.connectors.length)

  console.log('  外部系统调用 /v1/chat/completions（OpenAI 格式）流式输出：')
  const resp = await fetch(`http://localhost:${gw.port}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'echo', messages: [{ role: 'user', content: '你好' }] }),
  })
  if (resp.body) {
    const reader = resp.body.getReader()
    const dec = new TextDecoder()
    let acc = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of (acc + dec.decode(value)).split('\n')) {
        acc = line.includes('[DONE]') ? '' : line
        if (line.startsWith('data:') && !line.includes('[DONE]')) {
          try {
            const d = JSON.parse(line.slice(5).trim())
            if (d.choices?.[0]?.delta?.content) process.stdout.write(d.choices[0].delta.content)
          } catch {
            /* ignore */
          }
        }
      }
    }
  }
  console.log('\n  网关关闭。')

  await gw.close()
  console.log('\n========== 演示结束 ==========\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
