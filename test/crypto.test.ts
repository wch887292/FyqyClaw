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

  it('非 ASCII（中文 / emoji）密钥 UTF-8 往返不损坏', () => {
    resetSessionSalt()
    const plain = 'sk-飞虹智科技密钥测试🔑abc123'
    const cipher = encryptApiKey(plain)
    expect(cipher).not.toBe(plain)
    expect(decryptApiKey(cipher)).toBe(plain)
  })

  it('设备指纹参与密钥派生：指纹被篡改后无法还原出原文', () => {
    resetSessionSalt()
    const plain = 'sk-secret-value-9876543210'
    const cipher = encryptApiKey(plain)
    const originalWindow = (globalThis as any).window
    // 模拟设备指纹变化（UA 不同），由于密钥依赖指纹，解密结果应为乱码而非原文
    ;(globalThis as any).window = {
      navigator: { userAgent: 'tampered-user-agent', language: 'xx' },
    }
    expect(decryptApiKey(cipher)).not.toBe(plain)
    ;(globalThis as any).window = originalWindow
  })
})
