import { describe, it, expect } from 'vitest'
import { CodeReviewEngine } from '@orchestrator/review/code-review'

describe('CodeReviewEngine 真实代码扫描', () => {
  it('能识别硬编码凭据', async () => {
    const engine = new CodeReviewEngine()
    const diff = [
      '=== src/config.ts ===',
      '+ const apiKey = "sk-1234567890abcdef"',
      '+ function ok() {}',
    ].join('\n')
    const results = await engine.review({ diff, language: 'typescript', filePath: 'src/config.ts' })
    expect(results.some(r => r.name === 'hardcoded-password' || r.message.includes('硬编码'))).toBe(true)
  })

  it('清洁代码不产生 error 级问题', async () => {
    const engine = new CodeReviewEngine()
    const diff = [
      '=== src/util.ts ===',
      '+ export function add(a: number, b: number) {',
      '+   return a + b',
      '+ }',
    ].join('\n')
    const results = await engine.review({ diff, language: 'typescript', filePath: 'src/util.ts' })
    expect(results.filter(r => r.severity === 'error')).toHaveLength(0)
  })
})
