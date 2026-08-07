import type { SandboxConfig, CommandRequest, CommandResult, SecurityEvent } from './types'
import { CommandExecutor } from './executor/command-executor'
import { SecurityPolicy } from './policy/security-policy'
import { ActivityMonitor } from './monitor/activity-monitor'

export class SandboxManager {
  private config: SandboxConfig
  private executor: CommandExecutor
  private policy: SecurityPolicy
  private monitor: ActivityMonitor
  private events: SecurityEvent[] = []
  private onSecurityEvent?: (event: SecurityEvent) => void

  constructor(config?: Partial<SandboxConfig>) {
    this.config = {
      enabled: true,
      restrictedPaths: ['/etc', '/sys', '/proc', 'C:\\Windows\\System32'],
      allowedCommands: ['node', 'npm', 'npx', 'git', 'python', 'pip', 'tsc', 'go', 'rustc', 'cargo', 'dotnet', 'java', 'mvn', 'gradle', 'docker'],
      blockedCommands: ['rm -rf /', 'rm -rf ~', 'format', 'del /f /s', 'rd /s /q', 'shutdown', 'reboot', 'init', 'dd', 'mkfs'],
      maxExecutionTime: 30000,
      maxOutputSize: 1048576,
      privacyMode: false,
      ...config,
    }

    this.executor = new CommandExecutor(this.config)
    this.policy = new SecurityPolicy(this.config)
    this.monitor = new ActivityMonitor(this.config)
  }

  async executeCommand(request: CommandRequest): Promise<CommandResult> {
    // Check if sandbox is enabled
    if (!this.config.enabled) {
      return this.executor.execute(request)
    }

    // Policy check
    const policyCheck = this.policy.allowCommand(request.command)
    if (!policyCheck.allowed) {
      const event: SecurityEvent = {
        id: `sec-${Date.now()}`,
        type: 'command_blocked',
        severity: 'high',
        message: policyCheck.reason || '命令被安全策略阻止',
        timestamp: Date.now(),
        details: { command: request.command },
      }
      this.events.push(event)
      this.onSecurityEvent?.(event)

      return {
        id: request.id,
        exitCode: -1,
        stdout: '',
        stderr: policyCheck.reason || '命令被安全策略阻止',
        duration: 0,
        wasBlocked: true,
        blockReason: policyCheck.reason,
      }
    }

    // Execute with monitoring
    const startTime = Date.now()
    const result = await this.executor.execute(request)
    const duration = Date.now() - startTime

    // Monitor for suspicious activity
    this.monitor.recordActivity({
      command: request.command,
      duration,
      exitCode: result.exitCode,
      outputSize: result.stdout.length + result.stderr.length,
    })

    return { ...result, duration }
  }

  setConfig(config: Partial<SandboxConfig>): void {
    this.config = { ...this.config, ...config }
    this.policy.updateConfig(this.config)
    this.monitor.updateConfig(this.config)
  }

  getConfig(): SandboxConfig {
    return { ...this.config }
  }

  setPrivacyMode(enabled: boolean): void {
    this.config.privacyMode = enabled
  }

  setOnSecurityEvent(callback: (event: SecurityEvent) => void): void {
    this.onSecurityEvent = callback
  }

  getEvents(): SecurityEvent[] {
    return [...this.events]
  }

  getMonitor(): ActivityMonitor {
    return this.monitor
  }
}