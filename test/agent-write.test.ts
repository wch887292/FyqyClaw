import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentEngine } from '@orchestrator/agent/engine'
import type { ModelConfig } from '@model-adapter/types'

// 注入式落盘器：记录调用并返回成功，便于在无文件系统的测试环境断言真实写盘行为
function makeFileWriter() {
  const calls: Array<{ path: string; content: string }> = []
  const writer = vi.fn(async (p: string, c: string) => {
    calls.push({ path: p, content: c })
    return true
  })
  return { writer, calls }
}

describe('P0-4 SOLO Agent 真实写盘', () => {
  let engine: AgentEngine
  let fw: ReturnType<typeof makeFileWriter>

  beforeEach(() => {
    engine = new AgentEngine()
    fw = makeFileWriter()
    engine.setFileWriter(fw.writer)
  })

  it('applyCodeBlocks 将相对路径解析到工作区根目录并真实写盘', async () => {
    engine.setWorkspaceRoot('/proj')
    await engine.applyCodeBlocks(
      [{ language: 'typescript', filePath: 'src/hello.ts', code: "export const hi = 'world'" }],
      'generate',
    )

    expect(fw.calls.length).toBe(1)
    expect(fw.calls[0].path).toBe('/proj/src/hello.ts')
    expect(fw.calls[0].content).toBe("export const hi = 'world'")

    // 生成文件登记为真实绝对路径
    const files = engine.getGeneratedFiles()
    expect(files.length).toBe(1)
    expect(files[0].filePath).toBe('/proj/src/hello.ts')
    expect(files[0].action).toBe('created')
  })

  it('绝对路径原样使用，不做拼接', async () => {
    engine.setWorkspaceRoot('/proj')
    await engine.applyCodeBlocks(
      [{ language: 'python', filePath: '/abs/app.py', code: 'print(1)' }],
      'fix',
    )
    expect(fw.calls[0].path).toBe('/abs/app.py')
  })

  it('变更汇总使用真实相对路径，而非伪造的 file-N 占位', async () => {
    engine.setWorkspaceRoot('/proj')
    await engine.applyCodeBlocks(
      [{ language: 'typescript', filePath: 'src/a.ts', code: 'const x = 1\nconst y = 2' }],
      'generate',
    )

    const summary = engine.getChangeSummary()
    // 真实相对路径，绝不应出现 file-1 这类占位
    expect(summary.filesChanged).toContain('src/a.ts')
    expect(summary.changes.some((c) => c.file === 'file-1')).toBe(false)
    // 统计基于真实行数（2 行），而非硬编码的 10
    expect(summary.statistics.totalFiles).toBe(1)
    expect(summary.statistics.totalLinesAdded).toBe(2)
  })

  it('多文件重复路径按修改处理，不重复计数', async () => {
    engine.setWorkspaceRoot('/proj')
    await engine.applyCodeBlocks([{ language: 'ts', filePath: 'src/a.ts', code: 'v1' }], 'generate')
    await engine.applyCodeBlocks([{ language: 'ts', filePath: 'src/a.ts', code: 'v2' }], 'modify')

    expect(fw.calls.length).toBe(2)
    const files = engine.getGeneratedFiles()
    expect(files.length).toBe(1)
    expect(files[0].action).toBe('modified')
    expect(engine.getChangeSummary().statistics.totalFiles).toBe(1)
  })

  it('整合：executeTask 修复任务经 fix 能力真正落盘', async () => {
    const fakeManager: any = {
      configureCustomModel: () => {},
      complete: async () => ({
        content: '```typescript:src/login.ts\nconsole.log("fixed login")\n```',
        usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      }),
    }
    const eng = new AgentEngine(fakeManager)
    eng.setFileWriter(fw.writer)
    eng.setWorkspaceRoot('/proj')
    eng.configureModel({
      provider: 'openai-compatible',
      apiKey: 'k',
      modelName: 'm',
      temperature: 0.7,
      maxTokens: 4096,
    } as ModelConfig)

    const task = await eng.executeTask('修复登录模块的空指针 bug')
    expect(task.status).toBe('completed')
    expect(fw.calls.some((c) => c.path === '/proj/src/login.ts')).toBe(true)
    expect(eng.getGeneratedFiles().some((f) => f.filePath === '/proj/src/login.ts')).toBe(true)
    // 统计应反映真实落盘文件，而非伪造占位
    expect(eng.getChangeSummary().statistics.totalFiles).toBeGreaterThanOrEqual(1)
  })

  it('默认落盘器（electron-bridge writeFile）在无 electron 环境下失败不抛异常', async () => {
    const eng = new AgentEngine()
    eng.setWorkspaceRoot('/tmp')
    // 不注入 fileWriter，使用默认 writeFile（node 下回退，应被内部 try/catch 吞掉）
    await expect(
      eng.applyCodeBlocks([{ language: 'ts', filePath: 'x.ts', code: 'a' }], 'generate'),
    ).resolves.toBeUndefined()
  })
})
