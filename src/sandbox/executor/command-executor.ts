import type { SandboxConfig, CommandRequest, CommandResult } from '../types'

export class CommandExecutor {
  private config: SandboxConfig

  constructor(config: SandboxConfig) {
    this.config = config
  }

  /** 配置热更新（SandboxManager.setConfig 后生效，maxExecutionTime/maxOutputSize 等变更不再失效） */
  updateConfig(config: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...config }
  }

  async execute(request: CommandRequest): Promise<CommandResult> {
    const startTime = Date.now()

    try {
      // Try to use Electron's child_process via IPC
      // Falls back to simulation if not in Electron
      const electronAPI = typeof window !== 'undefined' ? (window as any).electronAPI : null
      if (electronAPI?.invoke) {
        const result = await electronAPI.invoke('sandbox:execute', {
          id: request.id,
          command: request.command,
          cwd: request.cwd,
          timeout: request.timeout || this.config.maxExecutionTime,
        })
        if (!result || typeof result.exitCode !== 'number') {
          return {
            id: request.id,
            exitCode: -1,
            stdout: '',
            stderr: '主进程返回了异常结果',
            duration: Date.now() - startTime,
            wasBlocked: false,
          }
        }
        return {
          ...result,
          duration: Date.now() - startTime,
        }
      }

      // Simulation fallback（显式标注 simulated，避免与真实执行混淆）
      return new Promise((resolve) => {
        const timeout = request.timeout || this.config.maxExecutionTime
        const timer = setTimeout(() => {
          resolve({
            id: request.id,
            exitCode: -1,
            stdout: '',
            stderr: '命令执行超时（模拟）',
            duration: Date.now() - startTime,
            wasBlocked: false,
            simulated: true,
          })
        }, timeout)

        setTimeout(() => {
          clearTimeout(timer)
          resolve({
            id: request.id,
            exitCode: 0,
            stdout: `[模拟执行] ${request.command}\n执行完成`,
            stderr: '',
            duration: Date.now() - startTime,
            wasBlocked: false,
            simulated: true,
          })
        }, 100)
      })
    } catch (error) {
      return {
        id: request.id,
        exitCode: -1,
        stdout: '',
        stderr: `执行错误: ${error}`,
        duration: Date.now() - startTime,
        wasBlocked: false,
      }
    }
  }
}