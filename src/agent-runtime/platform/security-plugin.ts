/**
 * 平台安全与审计插件（T3.2 · 注册 teamAuth + auditLog 两个运行时服务）。
 *
 * 署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 吴赐虹
 */
import type { Plugin } from '../core/types'
import { TeamAuth } from './auth'
import { AuditLog } from './audit'

export interface SecurityPluginOptions {
  /** 安全数据目录（账号 + 审计落盘，零出境）；不传则仅内存。 */
  securityDir?: string
}

export function createSecurityPlugin(opts: SecurityPluginOptions = {}): Plugin {
  return {
    manifest: {
      id: 'fyqy-platform-security',
      name: '平台安全与审计',
      version: '1.0.0',
      description: 'T3.2 私有化部署底座：团队账号 RBAC + 操作审计留痕。',
      author: '晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心（吴赐虹）',
      tags: ['platform', 'security', 'rbac', 'audit'],
    },
    activate(api) {
      const auth = new TeamAuth({ securityDir: opts.securityDir })
      const audit = new AuditLog({ securityDir: opts.securityDir })
      api.registerService('teamAuth', auth)
      api.registerService('auditLog', audit)
      // 平台初始化动作本身也留痕
      audit.record({
        actor: 'system',
        action: 'platform:deploy',
        resource: 'security-plugin',
        detail: '平台安全与审计服务初始化',
        ok: true,
      })
    },
  }
}
