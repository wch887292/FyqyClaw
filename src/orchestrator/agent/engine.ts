import type { AgentTask, AgentStep, ChatMessage } from '@shared/types/ai'
import type { AgentCapability, ExecutionPlan, ExecutionStep, AgentStatus, SelfHealingConfig, ErrorReport, ChangeSummary } from './types'
import { TaskPlanner } from '../planner/task-planner'
import { ContextManager } from '../context/context-manager'
import { CodeReviewEngine } from '../review/code-review'
import { ModelAdapterManager } from '../../model-adapter/manager'
import type { ModelConfig } from '../../model-adapter/types'
import { writeFile } from '../../main/utils/electron-bridge'
import path from 'path'

interface ParsedCodeBlock {
  language: string
  filePath?: string
  code: string
}

interface FileChange {
  filePath: string
  language: string
  content: string
  action: 'created' | 'modified'
}

export class AgentEngine {
  private status: AgentStatus = 'idle'
  private currentTask: AgentTask | null = null
  private capabilities: Map<string, AgentCapability> = new Map()
  private planner: TaskPlanner
  private contextManager: ContextManager
  private codeReview: CodeReviewEngine
  private modelManager: ModelAdapterManager
  private modelConfig: ModelConfig | null = null
  private onProgress?: (task: AgentTask) => void
  private selfHealing: SelfHealingConfig = {
    maxRetries: 2,
    retryDelayMs: 500,
    enableAutoFix: true,
    fallbackStrategy: 'retry',
  }
  private errorHistory: ErrorReport[] = []
  private changeSummary: ChangeSummary = {
    taskId: '',
    description: '',
    filesChanged: [],
    changes: [],
    statistics: { totalFiles: 0, totalLinesAdded: 0, totalLinesRemoved: 0, languages: [], estimatedEffort: 'low' },
    generatedAt: 0,
  }
  private generatedFiles: FileChange[] = []
  private workspaceRoot: string | undefined
  private workspaceResolver: () => string | undefined = () => undefined
  private fileWriter: (absPath: string, content: string) => Promise<boolean> = (p, c) => writeFile(p, c)
  private writtenPaths: Set<string> = new Set()

  constructor(modelManager?: ModelAdapterManager) {
    this.modelManager = modelManager || new ModelAdapterManager()
    this.planner = new TaskPlanner()
    this.contextManager = new ContextManager()
    this.codeReview = new CodeReviewEngine()
    this.registerDefaultCapabilities()
  }

  /** 配置 AI 模型 */
  configureModel(config: ModelConfig): void {
    this.modelConfig = config
    this.modelManager.configureCustomModel(config)
    console.log(
      `[SOLO] 🎯 AI 模型已配置`,
      `\n  模型: ${config.modelName}`,
      `\n  接口: ${config.endpoint || '(默认)'}`,
      `\n  提供商: ${config.provider}`,
      `\n  Temperature: ${config.temperature ?? 0.7}`,
      `\n  MaxTokens: ${config.maxTokens ?? 4096}`,
      `\n  API Key: ${config.apiKey ? '***' + config.apiKey.slice(-4) : '(未设置)'}`
    )
  }

  /** 调用 AI 模型 */
  private async callAI(messages: ChatMessage[]): Promise<string> {
    if (!this.modelConfig) {
      console.warn('[SOLO] ⚠️ AI 模型未配置，跳过 AI 调用')
      return '⚠️ 未配置 AI 模型。请在设置中心 → AI 模型 中配置模型后再使用 SOLO 模式。'
    }

    const modelName = this.modelConfig.modelName
    const userMsg = messages.find(m => m.role === 'user')
    const systemMsg = messages.find(m => m.role === 'system')
    const startTime = Date.now()

    console.log(
      `[SOLO] 🤖 AI 调用开始`,
      `\n  模型: ${modelName}`,
      `\n  System Prompt: ${systemMsg ? systemMsg.content.substring(0, 80) + '...' : '(无)'}`,
      `\n  User Prompt: ${userMsg ? userMsg.content.substring(0, 100) + '...' : '(无)'}`,
      `\n  消息数: ${messages.length}`
    )

    try {
      const response = await this.modelManager.complete({
        model: modelName,
        messages,
        temperature: 0.7,
        maxTokens: 4096,
      })

      const elapsed = Date.now() - startTime
      console.log(
        `[SOLO] ✅ AI 调用成功`,
        `\n  耗时: ${elapsed}ms`,
        `\n  Token 数: ${response.usage ? `输入 ${response.usage.promptTokens} + 输出 ${response.usage.completionTokens} = 总计 ${response.usage.totalTokens}` : '未知'}`,
        `\n  响应长度: ${response.content.length} 字符`,
        `\n  响应预览: ${response.content.substring(0, 120)}...`
      )

      return response.content
    } catch (error: any) {
      const elapsed = Date.now() - startTime
      console.error(
        `[SOLO] ❌ AI 调用失败`,
        `\n  耗时: ${elapsed}ms`,
        `\n  错误类型: ${error.name || 'Unknown'}`,
        `\n  错误信息: ${error.message || '未知错误'}`,
        `\n  模型: ${modelName}`,
        `\n  接口: ${this.modelConfig.endpoint || '(默认)'}`
      )
      return `⚠️ AI 调用出错: ${error.message || '未知错误'}\n\n请检查：\n1. 模型服务是否已启动\n2. API Key 是否正确\n3. 接口地址是否正确`
    }
  }

