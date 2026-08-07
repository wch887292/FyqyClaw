import type { SandboxConfig, CommandRequest, CommandResult } from '../types'

export class CommandExecutor {
  private config: SandboxConfig

  constructor(config: SandboxConfig) {
    this.config = config
  }

  async execute(request: CommandRequest): Promise<CommandResult> {
    const startTime = Date.now()

    try {
      // Try to use Electron's child_process via IPC
      // Falls back to simulation if not in Electron
      const electronAPI = (window as any).electronAPI
      if (electronAPI?.invoke) {
        const result = await electronAPI.invoke('sandbox:execute', {
          id: request.id,
          command: request.command,
          cwd: request.cwd,
          timeout: request.timeout || this.config.maxExecutionTime,
        })
        return {
          ...result,
          duration: Date.now() - startTime,
        }
      }

      // Simulation fallback
      return new Promise((resolve) => {
        const timeout = request.timeout || this.config.maxExecutionTime
        const timer = setTimeout(() => {
          resolve({
            id: request.id,
            exitCode: -1,
            stdout: '',
            stderr: '命令执行超时',
            duration: Date.now() - startTime,
            wasBlocked: false,
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