/**
 * 沙箱安全策略判定（主进程强制层）
 *
 * 为什么放在主进程边界：渲染层的 SandboxManager / SecurityPolicy 仅为 UI 便利，
 * 可被绕过；真正的安全边界必须在主进程 spawn 之前强制，任何命令都无法跳过。
 *
 * 默认策略：
 *  - 拦截高危破坏性命令（rm -rf /、dd、mkfs、fork bomb 等）
 *  - 禁止在系统敏感路径（/etc、/sys、/proc、C:\Windows...）执行命令
 *  - allowedCommands 为空时「除黑名单外均允许」，符合开发工具终端的使用预期
 */

// 高危操作子串（命中即拦截，避免整词匹配漏掉带参数的变体）
export const SANDBOX_BLOCKED_SUBSTRINGS = [
  'rm -rf /',
  'rm -rf ~',
  'rm -rf ./*',
  'del /f /s',
  'rd /s /q',
  '> /dev/sda',
  ':(){:|:&};:',
  'chmod -R 000',
  'chmod -R 777 /',
  'mkfs',
  'dd if=',
  'dd of=',
]

// 整词禁止命令（仅当为命令首 token 时拦截，避免误伤 `npm run format` 等）
export const SANDBOX_BLOCKED_COMMANDS = [
  'shutdown',
  'reboot',
  'halt',
  'poweroff',
  'init',
  'format',
]

// 受限系统路径（在这些目录内禁止执行任何命令）
export const SANDBOX_RESTRICTED_PATHS = [
  '/etc',
  '/sys',
  '/proc',
  'C:\\Windows\\System32',
  'C:\\Windows',
]

export interface PolicyVerdict {
  allowed: boolean
  reason?: string
}

/**
 * 判定一条命令是否允许在给定工作目录执行。
 * @param command 待执行的完整命令
 * @param cwd 工作目录
 */
export function evaluateSandboxPolicy(command: string, cwd: string): PolicyVerdict {
  const trimmed = command.trim()

  // 1) 高危操作子串
  for (const blocked of SANDBOX_BLOCKED_SUBSTRINGS) {
    if (trimmed.includes(blocked)) {
      return { allowed: false, reason: `命令包含被禁止的高危操作: "${blocked}"` }
    }
  }

  // 2) 整词禁止命令（仅首 token）
  const cmdName = trimmed.split(/\s+/)[0]
  for (const blocked of SANDBOX_BLOCKED_COMMANDS) {
    if (cmdName === blocked) {
      return { allowed: false, reason: `命令 "${blocked}" 被安全策略禁止执行` }
    }
  }

  // 3) 受限系统路径
  const normalizedCwd = cwd.replace(/\\/g, '/')
  for (const restricted of SANDBOX_RESTRICTED_PATHS) {
    const r = restricted.replace(/\\/g, '/')
    if (normalizedCwd.startsWith(r)) {
      return { allowed: false, reason: `工作目录 "${cwd}" 位于受限系统路径，禁止执行命令` }
    }
  }

  return { allowed: true }
}
