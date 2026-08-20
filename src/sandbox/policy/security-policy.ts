import type { SandboxConfig } from '../types'
import {
  evaluateSandboxPolicy,
  type PolicyVerdict,
  type PolicyOptions,
} from '@sandbox/policy/evaluate'

/**
 * 渲染层沙箱策略（UI 便利层）
 *
 * ⚠️ 仅为 UI 即时反馈，可被绕过；真正的安全边界在主进程 spawn 之前
 * 由 `evaluateSandboxPolicy` 强制（见 src/sandbox/policy/evaluate.ts 注释）。
 *
 * 本类是对主进程策略的薄封装，保持 `SandboxManager` 既有的 `allowCommand` /
 * `updateConfig` 调用约定，避免渲染层代码因 终极优化 重构而断裂。
 */
export class SecurityPolicy {
  private config: SandboxConfig

  constructor(config: SandboxConfig) {
    this.config = config
  }

  updateConfig(config: SandboxConfig): void {
    this.config = config
  }

  /** 命令级策略判定。渲染层无真实 cwd 上下文，传空串仅做命令级校验 */
  allowCommand(command: string): PolicyVerdict {
    const options: PolicyOptions = {
      privacyMode: this.config.privacyMode,
      allowedCommands: this.config.allowedCommands,
    }
    return evaluateSandboxPolicy(command, '', options)
  }
}
