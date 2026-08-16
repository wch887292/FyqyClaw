import { describe, it, expect } from 'vitest'
import { ContextManager } from '@orchestrator/context/context-manager'

describe('ContextManager.loadFileContext 真实读盘', () => {
  it('注入读取器时返回磁盘真实内容', async () => {
    const mgr = new ContextManager()
    mgr.setFileReader(async (p) => (p.endsWith('a.ts') ? 'export const x = 1' : undefined))
    const item = await mgr.loadFileContext('/proj/src/a.ts')
    expect(item.type).toBe('file')
    expect(item.content).toBe('export const x = 1')
    expect(item.metadata?.readable).toBe(true)
    expect(item.metadata?.language).toBe('typescript')
  })

  it('读取器不可用时不伪造内容，回退占位并标记不可读', async () => {
    const mgr = new ContextManager()
    mgr.setFileReader(async () => undefined)
    const item = await mgr.loadFileContext('/proj/src/missing.ts')
    expect(item.content).toContain('暂不可读')
    expect(item.metadata?.readable).toBe(false)
  })

  it('默认（无注入）不抛错', async () => {
    const mgr = new ContextManager()
    const item = await mgr.loadFileContext('/x/y.ts')
    expect(item.type).toBe('file')
  })

  it('可写回并读取', async () => {
    const mgr = new ContextManager()
    mgr.setFileReader(async () => 'hello')
    await mgr.loadFileContext('/a.ts')
    expect(mgr.getContextSummary()).toContain('/a.ts')
    expect(mgr.getAllContexts()).toHaveLength(1)
  })
})
