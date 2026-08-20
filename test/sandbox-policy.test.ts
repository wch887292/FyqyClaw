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

  describe('防绕过（鲁棒匹配）', () => {
    it('双空格变体 rm -rf  / 仍被拦截', () => {
      expect(evaluateSandboxPolicy('rm -rf  /', '/home/user/project').allowed).toBe(false)
    })
    it('使用 $HOME 的 rm 被拦截', () => {
      expect(evaluateSandboxPolicy('rm -rf $HOME/.config', '/home/user/project').allowed).toBe(false)
    })
    it('使用 ${HOME} 的 rm 被拦截', () => {
      expect(evaluateSandboxPolicy('rm -rf ${HOME}/x', '/home/user/project').allowed).toBe(false)
    })
    it('rm -rf .（当前目录）被拦截', () => {
      expect(evaluateSandboxPolicy('rm -rf .', '/home/user/project').allowed).toBe(false)
    })
    it('rm -rf ../（父目录逃逸）被拦截', () => {
      expect(evaluateSandboxPolicy('rm -rf ../build', '/home/user/project').allowed).toBe(false)
    })
    it('正常 rm node_modules 不误伤', () => {
      expect(evaluateSandboxPolicy('rm -rf node_modules', '/home/user/project').allowed).toBe(true)
    })
    it('-- 终止符变体 rm -rf -- / 被拦截', () => {
      expect(evaluateSandboxPolicy('rm -rf -- /', '/home/user/project').allowed).toBe(false)
      expect(evaluateSandboxPolicy('rm -rf -- /etc', '/home/user/project').allowed).toBe(false)
    })
    it('$PWD / ${PWD} 变体被拦截（可删空项目目录）', () => {
      expect(evaluateSandboxPolicy('rm -rf $PWD', '/home/user/project').allowed).toBe(false)
      expect(evaluateSandboxPolicy('rm -rf ${PWD}/*', '/home/user/project').allowed).toBe(false)
    })
    it('${IFS} 拼接变体被拦截', () => {
      expect(evaluateSandboxPolicy('rm${IFS}-rf${IFS}/', '/home/user/project').allowed).toBe(false)
    })
    it('反斜杠转义 \rm 变体被拦截', () => {
      expect(evaluateSandboxPolicy('\\rm -rf /', '/home/user/project').allowed).toBe(false)
    })
    it('大小写变体 DEL /F /S 被拦截（Windows cmd 大小写不敏感）', () => {
      expect(evaluateSandboxPolicy('DEL /F /S C:\\Windows', '/home/user/project').allowed).toBe(false)
      expect(evaluateSandboxPolicy('RD /S /Q C:\\x', '/home/user/project').allowed).toBe(false)
    })
    it('大写 Format C: 被拦截', () => {
      expect(evaluateSandboxPolicy('Format C:', '/home/user/project').allowed).toBe(false)
    })
    it('大写 Shutdown /s 被拦截', () => {
      expect(evaluateSandboxPolicy('Shutdown /s /t 0', '/home/user/project').allowed).toBe(false)
    })
  })

  describe('隐私模式禁网', () => {
    const allowed = ['node', 'npm', 'npx', 'git', 'python']
    it('privacyMode 开启时拦截 curl', () => {
      expect(evaluateSandboxPolicy('curl https://evil.com', '/home/user/project', { privacyMode: true, allowedCommands: allowed }).allowed).toBe(false)
    })
    it('privacyMode 开启时拦截 wget / ssh', () => {
      expect(evaluateSandboxPolicy('wget http://x', '/home/user/project', { privacyMode: true, allowedCommands: allowed }).allowed).toBe(false)
      expect(evaluateSandboxPolicy('ssh attacker@host', '/home/user/project', { privacyMode: true, allowedCommands: allowed }).allowed).toBe(false)
    })
    it('privacyMode 开启时含 URL 的非豁免命令被拦截', () => {
      // perl 不在豁免列表，含 URL 即视为外联
      expect(evaluateSandboxPolicy("perl -e \"use LWP::Simple; get('https://x')\"", '/home/user/project', { privacyMode: true, allowedCommands: allowed }).allowed).toBe(false)
    })
    it('privacyMode 开启但豁免开发工具（npm/git/python）', () => {
      expect(evaluateSandboxPolicy('npm install lodash', '/home/user/project', { privacyMode: true, allowedCommands: allowed }).allowed).toBe(true)
      expect(evaluateSandboxPolicy('git clone https://github.com/x/y.git', '/home/user/project', { privacyMode: true, allowedCommands: allowed }).allowed).toBe(true)
      expect(evaluateSandboxPolicy('python train.py', '/home/user/project', { privacyMode: true, allowedCommands: allowed }).allowed).toBe(true)
    })
    it('privacyMode 关闭时不拦截网络命令', () => {
      expect(evaluateSandboxPolicy('curl https://example.com', '/home/user/project', { privacyMode: false }).allowed).toBe(true)
    })
  })

  describe('严格白名单', () => {
    it('enforceAllowlist 开启时仅放行白名单命令', () => {
      expect(evaluateSandboxPolicy('git status', '/home/user/project', { enforceAllowlist: true, allowedCommands: ['git', 'npm'] }).allowed).toBe(true)
      expect(evaluateSandboxPolicy('ls -la', '/home/user/project', { enforceAllowlist: true, allowedCommands: ['git', 'npm'] }).allowed).toBe(false)
    })
  })
})
