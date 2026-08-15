import { describe, it, expect } from 'vitest'
import {
  obfuscateApiKey,
  encryptApiKey,
  decryptApiKey,
  resetSessionSalt,
} from '../src/main/utils/crypto'

describe('obfuscateApiKey', () => {
  it('空字符串返回空', () => {
    expect(obfuscateApiKey('')).toBe('')
  })

  it('短密钥（<=8 位）返回 ****', () => {
    expect(obfuscateApiKey('short')).toBe('****')
  })

  it('长密钥保留前4位与后4位，中间用 **** 遮蔽', () => {
    expect(obfuscateApiKey('sk-1234567890abcd')).toBe('sk-1****abcd')
  })

  it('不改变长度可识别的前后缀', () => {
    const masked = obfuscateApiKey('abcdefghijklmnop')
    expect(masked.startsWith('abcd')).toBe(true)
    expect(masked.endsWith('mnop')).toBe(true)
    expect(masked).toContain('****')
  })
})

describe('encryptApiKey / decryptApiKey 往返', () => {
  it('同一会话内加密后可还原', () => {
    resetSessionSalt()
    const plain = 'sk-abcdefghijklmnopqrstuvwxyz0123456789'
    const cipher = encryptApiKey(plain)
    expect(cipher).not.toBe(plain)
    expect(decryptApiKey(cipher)).toBe(plain)
  })

  it('空密钥往返为空', () => {
    expect(encryptApiKey('')).toBe('')
    expect(decryptApiKey('')).toBe('')
  })
})
