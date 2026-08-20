/**
 * 沙箱安全策略判定（主进程强制层）
 *
 * 为什么放在主进程边界：渲染层的 SandboxManager / SecurityPolicy 仅为 UI 便利，
 * 可被绕过；真正的安全边界必须在主进程 spawn 之前强制，任何命令都无法跳过。
 *
 * 默认策略：
 *  - 拦截高危破坏性命令（rm -rf /、dd、mkfs、fork bomb 等），并对变体做鲁棒匹配
 *  - 禁止在系统敏感路径（/etc、/sys、/proc、C:\Windows...）执行命令
 *  - privacyMode 开启时禁止任意网络外联（curl/wget/nc/ssh 及含 URL 的命令），
 *    但放行 allowlist 内的开发工具（node/npm/git/python...）以保证可用性
 *  - allowedCommands + enforceAllowlist 开启时，仅放行白名单命令（严格模式）
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

// 隐私模式下默认禁止的网络外联命令（allowlist 内的开发工具除外）
export const SANDBOX_NETWORK_COMMANDS = [
  'curl',
  'wget',
  'nc',
  'ncat',
  'ssh',
  'scp',
  'sftp',
  'telnet',
  'ftp',
  'tftp',
  'rsync',
]

// 隐私模式下的网络特征（命中即视为外联尝试）
export const SANDBOX_NETWORK_URL_PATTERN = /https?:\/\/|ftp:\/\//i

// 破坏性 rm/rd 变体：目标为根、家目录、当前/父目录、$HOME/$PWD 等
// 例：rm -rf /、rm -rf ~、rm -rf $HOME、rm -rf ${HOME}、rm -rf $PWD、rm -rf .、rm -rf ..、rm -rf ../
// 注意：允许 ./build、./node_modules 这类当前目录内的相对路径（正常清理）
// 变体处理：支持 -- 终止符（rm -rf -- /）与 ${IFS} 等 shell 变量拼接（归一化时已替换为空格）
const DESTRUCTIVE_RM_REGEX =
  /\brm\b(?:\s+-{1,2}[a-zA-Z]*)*\s+(?:\/|(?:\.\.\/?)|(?:\$\{?(?:HOME|PWD|OLDPWD)\}?)|(?:~)|(?:\.)(?=\s|$))/

export interface PolicyOptions {
  /** 隐私模式：开启后禁止任意网络外联命令（allowlist 内开发工具除外） */
  privacyMode?: boolean
  /** 允许列表命令（隐私模式豁免 / 严格白名单模式校验） */
  allowedCommands?: string[]
  /** 严格白名单模式：开启后仅放行 allowedCommands 内的命令 */
  enforceAllowlist?: boolean
}

export interface PolicyVerdict {
  allowed: boolean
  reason?: string
}

/** 归一化命令：折叠连续空白，消除双空格绕过，并将 ${IFS}/$IFS 还原为空白（防 shell 变量拼接绕过） */
function normalize(command: string): string {
  return command
    .trim()
    .replace(/\$\{IFS\}|\$IFS/g, ' ')
    .replace(/\s+/g, ' ')
}

/** 命令是否以给定命令名开头（处理反斜杠转义前缀 \rm 与大小写不敏感的 Windows 命令） */
function startsWithCommand(trimmed: string, cmd: string): boolean {
  const lower = trimmed.toLowerCase()
  const candidates = [cmd, cmd.toLowerCase()]
  for (const c of candidates) {
    if (lower === c) return true
    if (lower.startsWith(c + ' ')) return true
    if (lower.startsWith('\\' + c + ' ')) return true
    if (lower.startsWith('\\' + c)) return true
  }
  return false
}

/**
 * 判定一条命令是否允许在给定工作目录执行。
 * @param command 待执行的完整命令
 * @param cwd 工作目录
 * @param options 策略选项（隐私模式 / 白名单）
 */
export function evaluateSandboxPolicy(
  command: string,
  cwd: string,
  options?: PolicyOptions,
): PolicyVerdict {
  const trimmed = normalize(command)
  const lower = trimmed.toLowerCase() // Windows/cmd 命令大小写不敏感，统一小写后匹配防绕过
  const opts = options ?? {}

  // 1) 高危操作子串（在归一化命令上匹配，修复双空格 / ${IFS} 绕过；小写匹配防大写变体）
  for (const blocked of SANDBOX_BLOCKED_SUBSTRINGS) {
    const b = normalize(blocked).toLowerCase()
    if (lower.includes(b)) {
      return { allowed: false, reason: `命令包含被禁止的高危操作: "${blocked}"` }
    }
  }

  // 2) 破坏性 rm/rd 变体（/$HOME/$PWD/./.. 等目标），修复 $HOME/${HOME}/$PWD 与 -- 终止符绕过
  if (DESTRUCTIVE_RM_REGEX.test(trimmed) || DESTRUCTIVE_RM_REGEX.test(lower)) {
    return { allowed: false, reason: '命令试图删除系统/家目录/项目根等关键路径，已被安全策略阻止' }
  }

  // 3) 整词禁止命令（仅首 token，大小写不敏感）
  const cmdName = trimmed.split(/\s+/)[0]
  for (const blocked of SANDBOX_BLOCKED_COMMANDS) {
    if (startsWithCommand(trimmed, blocked)) {
      return { allowed: false, reason: `命令 "${blocked}" 被安全策略禁止执行` }
    }
  }

  // 4) 隐私模式：禁止任意网络外联（allowlist 内开发工具豁免）
  if (opts.privacyMode) {
    const exempt = opts.allowedCommands ?? []
    const isExempt = exempt.includes(cmdName) || exempt.some(e => e.toLowerCase() === cmdName.toLowerCase())
    const isNetwork =
      SANDBOX_NETWORK_COMMANDS.some(c => startsWithCommand(trimmed, c)) ||
      SANDBOX_NETWORK_URL_PATTERN.test(trimmed)
    if (isNetwork && !isExempt) {
      return {
        allowed: false,
        reason: `隐私模式已开启，禁止网络访问命令: "${cmdName}"（开发工具命令已在豁免列表）`,
      }
    }
  }

  // 5) 严格白名单模式：仅放行 allowedCommands 内的命令
  if (opts.enforceAllowlist && Array.isArray(opts.allowedCommands) && opts.allowedCommands.length > 0) {
    const allowedLower = opts.allowedCommands.map(c => c.toLowerCase())
    if (!opts.allowedCommands.includes(cmdName) && !allowedLower.includes(cmdName.toLowerCase())) {
      return { allowed: false, reason: `白名单模式：命令 "${cmdName}" 不在允许列表内` }
    }
  }

  // 6) 受限系统路径（在这些目录内禁止执行任何命令）
  const normalizedCwd = cwd.replace(/\\/g, '/')
  for (const restricted of SANDBOX_RESTRICTED_PATHS) {
    const r = restricted.replace(/\\/g, '/')
    if (normalizedCwd.startsWith(r)) {
      return { allowed: false, reason: `工作目录 "${cwd}" 位于受限系统路径，禁止执行命令` }
    }
  }

  return { allowed: true }
}
