import { describe, it, expect } from 'vitest'
import { evaluateSandboxPolicy } from '../src/sandbox/policy/evaluate'

describe('evaluateSandboxPolicy', () => {
  describe('应拦截的高危命令', () => {
    it('rm -rf /', () => {
      expect(evaluateSandboxPolicy('rm -rf /', '/home/user/project').allowed).toBe(false)
    })
    it('rm -rf ~', () => {
      expect(evaluateSandboxPolicy('rm -rf ~', '/home/user/project').allowed).toBe(false)
    })
    it('rm -rf ./*', () => {
      expect(evaluateSandboxPolicy('rm -rf ./*', '/home/user/project').allowed).toBe(false)
    })
    it('dd 写盘', () => {
      expect(evaluateSandboxPolicy('dd if=/dev/zero of=/dev/sda', '/home/user/project').allowed).toBe(false)
    })
    it('fork bomb', () => {
      expect(evaluateSandboxPolicy(':(){:|:&};:', '/home/user/project').allowed).toBe(false)
    })
    it('格式化命令 format（首 token）', () => {
      expect(evaluateSandboxPolicy('format c:', '/home/user/project').allowed).toBe(false)
    })
    it('shutdown', () => {
      expect(evaluateSandboxPolicy('shutdown -h now', '/home/user/project').allowed).toBe(false)
    })
  })

  describe('不应误伤的正常开发命令', () => {
    it('npm run format（format 非首 token）', () => {
      expect(evaluateSandboxPolicy('npm run format', '/home/user/project').allowed).toBe(true)
    })
    it('git status', () => {
      expect(evaluateSandboxPolicy('git status', '/home/user/project').allowed).toBe(true)
    })
    it('ls -la', () => {
      expect(evaluateSandboxPolicy('ls -la', '/home/user/project').allowed).toBe(true)
    })
    it('npm test', () => {
      expect(evaluateSandboxPolicy('npm test', '/home/user/project').allowed).toBe(true)
    })
  })

  describe('受限系统路径', () => {
    it('在 /etc 下执行被拦截', () => {
      expect(evaluateSandboxPolicy('ls', '/etc/nginx').allowed).toBe(false)
    })
    it('在 C:\\Windows\\System32 下执行被拦截', () => {
      expect(evaluateSandboxPolicy('dir', 'C:\\Windows\\System32').allowed).toBe(false)
    })
    it('普通项目目录不受影响', () => {
      expect(evaluateSandboxPolicy('ls', '/home/user/project').allowed).toBe(true)
    })
  })
})
