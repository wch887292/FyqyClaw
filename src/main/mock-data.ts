/**
 * 集中管理的 Mock 数据
 * 所有组件共享同一份数据源，便于维护和测试
 */

// ─── AI 模型 ───

export interface ModelEntry {
  id: string
  name: string
  modelId: string
  provider: string
  endpoint: string
  status: 'online' | 'offline' | 'error'
  latency: string
  enabled: boolean
}

export const mockModels: ModelEntry[] = [
  { id: 'gpt-4o', name: 'GPT-4o', modelId: 'gpt-4o', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1', status: 'online', latency: '320ms', enabled: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', modelId: 'gpt-4o-mini', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1', status: 'online', latency: '180ms', enabled: true },
  { id: 'claude-sonnet', name: 'Claude Sonnet 4', modelId: 'claude-sonnet-4-20250514', provider: 'Anthropic', endpoint: 'https://api.anthropic.com/v1', status: 'online', latency: '450ms', enabled: true },
  { id: 'deepseek-v3', name: 'DeepSeek V3', modelId: 'deepseek-chat', provider: 'DeepSeek', endpoint: 'https://api.deepseek.com/v1', status: 'online', latency: '280ms', enabled: false },
  { id: 'custom-model', name: '自定义模型', modelId: 'custom-model', provider: 'Custom', endpoint: 'http://localhost:11434/v1', status: 'error', latency: '-', enabled: false },
]

// ─── MCP 服务器 ───

export interface MCPServer {
  id: string
  name: string
  transport: 'http' | 'stdio' | 'ws'
  endpoint: string
  status: 'connected' | 'disconnected' | 'error'
  toolsCount: number
  description: string
}

export const mockServers: MCPServer[] = [
  { id: 'git-mcp', name: 'Git 操作工具', transport: 'http', endpoint: 'http://localhost:3100', status: 'connected', toolsCount: 8, description: '提供 Git 仓库管理、分支操作、提交管理等能力' },
  { id: 'fs-mcp', name: '文件系统工具', transport: 'stdio', endpoint: 'npx @modelcontextprotocol/server-filesystem', status: 'connected', toolsCount: 12, description: '提供文件读写、目录浏览、文件搜索等能力' },
  { id: 'github-mcp', name: 'GitHub 集成', transport: 'http', endpoint: 'https://api.github.com', status: 'connected', toolsCount: 6, description: '提供 Issue、PR、仓库管理等 GitHub API 能力' },
  { id: 'search-mcp', name: 'Web 搜索工具', transport: 'http', endpoint: 'http://localhost:3101', status: 'disconnected', toolsCount: 3, description: '提供网络搜索、网页抓取等信息获取能力' },
  { id: 'db-mcp', name: '数据库查询工具', transport: 'http', endpoint: 'http://localhost:3102', status: 'error', toolsCount: 0, description: '提供 SQL 查询、数据库连接管理能力' },
]

// ─── 技能 ───

export interface SkillEntry {
  id: string
  name: string
  description: string
  version: string
  author: string
  status: 'installed' | 'available' | 'updatable'
  category: string
}

export const mockSkills: SkillEntry[] = [
  { id: 'code-review', name: '代码审查', description: '自动检测代码问题，提供安全、性能、规范等多维度审查', version: '1.2.0', author: 'FyqyClaw', status: 'installed', category: '开发辅助' },
  { id: 'doc-generate', name: '文档生成', description: '为代码自动生成注释、API文档和README', version: '1.0.0', author: 'FyqyClaw', status: 'installed', category: '开发辅助' },
  { id: 'test-generate', name: '测试生成', description: '自动生成单元测试和集成测试代码', version: '0.9.0', author: 'FyqyClaw', status: 'installed', category: '测试' },
  { id: 'refactor-assist', name: '重构助手', description: '分析代码结构，提供重构建议和自动化重构', version: '1.1.0', author: 'FyqyClaw', status: 'updatable', category: '开发辅助' },
  { id: 'commit-msg', name: 'Commit 信息生成', description: '根据代码变更自动生成规范的提交信息', version: '1.0.0', author: 'FyqyClaw', status: 'installed', category: 'Git' },
  { id: 'db-analyzer', name: '数据库分析器', description: '分析SQL查询性能，提供索引优化建议', version: '0.8.0', author: 'Community', status: 'available', category: '数据库' },
  { id: 'api-tester', name: 'API 测试工具', description: '在IDE中直接测试REST API接口', version: '1.0.0', author: 'Community', status: 'available', category: '测试' },
  { id: 'i18n-helper', name: '国际化助手', description: '自动提取和翻译代码中的国际化字符串', version: '0.7.0', author: 'Community', status: 'available', category: '开发辅助' },
  { id: 'docker-helper', name: 'Docker 辅助', description: '生成 Dockerfile 和 docker-compose 配置', version: '0.6.0', author: 'Community', status: 'available', category: '部署' },
  { id: 'perf-analyzer', name: '性能分析器', description: '分析代码性能瓶颈，提供优化建议', version: '0.5.0', author: 'Community', status: 'available', category: '开发辅助' },
]

export const allSkills = mockSkills

// ─── 扩展（插件市场） ───

export interface ExtensionEntry {
  id: string
  name: string
  desc: string
  author: string
  installed: boolean
}

export const mockExtensions: ExtensionEntry[] = [
  { id: 'theme-ocean', name: 'Ocean Dark Theme', desc: '深海暗色主题', author: 'FyqyClaw', installed: true },
  { id: 'python-pack', name: 'Python 开发包', desc: 'Python 语言支持、调试、Lint', author: 'FyqyClaw', installed: false },
  { id: 'prettier', name: 'Prettier 格式化', desc: '代码格式化工具', author: 'Prettier', installed: false },
  { id: 'eslint', name: 'ESLint 集成', desc: 'JavaScript/TypeScript 代码检查', author: 'Microsoft', installed: false },
  { id: 'gitlens', name: 'GitLens 增强', desc: 'Git 历史记录与代码作者追溯', author: 'GitKraken', installed: false },
  { id: 'docker', name: 'Docker 支持', desc: 'Docker 容器管理与调试', author: 'Microsoft', installed: false },
]

// ─── AI 智能体 ───

export interface AgentEntry {
  id: string
  name: string
  description: string
  model: string
  status: string
  skills: string[]
}

export const mockAgents: AgentEntry[] = [
  { id: 'code-search', name: '代码检索智能体', description: '基于语义索引快速定位项目内代码片段、函数定义、依赖调用关系', model: 'GPT-4o', status: '就绪', skills: ['代码审查', '文档生成'] },
  { id: 'terminal-exec', name: '终端执行智能体', description: '安全调用系统终端，执行命令行操作、项目构建、服务启停', model: 'Claude 3.5', status: '就绪', skills: ['代码重构'] },
  { id: 'file-ops', name: '文件操作智能体', description: '负责文件创建、修改、删除、目录结构调整，自动备份变更前文件', model: 'GPT-4o', status: '就绪', skills: [] },
  { id: 'git-ops', name: 'Git 操作智能体', description: '封装完整 Git 工作流，自动完成代码提交、分支管理、差异对比', model: 'GPT-4o', status: '就绪', skills: [] },
  { id: 'doc-parse', name: '文档解析智能体', description: '解析 Word、PDF、Markdown、接口文档等多格式文件', model: 'Claude 3.5', status: '待配置', skills: ['文档生成'] },
  { id: 'db-agent', name: '数据库操作智能体', description: '连接主流数据库，执行表结构查询、SQL 生成、数据导入导出', model: '—', status: '待配置', skills: [] },
  { id: 'deploy-agent', name: '部署运维智能体', description: '对接服务器、容器平台、CI/CD 系统，自动完成构建部署与监控', model: '—', status: '待配置', skills: [] },
]

// ─── AI 审查结果 ───

export interface AIReviewEntry {
  severity: 'error' | 'warning' | 'info'
  file: string
  line: number
  message: string
  suggestion: string
}

export const mockReviewResults: AIReviewEntry[] = [
  { severity: 'error', file: 'src/api/server.ts', line: 42, message: 'API 密钥硬编码在源码中', suggestion: '使用环境变量或密钥管理服务存储敏感信息' },
  { severity: 'error', file: 'src/utils/auth.ts', line: 15, message: 'SQL 查询存在注入风险', suggestion: '使用参数化查询或 ORM 框架替代字符串拼接' },
  { severity: 'warning', file: 'src/components/App.tsx', line: 88, message: '组件中使用了 console.log 调试日志', suggestion: '建议移除调试日志，或使用专用日志框架' },
  { severity: 'warning', file: 'src/hooks/useData.ts', line: 33, message: 'useEffect 缺少依赖项', suggestion: '添加缺失的依赖项到依赖数组' },
  { severity: 'info', file: 'src/styles/global.css', line: 120, message: '代码中包含 TODO 标记', suggestion: '建议在提交前完成或跟踪这些标记项' },
  { severity: 'info', file: 'src/model-adapter/manager.ts', line: 56, message: '使用 any 类型', suggestion: '建议使用更具体的类型定义，或使用 unknown 替代 any' },
]