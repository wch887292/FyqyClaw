export interface SandboxConfig {
  enabled: boolean
  restrictedPaths: string[]
  allowedCommands: string[]
  blockedCommands: string[]
  maxExecutionTime: number
  maxOutputSize: number
  privacyMode: boolean
}

export interface CommandRequest {
  id: string
  command: string
  cwd?: string
  timeout?: number
  env?: Record<string, string>
}

export interface CommandResult {
  id: string
  exitCode: number
  stdout: string
  stderr: string
  duration: number
  wasBlocked: boolean
  blockReason?: string
}

export interface SecurityEvent {
  id: string
  type: 'command_blocked' | 'path_access_denied' | 'privacy_violation' | 'resource_exceeded'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
  details?: Record<string, unknown>
}

export interface SandboxPolicy {
  allowCommand(command: string): { allowed: boolean; reason?: string }
  allowPath(path: string): { allowed: boolean; reason?: string }
  allowNetwork(host: string, port: number): { allowed: boolean; reason?: string }
}