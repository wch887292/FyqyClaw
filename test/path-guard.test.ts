import { describe, it, expect } from 'vitest'
import { isWithinRoot } from '../src/sandbox/policy/path-guard'
import path from 'path'

describe('isWithinRoot', () => {
  it('根目录自身视为在内', () => {
    expect(isWithinRoot('/proj', '/proj')).toBe(true)
  })
  it('子目录/子文件在内', () => {
    expect(isWithinRoot('/proj/src/a.ts', '/proj')).toBe(true)
    expect(isWithinRoot('/proj/src/deep/b.ts', '/proj')).toBe(true)
  })
  it('父目录逃逸被拒绝', () => {
    expect(isWithinRoot('/proj/../etc/passwd', '/proj')).toBe(false)
    expect(isWithinRoot('/etc/passwd', '/proj')).toBe(false)
    expect(isWithinRoot('/', '/proj')).toBe(false)
  })
  it('Windows 样式路径', () => {
    expect(isWithinRoot('C:\\proj\\src\\a.ts', 'C:\\proj')).toBe(true)
    expect(isWithinRoot('C:\\Windows\\System32', 'C:\\proj')).toBe(false)
  })
  it('与 path.resolve 组合可校验绝对路径越界', () => {
    const root = path.resolve('/proj')
    expect(isWithinRoot(path.resolve('/proj/src/x.ts'), root)).toBe(true)
    expect(isWithinRoot(path.resolve('/etc/x.ts'), root)).toBe(false)
  })
})
