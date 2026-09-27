/**
 * 平台团队账号与 RBAC 权限模型（T3.2 · 私有化部署套件底座）。
 *
 * 署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心 · 吴赐虹
 *
 * 设计要点（呼应融合规划 T3.2「权限/审计」）：
 *  - 团队账号：admin / operator / viewer 三级角色，对应企业私有化部署的「管理员 / 运营 / 只读」。
 *  - RBAC：动作 → 所需最低角色的能力矩阵，集中可审。
 *  - 本地登录态：演示级 token（内存 + 可选落盘 JSON，零数据出境）。
 *  - 合规提示：演示口令为明文占位，生产环境必须替换为 bcrypt/scrypt + 盐，并接入企业 SSO/LDAP。
 *    本模块只提供「可运行、可演示、可审计」的骨架，安全基线由部署方补齐。
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export type Role = 'admin' | 'operator' | 'viewer'

export interface TeamAccount {
  id: string
  name: string
  role: Role
  /** 演示级明文口令占位；生产必须替换为哈希。 */
  password?: string
  createdAt: number
}

/** 角色能力矩阵：动作 → 允许执行的最低角色。未登记的敏感动作默认仅 admin。 */
export const ROLE_PERMISSIONS: Record<string, Role> = {
  'agent:use': 'viewer', // 使用数字员工对话
  'kb:read': 'viewer', // 读知识库
  'kb:write': 'operator', // 写/删知识库
  'agent:external': 'operator', // 触发外发（营销/分发）
  'market:install': 'operator', // 从市场安装数字员工
  'auth:manage': 'admin', // 管理团队账号
  'audit:read': 'admin', // 查看审计流水
  'platform:deploy': 'admin', // 私有化部署配置
}

const RANK: Record<Role, number> = { viewer: 1, operator: 2, admin: 3 }

/** 判断角色是否满足某动作所需权限。 */
export function roleCan(role: Role, action: string): boolean {
  const need = ROLE_PERMISSIONS[action]
  if (!need) return role === 'admin'
  return RANK[role] >= RANK[need]
}

function defaultAdmin(): TeamAccount {
  return { id: 'acc_admin', name: 'admin', role: 'admin', password: 'admin123', createdAt: Date.now() }
}

/**
 * 团队身份与权限中心（可插拔运行时服务）。
 * 注册名：teamAuth
 */
export class TeamAuth {
  private accounts: TeamAccount[] = []
  private sessions = new Map<string, string>() // token -> accountId
  private readonly dir?: string

  constructor(opts: { seed?: TeamAccount[]; securityDir?: string } = {}) {
    this.accounts = (opts.seed ?? [defaultAdmin()]).map((a) => ({ ...a }))
    this.dir = opts.securityDir
    if (this.dir) this.load()
  }

  /** 列出账号（屏蔽口令字段）。 */
  listAccounts(): Omit<TeamAccount, 'password'>[] {
    return this.accounts.map(({ password: _pw, ...rest }) => rest)
  }

  getRole(token?: string): Role | undefined {
    if (!token) return undefined
    const accId = this.sessions.get(token)
    return this.accounts.find((a) => a.id === accId)?.role
  }

  /** token → 账号名（审计留痕追责到人；未登录返回 anonymous）。 */
  getActorName(token?: string): string {
    if (!token) return 'anonymous'
    const accId = this.sessions.get(token)
    const acc = this.accounts.find((a) => a.id === accId)
    return acc?.name ?? token
  }

  /** 身份是否能执行某动作（无 token 一律拒绝敏感动作）。 */
  can(token: string | undefined, action: string): boolean {
    const role = this.getRole(token)
    if (!role) return false
    return roleCan(role, action)
  }

  createAccount(name: string, role: Role, password: string): Omit<TeamAccount, 'password'> {
    const acc: TeamAccount = {
      id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      role,
      password,
      createdAt: Date.now(),
    }
    this.accounts.push(acc)
    this.persist()
    const { password: _pw, ...rest } = acc
    return rest
  }

  authenticate(name: string, password: string): { token?: string; error?: string } {
    const acc = this.accounts.find((a) => a.name === name)
    if (!acc || acc.password !== password) return { error: '账号或口令错误' }
    const token = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`
    this.sessions.set(token, acc.id)
    return { token }
  }

  private persist(): void {
    if (!this.dir) return
    try {
      mkdirSync(this.dir, { recursive: true })
      writeFileSync(join(this.dir, 'accounts.json'), JSON.stringify(this.accounts, null, 2), 'utf8')
    } catch {
      /* 演示环境忽略落盘失败 */
    }
  }

  private load(): void {
    if (!this.dir) return
    try {
      const p = join(this.dir, 'accounts.json')
      if (existsSync(p)) this.accounts = JSON.parse(readFileSync(p, 'utf8'))
    } catch {
      /* 忽略损坏文件，沿用种子 */
    }
  }
}
