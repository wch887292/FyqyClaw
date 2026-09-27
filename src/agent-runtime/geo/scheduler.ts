/**
 * 轻量定时任务调度器 —— T2.4 GEO 自动化的"定时执行"底座。
 *
 * 纯 TS、零依赖，基于 Node setInterval，可注册多任务、启停、列出、立即执行、卸载。
 * 真实用途：周期性的 GEO 工作流（品牌投喂 → 多平台分发 → 收录排名查询）。
 *
 * 设计取舍：不引入 cron 依赖，仅支持「固定间隔（intervalMs）」一种模式，足够覆盖
 * "每 N 小时跑一次 GEO 自动化"的需求，且对 Electron 桌面 / 私有化部署零额外负担。
 *
 * 署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 吴赐虹
 */

export interface ScheduledJobSpec {
  id: string
  /** 人类可读描述，如「每 6 小时执行 GEO 工作流」。 */
  spec?: string
  intervalMs: number
  task: () => Promise<void> | void
}

interface ScheduledJob extends ScheduledJobSpec {
  enabled: boolean
  lastRunAt?: number
  lastResult?: string
  runCount: number
  timer?: ReturnType<typeof setInterval>
}

export interface ScheduledJobView {
  id: string
  spec: string
  intervalMs: number
  enabled: boolean
  runCount: number
  lastRunAt?: number
  lastResult?: string
}

export class GeoScheduler {
  private jobs = new Map<string, ScheduledJob>()

  /** 注册一个定时任务（默认禁用，需 start 才生效）。 */
  register(spec: ScheduledJobSpec): ScheduledJob {
    const job: ScheduledJob = {
      ...spec,
      spec: spec.spec ?? `每 ${Math.max(1, Math.round(spec.intervalMs / 1000))} 秒`,
      enabled: false,
      runCount: 0,
    }
    this.jobs.set(spec.id, job)
    return job
  }

  /** 卸载一个任务（会清除其定时器）。 */
  unregister(id: string): boolean {
    const job = this.jobs.get(id)
    if (!job) return false
    if (job.timer) clearInterval(job.timer)
    this.jobs.delete(id)
    return true
  }

  /** 立即执行一次（不依赖定时器）。 */
  async runNow(id: string): Promise<ScheduledJobView | undefined> {
    const job = this.jobs.get(id)
    if (!job) return undefined
    await this.exec(job)
    return this.toView(job)
  }

  /** 启动任务：id 缺省则启动全部已注册任务。 */
  start(id?: string): string[] {
    const ids = id ? [id] : [...this.jobs.keys()]
    for (const tid of ids) {
      const job = this.jobs.get(tid)
      if (!job || job.enabled) continue
      job.enabled = true
      job.timer = setInterval(() => {
        void this.exec(job)
      }, job.intervalMs)
    }
    return ids
  }

  /** 停止任务：id 缺省则停止全部。 */
  stop(id?: string): string[] {
    const ids = id ? [id] : [...this.jobs.keys()]
    for (const tid of ids) {
      const job = this.jobs.get(tid)
      if (!job || !job.enabled) continue
      job.enabled = false
      if (job.timer) clearInterval(job.timer)
      job.timer = undefined
    }
    return ids
  }

  /** 列出全部任务状态。 */
  list(): ScheduledJobView[] {
    return [...this.jobs.values()].map((j) => this.toView(j))
  }

  /** 释放全部定时器（进程退出前调用）。 */
  dispose(): void {
    for (const job of this.jobs.values()) {
      if (job.timer) clearInterval(job.timer)
    }
    this.jobs.clear()
  }

  private async exec(job: ScheduledJob): Promise<void> {
    try {
      await job.task()
      job.lastRunAt = Date.now()
      job.lastResult = 'ok'
      job.runCount += 1
    } catch (err) {
      job.lastRunAt = Date.now()
      job.lastResult = 'error: ' + (err as Error).message
      job.runCount += 1
    }
  }

  private toView(job: ScheduledJob): ScheduledJobView {
    return {
      id: job.id,
      spec: job.spec ?? '',
      intervalMs: job.intervalMs,
      enabled: job.enabled,
      runCount: job.runCount,
      lastRunAt: job.lastRunAt,
      lastResult: job.lastResult,
    }
  }
}
