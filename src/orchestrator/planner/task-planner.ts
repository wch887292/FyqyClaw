import type { ExecutionPlan, ExecutionStep } from '../agent/types'

interface IntentInfo {
  type: 'create' | 'modify' | 'refactor' | 'fix' | 'optimize' | 'test' | 'config' | 'unknown'
  language?: string
  framework?: string
  scope: string
  detail: string
}

export class TaskPlanner {
  async createPlan(description: string): Promise<ExecutionPlan> {
    console.log(
      `[SOLO] [Planner] 📋 开始任务规划`,
      `\n  需求长度: ${description.length} 字符`,
      `\n  需求: ${description.length > 150 ? description.substring(0, 150) + '...' : description}`
    )

    const taskId = `plan-${Date.now()}`

    // Deep intent analysis
    const intent = this.analyzeIntent(description)
    const complexity = this.estimateComplexity(description, intent)
    console.log(
      `[SOLO] [Planner] 🧐 意图分析完成`,
      `\n  意图类型: ${intent.type}`,
      `\n  检测语言: ${intent.language || '未识别'}`,
      `\n  检测框架: ${intent.framework || '未识别'}`,
      `\n  估算复杂度: ${complexity}`
    )

    // Generate detailed steps based on intent
    const steps = this.generateDetailedSteps(description, intent, complexity)
    console.log(
      `[SOLO] [Planner] 📊 步骤生成完成`,
      `\n  生成步骤数: ${steps.length}`,
      `\n  步骤列表:`,
      ...steps.map(s => `\n    - [${s.action}] ${s.description}`)
    )

    // Optimize step ordering with dependency resolution
    const optimizedSteps = this.resolveDependencies(steps)
    console.log(
      `[SOLO] [Planner] ✅ 规划完成`,
      `\n  优化后步骤数: ${optimizedSteps.length}`,
      `\n  依赖解析完成`
    )

    return {
      taskId,
      steps: optimizedSteps,
      estimatedComplexity: complexity,
    }
  }

  private analyzeIntent(description: string): IntentInfo {
    const lower = description.toLowerCase()

    // Detect intent type
    let type: IntentInfo['type'] = 'unknown'
    if (lower.includes('创建') || lower.includes('新建') || lower.includes('生成') || /create|new|generate|init/.test(lower)) {
      type = 'create'
    } else if (lower.includes('修改') || lower.includes('添加') || lower.includes('增加') || /add|modify|update|append/.test(lower)) {
      type = 'modify'
    } else if (lower.includes('重构') || lower.includes('迁移') || /refactor|migrate|restructure/.test(lower)) {
      type = 'refactor'
    } else if (lower.includes('修复') || lower.includes('bug') || lower.includes('错误') || /fix|bug|error|issue/.test(lower)) {
      type = 'fix'
    } else if (lower.includes('优化') || lower.includes('性能') || /optimize|improve|performance/.test(lower)) {
      type = 'optimize'
    } else if (lower.includes('测试') || /test|spec|unit/.test(lower)) {
      type = 'test'
    } else if (lower.includes('配置') || /config|setup|install/.test(lower)) {
      type = 'config'
    }

    // Detect programming language
    const languages = ['python', 'javascript', 'typescript', 'go', 'rust', 'java', 'c++', 'c#', 'ruby', 'php', 'swift', 'kotlin']
    let language: string | undefined
    for (const lang of languages) {
      if (lower.includes(lang)) {
        language = lang
        break
      }
    }

    // Detect framework
    const frameworks = ['react', 'vue', 'angular', 'next.js', 'nuxt', 'django', 'flask', 'spring', 'express', 'gin', 'tensorflow', 'pytorch']
    let framework: string | undefined
    for (const fw of frameworks) {
      if (lower.includes(fw)) {
        framework = fw
        break
      }
    }

    // Extract scope and detail
    const scope = description.length > 50 ? description.substring(0, 50) + '...' : description
    const detail = description

    return { type, language, framework, scope, detail }
  }

  private estimateComplexity(description: string, intent: IntentInfo): 'low' | 'medium' | 'high' {
    let score = 0

    // By intent type
    const typeScores: Record<string, number> = {
      create: 6, modify: 3, refactor: 8, fix: 4, optimize: 5, test: 2, config: 1, unknown: 3,
    }
    score += typeScores[intent.type] || 3

    // By length
    if (description.length > 100) score += 2
    if (description.length > 200) score += 2

    // By keywords
    const lower = description.toLowerCase()
    const highComplexityWords = ['架构', '重构', '迁移', '全栈', '微服务', '数据库', '分布式', '多模块', 'system', 'architecture', 'full-stack', 'database', 'microservice']
    for (const word of highComplexityWords) {
      if (lower.includes(word)) { score += 2; break }
    }

    // By language
    if (intent.language) score += 1

    if (score <= 3) return 'low'
    if (score <= 6) return 'medium'
    return 'high'
  }