  private registerDefaultCapabilities(): void {
    this.registerCapability({
      name: 'generate',
      description: '根据需求生成代码文件',
      retryable: true,
      timeout: 60000,
      execute: async (params) => {
        // planner 步骤参数含 originalDescription（需求原文），兼容直接调用时的 description
        const { language } = params as { description?: string; language?: string }
        const description = ((params as { description?: string }).description ??
          (params as { originalDescription?: string }).originalDescription ??
          '').toString()
        console.log(
          `[SOLO] [Capability] 🔨 开始生成代码`,
          `\n  语言: ${language || '未指定'}`,
          `\n  需求: ${description.substring(0, 120)}${description.length > 120 ? '...' : ''}`
        )
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: `你是一个资深全栈工程师，精通前端（React/Vue/TypeScript/HTML/CSS）、后端（Node.js/Python/Go/Java）和系统架构设计。

请根据用户需求生成高质量的、可直接运行的代码。要求：
1. 代码完整、可运行，包含必要的 import/require 语句
2. 包含关键注释，说明核心逻辑
3. 遵循语言和框架的最佳实践
4. 考虑错误处理和边界情况
5. 使用 markdown 代码块输出，并在代码块开始标注文件名
   - 格式: \`\`\`typescript:src/example.ts 或 \`\`\`typescript src/example.ts
   - 如果无法确定文件名，使用 \`\`\`language 标注语言即可`,
          },
          {
            role: 'user',
            content: `请生成 ${language || '代码'} 实现以下需求：\n\n${description}`,
          },
        ]
        const result = await this.callAI(messages)
        console.log(
          `[SOLO] [Capability] ✅ 代码生成完成`,
          `\n  输出长度: ${result.length} 字符`,
          `\n  输出预览: ${result.substring(0, 100)}...`
        )

        // Parse code blocks from AI output
        const codeBlocks = this.parseCodeBlocks(result)
        if (codeBlocks.length > 0) {
          console.log(
            `[SOLO] [Capability] 📦 解析到 ${codeBlocks.length} 个代码块`,
            ...codeBlocks.map(b => `\n    - ${b.language}${b.filePath ? `: ${b.filePath}` : ''} (${b.code.split('\n').length} 行)`)
          )
          await this.applyCodeBlocks(codeBlocks, 'generate')
        } else {
          console.log(`[SOLO] [Capability] ⚠️ 未从 AI 输出中解析到代码块，原始输出将作为文本返回`)
        }

        return result
      },
    })

    this.registerCapability({
      name: 'modify',
      description: '修改现有代码文件',
      retryable: true,
      timeout: 60000,
      execute: async (params) => {
        // 兼容 planner 步骤参数（originalDescription）与直接调用（description）
        const { language } = params as { description?: string; language?: string }
        const description = ((params as { description?: string }).description ??
          (params as { originalDescription?: string }).originalDescription ??
          '').toString()
        console.log(
          `[SOLO] [Capability] ✏️ 开始修改代码`,
          `\n  需求: ${description.substring(0, 120)}${description.length > 120 ? '...' : ''}`
        )
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: `你是一个资深全栈工程师，擅长在现有代码基础上进行精准修改。

请根据用户需求修改代码。要求：
1. 保持原有代码风格与架构
2. 只输出需要修改或新增的代码
3. 使用 markdown 代码块输出，并在代码块开始标注目标文件名
   - 格式: \`\`\`typescript:src/example.ts 或 \`\`\`typescript src/example.ts`,
          },
          {
            role: 'user',
            content: `请修改 ${language || '代码'} 实现以下需求：\n\n${description}`,
          },
        ]
        const result = await this.callAI(messages)
        const codeBlocks = this.parseCodeBlocks(result)
        if (codeBlocks.length > 0) {
          await this.applyCodeBlocks(codeBlocks, 'modify')
        }
        return result
      },
    })

    this.registerCapability({
      name: 'analyze',
      description: '分析代码结构和逻辑',
      retryable: true,
      timeout: 60000,
      execute: async (params) => {
        // planner 步骤传 intent/language/framework/detail（无 code），直接调用可能传 code；
        // 兼容两者：有 code 则分析代码，否则基于需求描述做需求/方案分析
        const p = params as { code?: string; intent?: string; language?: string; framework?: string; detail?: string; description?: string; originalDescription?: string }
        const code = p.code || ''
        if (!code || code.length < 10) {
          const intentText = p.intent || '通用'
          const desc = p.description || p.originalDescription || ''
          console.log(`[SOLO] [Capability] 🔍 开始分析（无代码输入，基于需求描述）`, `\n  意图: ${intentText}`, `\n  语言: ${p.language || '未指定'}`, `\n  框架: ${p.framework || '未指定'}`)
          const messages: ChatMessage[] = [
            {
              role: 'system',
              content: '你是一位资深的软件架构师，擅长需求分析、技术方案设计与风险识别。请基于给定的需求信息给出：1) 需求理解 2) 技术选型建议 3) 关键风险与注意事项。',
            },
            {
              role: 'user',
              content: `需求意图: ${intentText}\n${desc ? `需求描述: ${desc}\n` : ''}${p.detail ? `细节: ${p.detail}\n` : ''}${p.language ? `语言: ${p.language}\n` : ''}${p.framework ? `框架: ${p.framework}` : ''}`,
            },
          ]
          const result = await this.callAI(messages)
          console.log(`[SOLO] [Capability] ✅ 分析完成（描述分析），输出长度: ${result.length} 字符`)
          return result
        }
        const truncated = code.length > 8000 ? code.substring(0, 8000) + '\n\n... (代码过长，已截断)' : code
        console.log(
          `[SOLO] [Capability] 🔍 开始分析代码`,
          `\n  原始长度: ${code.length} 字符`,
          `\n  截断后: ${truncated.length} 字符`,
          `\n  代码预览: ${code.substring(0, 80)}...`
        )
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: `你是一个资深代码审查专家，精通代码分析、性能优化、安全审计和架构评估。

请分析用户提供的代码，从以下维度给出专业评估：
1. 代码结构与逻辑
2. 潜在问题与风险
3. 性能优化建议
4. 安全漏洞检查
5. 可维护性评估`,
          },
          {
            role: 'user',
            content: `请分析以下代码：\n\n\`\`\`\n${truncated}\n\`\`\``,
          },
        ]
        const result = await this.callAI(messages)
        console.log(
          `[SOLO] [Capability] ✅ 代码分析完成`,
          `\n  分析结果长度: ${result.length} 字符`
        )
        return result
      },
    })

    this.registerCapability({
      name: 'test',
      description: '生成测试策略并在支持的环境下真实运行测试命令',
      retryable: true,
      timeout: 60000,
      execute: async (params) => {
        const { command } = params as { command: string }
        const testCommand = command || 'npm test'
        console.log(
          `[SOLO] [Capability] 🧪 开始测试（生成策略 + 真实运行）`,
          `\n  测试命令: ${testCommand}`
        )
        // 1) AI 生成测试策略与用例建议
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: `你是一个资深测试工程师，精通自动化测试策略、单元测试、集成测试和端到端测试。

请根据测试需求提供：
1. 测试策略与范围
2. 需要覆盖的测试用例
3. 预期结果
4. 测试工具和框架建议`,
          },
          {
            role: 'user',
            content: `测试需求：${testCommand}`,
          },
        ]
        const plan = await this.callAI(messages)

        // 2) 真实运行测试命令（经沙箱策略加固的主进程边界）
        const run = await this.runShellCommand(testCommand)
        const runBlock = run.blocked
          ? `\n\n### 真实执行结果\n⚠️ 命令被安全策略拦截，未执行。`
          : `\n\n### 真实执行结果 (exit ${run.ok ? 0 : 1})\n\`\`\`\n${run.output.slice(0, 2000)}\n\`\`\``

        console.log(`[SOLO] [Capability] ✅ 测试完成（策略长度 ${plan.length}，运行 ${run.ok ? '成功' : '失败/受限'}）`)
        return `${plan}${runBlock}`
      },
    })

    this.registerCapability({
      name: 'fix',
      description: '自动修复代码问题',
      retryable: true,
      timeout: 60000,
      execute: async (params) => {
        const { issue } = params as { issue: string }
        console.log(
          `[SOLO] [Capability] 🔧 开始修复问题`,
          `\n  问题描述: ${issue ? issue.substring(0, 120) : '未知问题'}`
        )
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: `你是一个资深调试工程师，精通问题定位、根因分析和代码修复。

请根据问题描述：
1. 分析问题根因
2. 提供修复方案
3. 给出修复后的代码
4. 说明修复原理
5. 使用 markdown 代码块输出修复代码，标注文件名`,
          },
          {
            role: 'user',
            content: `问题描述：${issue || '未知问题，请分析代码并修复潜在错误'}`,
          },
        ]
        const result = await this.callAI(messages)
        console.log(
          `[SOLO] [Capability] ✅ 修复完成`,
          `\n  修复结果长度: ${result.length} 字符`
        )

        // Parse code blocks from AI output
        const codeBlocks = this.parseCodeBlocks(result)
        if (codeBlocks.length > 0) {
          console.log(
            `[SOLO] [Capability] 📦 修复解析到 ${codeBlocks.length} 个代码块`,
            ...codeBlocks.map(b => `\n    - ${b.language}${b.filePath ? `: ${b.filePath}` : ''}`)
          )
          await this.applyCodeBlocks(codeBlocks, 'fix')
        }

        return result
      },
    })

    this.registerCapability({
      name: 'review',
      description: '对生成/修改的代码做 AI 代码审查',
      retryable: true,
      timeout: 60000,
      execute: async (params) => {
        // 审查真实落盘/生成的文件（与 Phase 3 相同的可信审查逻辑），
        // 让 planner 计划中的 review 步骤不再是占位输出
        const { language, filePath } = params as { language?: string; filePath?: string }
        if (this.generatedFiles.length === 0) {
          console.log(`[SOLO] [Capability] 👀 审查跳过：无生成文件`)
          return '审查跳过：本次任务没有生成或修改任何代码文件。'
        }
        const codeDiff = this.generatedFiles
          .map(f => `=== ${f.filePath} ===\n` + f.content.split('\n').map(l => `+ ${l}`).join('\n'))
          .join('\n')
        const results = await this.codeReview.review({
          diff: codeDiff,
          language: language || this.generatedFiles[0].language,
          filePath: filePath || this.generatedFiles[0].filePath,
        })
        const summary = results.length > 0
          ? results.map(r => `- [${r.severity}] 行${r.line}: ${r.message}`).join('\n')
          : '未发现明显问题。'
        console.log(`[SOLO] [Capability] 👀 代码审查完成，发现问题: ${results.length} 个`)
        return `### 代码审查结果\n\n${summary}`
      },
    })
  }

  registerCapability(capability: AgentCapability): void {
    this.capabilities.set(capability.name, capability)
  }

  /** 设置 SOLO 写盘的工作区根目录（用户已打开的项目目录） */
  setWorkspaceRoot(root: string | undefined): void {
    this.workspaceRoot = root || undefined
  }

  /** 注入工作区根目录解析器（运行时从应用状态读取，避免直接耦合 UI store） */
  setWorkspaceResolver(resolver: () => string | undefined): void {
    this.workspaceResolver = resolver
  }

  /** 注入落盘实现，便于测试与不同运行环境替换 */
  setFileWriter(writer: (absPath: string, content: string) => Promise<boolean>): void {
    this.fileWriter = writer
  }

  /**
   * 相对路径解析为绝对路径。
   * 安全约束：
   *  - 绝对路径：仅当落在工作区根目录内才允许（防写到 /etc、~/.ssh 等任意位置）；越界返回 null
   *  - 未设置工作区根目录时：拒绝任何写盘路径（要求用户先打开项目目录），返回 null
   */
  private resolvePath(filePath: string): string | null {
    const root = this.workspaceRoot || this.workspaceResolver?.()
    if (!root || root === '/') {
      // 无安全根目录：拒绝写盘，要求用户先打开项目目录
      return null
    }
    const isAbs = filePath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(filePath)
    const abs = isAbs ? filePath : path.resolve(root, filePath)
    const rel = path.relative(root, abs)
    const within = rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
    return within ? abs : null
  }

  setOnProgress(callback: (task: AgentTask) => void): void {
    this.onProgress = callback
  }

  setSelfHealing(config: Partial<SelfHealingConfig>): void {
    this.selfHealing = { ...this.selfHealing, ...config }
  }

  async executeTask(description: string): Promise<AgentTask> {
    this.status = 'planning'
    this.errorHistory = []
    this.generatedFiles = []
    this.writtenPaths.clear()
    // 从运行时解析器刷新工作区根目录（用户已打开的项目目录），保证生成代码落盘到正确位置
    this.workspaceRoot = this.workspaceResolver() || this.workspaceRoot
    const taskId = `task-${Date.now()}`

    console.log(
      `%c[SOLO] 🚀 任务开始`,
      `\n  任务 ID: ${taskId}`,
      `\n  描述: ${description}`,
      `\n  ==========================================`
    )

    this.changeSummary = {
      taskId,
      description,
      filesChanged: [],
      changes: [],
      statistics: { totalFiles: 0, totalLinesAdded: 0, totalLinesRemoved: 0, languages: [], estimatedEffort: 'low' },
      generatedAt: 0,
    }

    this.currentTask = {
      id: taskId,
      description,
      status: 'planning',
      steps: [],
    }
    this.notifyProgress()

    // Phase 1: Deep Planning
    console.log(`[SOLO] 📋 Phase 1: 需求分析与任务规划...`)
    const plan = await this.planner.createPlan(description)
    console.log(
      `[SOLO] ✅ 任务规划完成`,
      `\n  步骤数: ${plan.steps.length}`,
      `\n  复杂度: ${plan.estimatedComplexity}`,
      `\n  步骤列表:`,
      ...plan.steps.map((s, i) => `\n    ${i + 1}. [${s.action}] ${s.description} (依赖: ${s.dependsOn.join(', ') || '无'})`)
    )

    this.status = 'executing'
    this.currentTask!.status = 'executing'
    this.currentTask!.steps = plan.steps.map(s => ({
      id: s.id,
      description: s.description,
      action: s.action,
      status: 'pending',
    }))
    this.notifyProgress()

    // Phase 2: Execute with parallel support and self-healing
    console.log(`[SOLO] ⚡ Phase 2: 开始执行 (${plan.steps.length} 个步骤, 自动修复: ${this.selfHealing.enableAutoFix ? '开启' : '关闭'})`)
    const executedSteps = new Set<string>()

    const executeStep = async (step: ExecutionStep): Promise<void> => {
      const taskStep = this.currentTask!.steps.find(s => s.id === step.id)!
      if (!taskStep || taskStep.status === 'completed') {
        console.log(`[SOLO]   ⏭️ 步骤 ${step.id} 跳过 (已完成)`)
        return
      }

      console.log(`[SOLO]   ▶️ 步骤 ${step.id} 开始: [${step.action}] ${step.description}`)
      taskStep.status = 'running'
      this.notifyProgress()

      // Check dependencies
      for (const depId of step.dependsOn) {
        const depStep = this.currentTask!.steps.find(s => s.id === depId)
        if (depStep && depStep.status !== 'completed') {
          console.log(`[SOLO]   ⏳ 步骤 ${step.id} 等待依赖 ${depId} 完成`)
          taskStep.status = 'pending'
          return
        }
      }

      let lastError: Error | null = null
      const maxAttempts = this.selfHealing.enableAutoFix ? this.selfHealing.maxRetries + 1 : 1

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const stepStartTime = Date.now()
        try {
          const capability = this.capabilities.get(step.action)
          if (capability) {
            console.log(`[SOLO]   🔄 步骤 ${step.id} 执行能力: ${capability.name} (尝试 ${attempt}/${maxAttempts})`)
            // 能力级超时保护：即使模型适配器未内置超时，也不会无限挂起；
            // 能力提前完成时清除定时器，避免悬挂的 timer 引用
            const timeoutMs = capability.timeout || 120000
            let timeoutId: ReturnType<typeof setTimeout> | undefined
            const timeoutPromise = new Promise<string>((_, reject) => {
              timeoutId = setTimeout(() => reject(new Error(`能力 ${capability.name} 执行超时（${timeoutMs}ms）`)), timeoutMs)
            })
            try {
              taskStep.output = await Promise.race([capability.execute(step.params), timeoutPromise])
            } finally {
              if (timeoutId) clearTimeout(timeoutId)
            }
          } else {
            console.log(`[SOLO]   ⚠️ 步骤 ${step.id} 无匹配能力，使用默认执行`)
            taskStep.output = `步骤 ${step.action} 已执行`
          }
          taskStep.status = 'completed'
          executedSteps.add(step.id)
          const stepElapsed = Date.now() - stepStartTime
          console.log(
            `[SOLO]   ✅ 步骤 ${step.id} 完成`,
            `\n    耗时: ${stepElapsed}ms`,
            `\n    输出: ${(taskStep.output || '').substring(0, 80)}...`
          )
          this.notifyProgress()

          // Track changes for summary
          this.trackChange(step)
          return
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error))
          const stepElapsed = Date.now() - stepStartTime

          const errorReport: ErrorReport = {
            stepId: step.id,
            error: lastError.message,
            errorType: this.classifyError(lastError.message),
            timestamp: Date.now(),
            context: { attempt, action: step.action, elapsed: stepElapsed },
          }
          this.errorHistory.push(errorReport)

          console.error(
            `[SOLO]   ❌ 步骤 ${step.id} 失败 (尝试 ${attempt}/${maxAttempts})`,
            `\n    耗时: ${stepElapsed}ms`,
            `\n    错误: ${lastError.message}`
          )

          if (attempt < maxAttempts && this.selfHealing.enableAutoFix) {
            // Auto-fix attempt
            taskStep.output = `尝试自动修复 (${attempt}/${maxAttempts}): ${lastError.message}`
            console.log(`[SOLO]   🔧 步骤 ${step.id} 自动修复中... (延迟 ${this.selfHealing.retryDelayMs}ms)`)
            this.notifyProgress()
            await this.delay(this.selfHealing.retryDelayMs)
          }
        }
      }

      // All attempts failed
      taskStep.status = 'failed'
      taskStep.output = `执行失败: ${lastError?.message || '未知错误'}`
      console.error(`[SOLO]   🚫 步骤 ${step.id} 最终失败: ${lastError?.message}`)
      this.notifyProgress()
    }

    // Execute steps with topological ordering and parallel execution
    const stepQueue = [...plan.steps]
    let batchIndex = 0

    while (stepQueue.length > 0) {
      const batch: ExecutionStep[] = []

      // Find steps whose dependencies are all satisfied
      for (const step of stepQueue) {
        const depsSatisfied = step.dependsOn.every(depId => executedSteps.has(depId))
        if (depsSatisfied) {
          batch.push(step)
        }
      }

      if (batch.length === 0) {
        console.warn(`[SOLO] ⚠️ 检测到循环依赖或无法满足的依赖，终止执行`)
        // Circular dependency or all remaining steps have unsatisfied deps
        stepQueue.length = 0
        break
      }

      // Remove batch from queue
      for (const b of batch) {
        const idx = stepQueue.indexOf(b)
        if (idx !== -1) stepQueue.splice(idx, 1)
      }

      batchIndex++
      console.log(`[SOLO]   📦 批次 ${batchIndex}: ${batch.length} 个步骤并行执行 (${batch.map(s => s.id).join(', ')})`)

      // Execute batch in parallel
      await Promise.all(batch.map(step => executeStep(step)))

      // Check if any step failed
      const failedSteps = batch.filter(s => {
        const ts = this.currentTask!.steps.find(ts => ts.id === s.id)
        return ts?.status === 'failed'
      })

      if (failedSteps.length > 0) {
        console.warn(
          `[SOLO] ⚠️ 批次 ${batchIndex} 中有 ${failedSteps.length} 个步骤失败`,
          `\n  失败策略: ${this.selfHealing.fallbackStrategy}`
        )
        if (this.selfHealing.fallbackStrategy === 'abort') {
          console.error(`[SOLO] 🛑 终止策略触发，任务失败`)
          this.currentTask!.status = 'failed'
          this.currentTask!.error = `步骤 ${failedSteps[0].id} 执行失败`
          this.status = 'error'
          this.notifyProgress()
          return this.currentTask!
        }
        // For 'skip' strategy, continue with remaining steps
      }
    }

    // Phase 3: Code Review
    console.log(`[SOLO] 🔍 Phase 3: 代码审查...`)
    this.status = 'reviewing'
    this.currentTask!.status = 'reviewing'
    this.notifyProgress()

    const reviewStartTime = Date.now()
    // 审查真实落盘/生成的代码，而非任务描述（可信化：杜绝"审的是描述"的假审查）
    const hasCode = this.generatedFiles.length > 0
    const codeDiff = hasCode
      ? this.generatedFiles
          .map(f => `=== ${f.filePath} ===\n` + f.content.split('\n').map(l => `+ ${l}`).join('\n'))
          .join('\n')
      : description
    const reviewResults = await this.codeReview.review({
      diff: codeDiff,
      language: hasCode ? this.generatedFiles[0].language : 'unknown',
      filePath: hasCode ? this.generatedFiles[0].filePath : 'agent-task',
    })
    console.log(
      `[SOLO] ✅ 代码审查完成`,
      `\n  耗时: ${Date.now() - reviewStartTime}ms`,
      `\n  发现问题: ${reviewResults.length} 个`,
      reviewResults.length > 0 ? `\n  问题详情:\n${reviewResults.map(r => `    - [${r.severity}] 行${r.line}: ${r.message}`).join('\n')}` : ''
    )

    // Phase 4: Generate Change Summary
    console.log(`[SOLO] 📝 Phase 4: 生成变更汇总...`)
    this.changeSummary.generatedAt = Date.now()
    const summaryText = this.generateSummaryText()

    // Phase 5: Complete
    // 最终状态由步骤结果汇总：存在失败/未执行步骤时标记 failed，而非无条件 completed
    const allSteps = this.currentTask!.steps
    const failedStep = allSteps.find(s => s.status === 'failed')
    const hasPending = allSteps.some(s => s.status === 'pending')
    if (failedStep) {
      this.status = 'error'
      this.currentTask!.status = 'failed'
      this.currentTask!.error = `步骤 ${failedStep.id} 执行失败: ${failedStep.output || '未知错误'}`
      this.currentTask!.result = summaryText
      this.notifyProgress()
      console.warn(`[SOLO] ⚠️ 任务完成但有 ${this.errorHistory.length} 个错误，状态标记为 failed`)
      return this.currentTask!
    }
    if (hasPending) {
      console.warn(`[SOLO] ⚠️ 存在未执行的步骤（依赖失败被跳过），任务标记为 failed`)
      this.status = 'error'
      this.currentTask!.status = 'failed'
      this.currentTask!.error = '部分步骤未执行（依赖失败被跳过）'
      this.currentTask!.result = summaryText
      this.notifyProgress()
      return this.currentTask!
    }
    this.status = 'completed'
    this.currentTask!.status = 'completed'
    this.currentTask!.result = summaryText
    this.notifyProgress()

    console.log(
      `%c[SOLO] ✅ 任务执行完成`,
      `\n  任务 ID: ${taskId}`,
      `\n  错误历史: ${this.errorHistory.length} 条`,
      `\n  ==========================================`
    )

    return this.currentTask!
  }

  private trackChange(_step: ExecutionStep): void {
    // 基于真实落盘/生成的文件重新汇总，杜绝伪造的 file-N 占位与硬编码行数
    const stats = this.changeSummary.statistics
    stats.totalFiles = this.generatedFiles.length
    stats.totalLinesAdded = this.generatedFiles.reduce((sum, f) => sum + f.content.split('\n').length, 0)
    stats.totalLinesRemoved = 0
    stats.languages = [...new Set(this.generatedFiles.map(f => f.language))]
  }

  private generateSummaryText(): string {
    const stats = this.changeSummary.statistics
    const fileChanges = this.generatedFiles

    const filesSection = fileChanges.length > 0
      ? [
          `\n### 📁 文件变更 (${fileChanges.length} 个)`,
          ...fileChanges.map(f =>
            `- ${f.action === 'created' ? '🆕' : '✏️'} \`${f.filePath}\` (${f.language}, ${f.content.split('\n').length} 行)`
          ),
        ].join('\n')
      : ''

    const codePreview = fileChanges.length > 0
      ? [
          `\n### 📄 代码预览`,
          ...fileChanges.slice(0, 3).map(f => [
            `\n**${f.filePath}**`,
            '```' + f.language,
            f.content.split('\n').slice(0, 20).join('\n') + (f.content.split('\n').length > 20 ? '\n...' : ''),
            '```',
          ].join('\n')),
          fileChanges.length > 3 ? `\n*...以及 ${fileChanges.length - 3} 个其他文件*` : '',
        ].join('\n')
      : ''

    return [
      `## ✅ 任务执行完成`,
      ``,
      `### 变更汇总`,
      `- 修改文件: ${stats.totalFiles} 个`,
      `- 新增行数: ${stats.totalLinesAdded} 行`,
      `- 删除行数: ${stats.totalLinesRemoved} 行`,
      `- 涉及语言: ${stats.languages.length > 0 ? stats.languages.join(', ') : '多种'}`,
      `- 预估工作量: ${stats.estimatedEffort}`,
      filesSection,
      ``,
      `### 执行详情`,
      ...this.currentTask?.steps.map(s =>
        `- ${s.status === 'completed' ? '✅' : '❌'} ${s.description}`
      ) || [],
      ``,
      this.errorHistory.length > 0 ? `### 错误与修复\n共处理 ${this.errorHistory.length} 个异常\n` : '',
      codePreview,
      ``,
      `### 审查建议`,
      `请人工审核确认变更内容，确保符合项目规范。`,
    ].join('\n')
  }

  private classifyError(message: string): ErrorReport['errorType'] {
    const lower = message.toLowerCase()
    if (lower.includes('timeout') || lower.includes('超时')) return 'timeout'
    if (lower.includes('permission') || lower.includes('权限') || lower.includes('denied')) return 'permission'
    if (lower.includes('dependency') || lower.includes('依赖') || lower.includes('module')) return 'dependency'
    return 'runtime'
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 经已加固的沙箱边界执行命令（spawn 前主进程强制策略 + 隐私/白名单）。
   * 非 Electron 环境（如测试）下不可用，调用方应自行降级。
   */
  private async runShellCommand(command: string): Promise<{ ok: boolean; output: string; blocked?: boolean }> {
    const electronAPI = (typeof window !== 'undefined' && (window as any).electronAPI) || null
    if (!electronAPI?.invoke) {
      return { ok: false, output: '当前环境不支持执行命令（仅 Electron 桌面端可运行测试）' }
    }
    try {
      const res = await electronAPI.invoke('sandbox:execute', {
        id: `agent-test-${Date.now()}`,
        command,
        cwd: this.workspaceRoot || this.workspaceResolver?.() || undefined,
        timeout: 60000,
      })
      return {
        ok: res.exitCode === 0,
        output: res.stdout || res.stderr || '',
        blocked: !!res.wasBlocked,
      }
    } catch (err: any) {
      return { ok: false, output: `命令执行失败: ${err?.message || err}` }
    }
  }

  /**
   * Parse AI output to extract code blocks with optional file paths
   * Supports formats:
   *   ```language:file/path.ts
   *   ```language file/path.ts
   *   // file: path/to/file.ts  (comment before code block)
   *   ## File: path/to/file.ts  (markdown heading before code block)
   */
  private parseCodeBlocks(aiOutput: string): ParsedCodeBlock[] {
    const blocks: ParsedCodeBlock[] = []
    const lines = aiOutput.split('\n')
    let currentBlock: { language: string; filePath?: string; code: string[] } | null = null
    let pendingFilePath: string | null = null

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]

      // Detect file path from preceding comment or heading
      const filePathMatch = line.match(/^(?:\/\/|#|<!--)\s*file:\s*(.+?)(?:\s*-->)?\s*$/i)
      if (filePathMatch) {
        pendingFilePath = filePathMatch[1].trim()
        continue
      }
      const mdFilePathMatch = line.match(/^##\s*File:\s*(.+)$/i)
      if (mdFilePathMatch) {
        pendingFilePath = mdFilePathMatch[1].trim()
        continue
      }

      // Detect code block start
      // 支持语言为任意字符（c++/c#/bash/.env 等），路径分隔支持 冒号/横线/空格（```typescript src/a.ts）
      const fenceStart = line.match(/^```([A-Za-z0-9_+#.\-]*)?(?:\s*[:-]\s*|\s+)(.+)$/) ||
        line.match(/^```([A-Za-z0-9_+#.\-]*)$/)
      if (fenceStart) {
        if (currentBlock) {
          // Close current block (nested/accidental)
          blocks.push({
            language: currentBlock.language,
            filePath: currentBlock.filePath || pendingFilePath || undefined,
            code: currentBlock.code.join('\n'),
          })
          pendingFilePath = null
        }
        currentBlock = {
          language: fenceStart[1] || 'text',
          filePath: fenceStart[2]?.trim() || pendingFilePath || undefined,
          code: [],
        }
        pendingFilePath = null
        continue
      }

      // Detect code block end
      if (currentBlock && line.startsWith('```')) {
        blocks.push({
          language: currentBlock.language,
          filePath: currentBlock.filePath || undefined,
          code: currentBlock.code.join('\n'),
        })
        currentBlock = null
        pendingFilePath = null
        continue
      }

      // Accumulate code inside block
      if (currentBlock) {
        currentBlock.code.push(line)
      }
    }

    // Close unclosed block
    if (currentBlock) {
      blocks.push({
        language: currentBlock.language,
        filePath: currentBlock.filePath || pendingFilePath || undefined,
        code: currentBlock.code.join('\n'),
      })
    }

    return blocks
  }

  /**
   * 将解析出的代码块落地为真实文件变更（写盘）
   * 相对路径基于工作区根目录解析为绝对路径，经 IPC 真正写入用户项目目录。
   */
  async applyCodeBlocks(blocks: ParsedCodeBlock[], _stepId: string): Promise<void> {
    for (const block of blocks) {
      if (!block.code.trim()) continue

      // Determine file path
      let relPath = block.filePath
      if (!relPath) {
        // Generate a path from language and content hash
        const ext = this.languageToExtension(block.language)
        const hash = Math.abs(block.code.length).toString(16).substring(0, 6)
        relPath = `generated/${block.language}-${hash}${ext}`
      }

      const linesAdded = block.code.split('\n').length
      const absPath = this.resolvePath(relPath)
      if (!absPath) {
        // 路径越界或尚未打开项目目录：仅保留内存态，拒绝落盘（安全约束）
        console.warn(`[SOLO] ⚠️ 跳过写盘（路径越界或尚未打开项目目录）: ${relPath}`)
        const existingIdx = this.generatedFiles.findIndex(f => f.filePath === relPath)
        if (existingIdx < 0) this.generatedFiles.push({ filePath: relPath, language: block.language, content: block.code, action: 'created' })
        const existingChange = this.changeSummary.changes.find(c => c.file === relPath)
        if (!existingChange) {
          this.changeSummary.filesChanged.push(relPath)
          this.changeSummary.changes.push({
            file: relPath,
            type: 'created',
            summary: `Generated ${block.language} code (未写盘：路径越界/未打开项目目录)`,
            linesAdded,
            linesRemoved: 0,
          })
          this.changeSummary.statistics.totalFiles++
          this.changeSummary.statistics.totalLinesAdded += linesAdded
          if (!this.changeSummary.statistics.languages.includes(block.language)) {
            this.changeSummary.statistics.languages.push(block.language)
          }
        }
        continue
      }
      const isExisting = this.generatedFiles.some(f => f.filePath === absPath)
      const change: FileChange = {
        filePath: absPath,
        language: block.language,
        content: block.code,
        action: isExisting ? 'modified' : 'created',
      }

      // Update or add to generated files
      const existingIdx = this.generatedFiles.findIndex(f => f.filePath === absPath)
      if (existingIdx >= 0) {
        this.generatedFiles[existingIdx] = change
      } else {
        this.generatedFiles.push(change)
      }

      // 真实落盘（通过 IPC 写入用户项目目录）
      let written = false
      try {
        written = await this.fileWriter(absPath, block.code)
      } catch (err: any) {
        console.error(`[SOLO] ❌ 文件写盘失败: ${absPath}`, err?.message || err)
      }
      if (written) this.writtenPaths.add(absPath)

      // 记录变更汇总（使用真实相对路径，无论落盘成功与否都保留生成内容）
      const existingChange = this.changeSummary.changes.find(c => c.file === relPath)
      if (!existingChange) {
        this.changeSummary.filesChanged.push(relPath)
        this.changeSummary.changes.push({
          file: relPath,
          type: change.action,
          summary: `Generated ${block.language} code (${linesAdded} lines)`,
          linesAdded,
          linesRemoved: 0,
        })
        this.changeSummary.statistics.totalFiles++
        this.changeSummary.statistics.totalLinesAdded += linesAdded
        if (!this.changeSummary.statistics.languages.includes(block.language)) {
          this.changeSummary.statistics.languages.push(block.language)
        }
      }

      console.log(
        `[SOLO]   📄 代码变更: ${change.action === 'created' ? '创建' : '修改'} ${relPath}${written ? ' (已写盘)' : ' (写盘失败/内存态)'}`,
        `\n    语言: ${block.language}`,
        `\n    行数: ${linesAdded}`,
        `\n    路径: ${absPath}`
      )
    }
  }

  /** Map language name to file extension */
  private languageToExtension(language: string): string {
    const map: Record<string, string> = {
      javascript: '.js', js: '.js', jsx: '.jsx',
      typescript: '.ts', ts: '.ts', tsx: '.tsx',
      python: '.py', py: '.py',
      go: '.go', rust: '.rs',
      java: '.java', kotlin: '.kt',
      swift: '.swift', ruby: '.rb',
      php: '.php', csharp: '.cs',
      html: '.html', htm: '.html',
      css: '.css', scss: '.scss', less: '.less',
      json: '.json', yaml: '.yml', yml: '.yml',
      markdown: '.md', md: '.md',
      sql: '.sql', shell: '.sh', bash: '.sh',
      dockerfile: '.dockerfile', graphql: '.graphql',
      xml: '.xml', svg: '.svg',
      plaintext: '.txt', text: '.txt',
    }
    return map[language] || `.${language}`
  }

  private notifyProgress(): void {
    if (this.onProgress && this.currentTask) {
      const completedSteps = this.currentTask.steps.filter(s => s.status === 'completed').length
      const totalSteps = this.currentTask.steps.length
      console.log(
        `[SOLO] [Progress] 📊 进度更新: ${completedSteps}/${totalSteps} 步完成`,
        `\n  状态: ${this.currentTask.status}`,
        `\n  步骤: ${this.currentTask.steps.map(s => `${s.id}=${s.status}`).join(', ')}`
      )
      // 深拷贝 tasks 和 steps，防止 immer 冻结原始对象导致后续修改报错
      this.onProgress({
        ...this.currentTask,
        steps: this.currentTask.steps.map(s => ({ ...s })),
      })
    }
  }

  getStatus(): AgentStatus {
    return this.status
  }

  getCurrentTask(): AgentTask | null {
    return this.currentTask
  }

  getErrorHistory(): ErrorReport[] {
    return [...this.errorHistory]
  }

  getChangeSummary(): ChangeSummary {
    return { ...this.changeSummary }
  }

  getGeneratedFiles(): FileChange[] {
    return [...this.generatedFiles]
  }

  getContextManager(): ContextManager {
    return this.contextManager
  }
}