import type { SandboxConfig, SandboxPolicy } from '../types'

export class SecurityPolicy implements SandboxPolicy {
  private config: SandboxConfig

  constructor(config: SandboxConfig) {
    this.config = config
  }

  updateConfig(config: SandboxConfig): void {
    this.config = config
  }

  allowCommand(command: string): { allowed: boolean; reason?: string } {
    const cmdName = command.trim().split(/\s+/)[0]

    // Check blocked commands
    for (const blocked of this.config.blockedCommands) {
      if (command.includes(blocked)) {
        return { allowed: false, reason: `命令 "${blocked}" 被安全策略禁止执行` }
      }
    }

    // Check allowed commands (if configured)
    if (this.config.allowedCommands.length > 0) {
      const isAllowed = this.config.allowedCommands.some(c => cmdName === c || cmdName.endsWith(`/${c}`) || cmdName.endsWith(`\\${c}`))
      if (!isAllowed) {
        return { allowed: false, reason: `命令 "${cmdName}" 不在允许执行列表` }
      }
    }

    return { allowed: true }
  }

  allowPath(path: string): { allowed: boolean; reason?: string } {
    for (const restricted of this.config.restrictedPaths) {
      if (path.startsWith(restricted)) {
        return { allowed: false, reason: `路径 "${path}" 在受限路径列表中` }
      }
    }
    return { allowed: true }
  }

  allowNetwork(host: string, port: number): { allowed: boolean; reason?: string } {
    // In privacy mode, block all network access
    if (this.config.privacyMode) {
      return { allowed: false, reason: '隐私模式下禁止网络访问' }
    }
    return { allowed: true }
  }
}