  private generateDetailedSteps(description: string, intent: IntentInfo, complexity: 'low' | 'medium' | 'high'): ExecutionStep[] {
    const steps: ExecutionStep[] = []
    let stepCounter = 0

    const addStep = (action: ExecutionStep['action'], desc: string, params: Record<string, unknown>, dependsOn: string[] = []) => {
      stepCounter++
      const id = `step-${stepCounter}`
      steps.push({ id, description: desc, action, params: { ...params, originalDescription: description }, dependsOn })
    }

    // Phase 1: Analysis (always)
    addStep('analyze', `分析需求: ${intent.scope}`, {
      intent: intent.type,
      language: intent.language,
      framework: intent.framework,
      detail: intent.detail,
    })

    // Phase 2: Planning (for medium/high complexity)
    if (complexity !== 'low') {
      addStep('analyze', '制定技术方案与架构设计', {
        complexity,
        type: intent.type,
        language: intent.language,
        framework: intent.framework,
      }, ['step-1'])
    }

    // Phase 3: Code generation (varies by intent type)
    const lastAnalysisStep = complexity !== 'low' ? 'step-2' : 'step-1'

    switch (intent.type) {
      case 'create': {
        if (complexity === 'high') {
          addStep('generate', '创建项目脚手架与目录结构', { type: 'scaffold', language: intent.language, framework: intent.framework }, [lastAnalysisStep])
          addStep('generate', '实现核心业务逻辑', { type: 'core', language: intent.language }, [`step-${stepCounter}`])
          addStep('generate', '添加配置文件与依赖管理', { type: 'config', language: intent.language }, [`step-${stepCounter}`])
        } else {
          addStep('generate', '生成代码实现', { type: 'implementation', language: intent.language }, [lastAnalysisStep])
        }
        break
      }
      case 'modify': {
        addStep('modify', '定位并修改目标代码', { type: 'modification', language: intent.language }, [lastAnalysisStep])
        if (complexity === 'high') {
          addStep('modify', '更新相关依赖与引用', { type: 'dependency-update' }, [`step-${stepCounter}`])
        }
        break
      }
      case 'refactor': {
        addStep('analyze', '分析现有代码结构', { type: 'code-analysis' }, [lastAnalysisStep])
        addStep('modify', '重构代码结构与模块划分', { type: 'refactoring', language: intent.language }, [`step-${stepCounter}`])
        addStep('modify', '更新导入路径与引用关系', { type: 'dependency-update' }, [`step-${stepCounter}`])
        break
      }
      case 'fix': {
        addStep('analyze', '定位问题原因', { type: 'bug-analysis' }, [lastAnalysisStep])
        addStep('fix', '修复问题', { type: 'bug-fix', language: intent.language }, [`step-${stepCounter}`])
        break
      }
      case 'optimize': {
        addStep('analyze', '分析性能瓶颈或优化点', { type: 'optimization-analysis' }, [lastAnalysisStep])
        addStep('modify', '实施优化方案', { type: 'optimization', language: intent.language }, [`step-${stepCounter}`])
        break
      }
      default: {
        addStep('generate', '执行任务处理', { type: 'general', language: intent.language }, [lastAnalysisStep])
      }
    }

    // Phase 4: Testing (for non-trivial tasks)
    const lastCodeStep = `step-${stepCounter}`
    if (complexity !== 'low' || intent.type === 'fix' || intent.type === 'refactor') {
      addStep('test', '运行自动化测试验证', { type: 'testing' }, [lastCodeStep])
    }

    // Phase 5: Review (always)
    addStep('review', 'AI 代码审查与质量检查', { type: 'code-review', language: intent.language }, [complexity !== 'low' || intent.type === 'fix' || intent.type === 'refactor' ? `step-${stepCounter}` : lastCodeStep])

    // Phase 6: Summary (always)
    addStep('review', '生成变更汇总与提交信息', { type: 'summary' }, [`step-${stepCounter}`])

    return steps
  }

  private resolveDependencies(steps: ExecutionStep[]): ExecutionStep[] {
    // Build dependency graph and topologically sort
    const stepMap = new Map(steps.map(s => [s.id, s]))
    const visited = new Set<string>()
    const sorted: ExecutionStep[] = []

    const visit = (stepId: string) => {
      if (visited.has(stepId)) return
      visited.add(stepId)
      const step = stepMap.get(stepId)
      if (!step) return
      for (const dep of step.dependsOn) {
        visit(dep)
      }
      sorted.push(step)
    }

    for (const step of steps) {
      visit(step.id)
    }

    return sorted
  }
}