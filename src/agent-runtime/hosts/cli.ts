/**
 * CLI 宿主 —— 让智能体运行时「可独立」从终端运行，无需 Electron / 浏览器。
 * 用法：
 *   tsx src/agent-runtime/hosts/cli.ts --agent agent-solo --message "介绍一下我们公司的合伙人机制"
 *   echo "你好" | tsx src/agent-runtime/hosts/cli.ts
 */
import { AgentRuntime } from '../runtime/agent-runtime'
import { createFyqyRuntime } from '../presets/default-runtime'
import type { AgentEvent } from '../core/types'

/** 终端传输层：把事件流直接打印到控制台。 */
class StdoutTransport {
  readonly kind = 'transport' as const
  readonly id = 'transport-stdout'
  readonly name = 'Stdout Transport'
  readonly version = '1.0.0'
  send(event: AgentEvent): void {
    switch (event.type) {
      case 'agent.think':
        process.stdout.write(`\n🧠 ${event.text}\n`)
        break
      case 'agent.message':
        process.stdout.write(event.text)
        break
      case 'skill.call':
        process.stdout.write(`\n⚙️  调用技能 ${event.skillId}\n`)
        break
      case 'connector.call':
        process.stdout.write(`\n🔌 对接外部系统 ${event.connectorId} (${event.action})\n`)
        break
      case 'error':
        process.stderr.write(`\n❌ ${event.error}\n`)
        break
      case 'session.end':
        process.stdout.write('\n')
        break
      default:
        break
    }
  }
}

function parseArgs(argv: string[]): { agent: string; message?: string } {
  let agent = 'agent-solo'
  let message: string | undefined
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--agent') agent = argv[++i] ?? agent
    if (argv[i] === '--message') message = argv[++i] ?? message
  }
  return { agent, message }
}

export async function runCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const { agent, message } = parseArgs(argv)
  const msg =
    message ??
    (await new Promise<string>((resolve) => {
      let buf = ''
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', (c) => (buf += c))
      process.stdin.on('end', () => resolve(buf.trim()))
      // 若无管道输入，给个默认
      setTimeout(() => resolve(buf.trim() || '你好，介绍一下你自己。'), 200)
    }))

  const runtime: AgentRuntime = await createFyqyRuntime()
  runtime.addTransport(new StdoutTransport())
  const session = runtime.createSession(agent)
  for await (const _ of session.send(msg)) {
    /* 事件已通过 StdoutTransport 打印 */
  }
}
