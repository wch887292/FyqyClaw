import type { SandboxConfig, SecurityEvent } from '../types'

interface ActivityRecord {
  command: string
  duration: number
  exitCode: number
  outputSize: number
  timestamp: number
}

export class ActivityMonitor {
  private config: SandboxConfig
  private activities: ActivityRecord[] = []
  private maxRecords: number = 1000

  constructor(config: SandboxConfig) {
    this.config = config
  }

  updateConfig(config: SandboxConfig): void {
    this.config = config
  }

  recordActivity(record: Omit<ActivityRecord, 'timestamp'>): void {
    this.activities.push({
      ...record,
      timestamp: Date.now(),
    })

    // Trim old records
    if (this.activities.length > this.maxRecords) {
      this.activities = this.activities.slice(-this.maxRecords)
    }
  }

  getRecentActivities(count: number = 10): ActivityRecord[] {
    return this.activities.slice(-count)
  }

  getStatistics(): {
    totalCommands: number
    failedCommands: number
    averageDuration: number
    totalOutputSize: number
  } {
    if (this.activities.length === 0) {
      return { totalCommands: 0, failedCommands: 0, averageDuration: 0, totalOutputSize: 0 }
    }

    const total = this.activities.length
    const failed = this.activities.filter(a => a.exitCode !== 0).length
    const avgDuration = this.activities.reduce((s, a) => s + a.duration, 0) / total
    const totalOutput = this.activities.reduce((s, a) => s + a.outputSize, 0)

    return {
      totalCommands: total,
      failedCommands: failed,
      averageDuration: Math.round(avgDuration),
      totalOutputSize: totalOutput,
    }
  }

  clear(): void {
    this.activities = []
  }
}