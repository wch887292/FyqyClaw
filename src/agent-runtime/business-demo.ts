/**
 * 业务数字员工验证脚本：确认 5 个领域智能体开箱即用 + 安全白名单生效。
 * 运行：npx tsx src/agent-runtime/business-demo.ts
 *
 * 注：默认使用内置 Echo 模型（离线回显），仅用于验证「编排流程 / 插拔 /
 * 安全白名单」；接入真实 LLM（OpenAI 兼容提供器）后将由模型生成领域答案。
 */
import { createFyqyRuntime } from './presets/default-runtime'
import { BUSINESS_AGENTS } from './presets/business-agents'

async function main() {
  console.log('\n========== FyqyClaw 业务数字员工 · 开箱即用验证 ==========\n')

  const runtime = await createFyqyRuntime({
    knowledgeBase: { 退款: '依据《消费者权益保护法》，支持 7 天无理由退款。' },
  })

  const allAgents = runtime.getExtensions('agent')
  console.log(`运行时已注册智能体共 ${allAgents.length} 个，其中业务数字员工 ${BUSINESS_AGENTS.length} 个：`)
  for (const c of BUSINESS_AGENTS) {
    const a = runtime.getExtension('agent', c.id)
    console.log(`  - ${c.id.padEnd(16)} ${c.name}  [${a ? '已装载' : '缺失!'}]`)
  }

  const samples: Record<string, string> = {
    'agent-cs': '你们的产品支持退款吗？',
    'agent-contract': '帮我看这份采购合同里的付款条款有没有风险。',
    'agent-invoice': '这张餐饮发票抬头是个人不是公司，能报销吗？',
    'agent-resume': '评估这份前端工程师简历是否值得面试。',
    'agent-marketing': '给新款运动鞋写一条朋友圈文案。',
  }

  for (const cfg of BUSINESS_AGENTS) {
    const session = runtime.createSession(cfg.id)
    let text = ''
    let connCalls = 0
    for await (const ev of session.send(samples[cfg.id])) {
      if (ev.type === 'agent.message') text += ev.text
      if (ev.type === 'connector.call') connCalls++
    }
    const allowed = cfg.allowedConnectors ?? []
    const safe = allowed.length === 0
      ? `本地私有化(无外发, ${connCalls === 0 ? '✓ 白名单生效' : '✗ 异常外发'})`
      : `允许对接(白名单: ${allowed.join('/')}, ${connCalls} 次外发尝试)`
    console.log(`\n[${cfg.name}]`)
    console.log(`  示例输入：${samples[cfg.id]}`)
    console.log(`  回复(前90字)：${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`)
    console.log(`  安全策略：${safe}`)
  }

  console.log('\n========== 验证结束 ==========\n')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
