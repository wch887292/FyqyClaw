import type { CodeReviewRequest, CodeReviewResult } from '@shared/types/ai'

interface ReviewRule {
  name: string
  severity: 'error' | 'warning' | 'info'
  check: (line: string, index: number, lines: string[], filePath: string) => CodeReviewResult | null
}

export class CodeReviewEngine {
  private rules: ReviewRule[] = [
    // Security rules
    {
      name: 'hardcoded-password',
      severity: 'error',
      check: (line, index) => {
        const patterns = [
          /password\s*=\s*['"][^'"]+['"]/i,
          /secret\s*=\s*['"][^'"]+['"]/i,
          /apiKey\s*=\s*['"][^'"]+['"]/i,
          /token\s*=\s*['"][^'"]+['"]/i,
          /auth.*key\s*=\s*['"][^'"]+['"]/i,
        ]
        for (const pattern of patterns) {
          if (pattern.test(line)) {
            return {
              severity: 'error',
              line: index + 1,
              message: '检测到硬编码凭据',
              suggestion: '使用环境变量或密钥管理服务存储敏感信息',
            }
          }
        }
        return null
      },
    },
    {
      name: 'eval-usage',
      severity: 'error',
      check: (line, index) => {
        if (/\beval\s*\(/.test(line) || /\bFunction\s*\(/.test(line)) {
          return {
            severity: 'error',
            line: index + 1,
            message: '使用 eval() 或 Function() 构造器',
            suggestion: 'eval 可能导致代码注入攻击，建议使用安全的替代方案',
          }
        }
        return null
      },
    },
    {
      name: 'innerHTML',
      severity: 'warning',
      check: (line, index) => {
        if (/\.innerHTML\s*=/.test(line) || /\.insertAdjacentHTML/.test(line)) {
          return {
            severity: 'warning',
            line: index + 1,
            message: '使用 innerHTML 直接插入 HTML',
            suggestion: '使用 textContent 或安全的 DOM API 替代 innerHTML，避免 XSS 风险',
          }
        }
        return null
      },
    },
    {
      name: 'sql-injection',
      severity: 'error',
      check: (line, index) => {
        if (/execute\s*\(\s*['"`]/.test(line) && /\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b/i.test(line)) {
          return {
            severity: 'error',
            line: index + 1,
            message: '可能存在 SQL 注入风险',
            suggestion: '使用参数化查询或 ORM 框架替代字符串拼接 SQL',
          }
        }
        return null
      },
    },

    // Code quality rules
    {
      name: 'todo-fixme',
      severity: 'info',
      check: (line, index) => {
        if (/\bTODO\b/i.test(line) || /\bFIXME\b/i.test(line) || /\bHACK\b/i.test(line) || /\bXXX\b/i.test(line)) {
          return {
            severity: 'info',
            line: index + 1,
            message: `代码中包含 ${line.match(/\b(TODO|FIXME|HACK|XXX)\b/i)![0]}`,
            suggestion: '建议在提交前完成或跟踪这些标记项',
          }
        }
        return null
      },
    },
    {
      name: 'console-log',
      severity: 'warning',
      check: (line, index) => {
        if (/\bconsole\.(log|debug|info)\s*\(/.test(line)) {
          return {
            severity: 'warning',
            line: index + 1,
            message: '代码中包含调试日志语句',
            suggestion: '建议移除调试日志，或使用专用日志框架',
          }
        }
        return null
      },
    },
    {
      name: 'debugger-statement',
      severity: 'error',
      check: (line, index) => {
        if (/\bdebugger\b/.test(line)) {
          return {
            severity: 'error',
            line: index + 1,
            message: '代码中包含 debugger 语句',
            suggestion: '提交前请移除所有 debugger 断点语句',
          }
        }
        return null
      },
    },
    {
      name: 'long-function',
      severity: 'warning',
      check: (line, index, lines) => {
        if (line.includes('function ') || line.includes('=> {') || line.includes('=>{')) {
          const funcStart = index
          let braceCount = 0
          let found = false
          for (let i = funcStart; i < Math.min(funcStart + 80, lines.length); i++) {
            for (const ch of lines[i]) {
              if (ch === '{') { braceCount++; found = true }
              else if (ch === '}') braceCount--
            }
            if (found && braceCount <= 0) {
              const lineCount = i - funcStart + 1
              if (lineCount > 60) {
                return {
                  severity: 'warning',
                  line: index + 1,
                  message: `函数过长 (${lineCount} 行)`,
                  suggestion: '建议将超过 60 行的函数拆分为多个小函数',
                }
              }
              break
            }
          }
        }
        return null
      },
    },
    {
      name: 'nested-callbacks',
      severity: 'warning',
      check: (line, index, lines) => {
        let depth = 0
        for (let i = Math.max(0, index - 5); i <= index; i++) {
          const openBraces = (lines[i].match(/\{/g) || []).length
          const closeBraces = (lines[i].match(/\}/g) || []).length
          depth += openBraces - closeBraces
        }
        if (depth > 3) {
          return {
            severity: 'warning',
            line: index + 1,
            message: '嵌套层级过深',
            suggestion: '建议将深层嵌套的逻辑提取为独立函数',
          }
        }
        return null
      },
    },
    {
      name: 'magic-number',
      severity: 'info',
      check: (line, index) => {
        const magicNumPattern = /[=:]\s*(\d{4,})\s*[^)]/g
        const match = magicNumPattern.exec(line)
        if (match) {
          return {
            severity: 'info',
            line: index + 1,
            message: `使用魔法数字: ${match[1]}`,
            suggestion: '建议将常量定义为具名常量或枚举',
          }
        }
        return null
      },
    },
    {
      name: 'empty-catch',
      severity: 'warning',
      check: (line, index, lines) => {
        if (/catch\s*\(/.test(line)) {
          for (let i = index; i < Math.min(index + 5, lines.length); i++) {
            if (/\{\s*\}\s*$/.test(lines[i].trim())) {
              return {
                severity: 'warning',
                line: index + 1,
                message: '空的 catch 块',
                suggestion: '不要在 catch 中忽略错误，至少记录错误信息',
              }
            }
          }
        }
        return null
      },
    },

    // Performance rules
    {
      name: 'large-array-spread',
      severity: 'warning',
      check: (line, index) => {
        if (/\.\.\.\w+/.test(line) && line.includes('[')) {
          return {
            severity: 'warning',
            line: index + 1,
            message: '数组中展开大量元素可能影响性能',
            suggestion: '对于大型数组，考虑使用 push.apply() 或 for 循环',
          }
        }
        return null
      },
    },
    {
      name: 'sync-request',
      severity: 'warning',
      check: (line, index) => {
        if (/\bXMLHttpRequest\b/.test(line) && /async\s*=\s*false/.test(line)) {
          return {
            severity: 'warning',
            line: index + 1,
            message: '同步网络请求会阻塞 UI 线程',
            suggestion: '使用异步请求 (fetch/async XHR) 替代同步请求',
          }
        }
        return null
      },
    },

    // TypeScript specific
    {
      name: 'any-type',
      severity: 'info',
      check: (line, index) => {
        if (/: any\b/.test(line) || /as any\b/.test(line)) {
          return {
            severity: 'info',
            line: index + 1,
            message: '使用 any 类型',
            suggestion: '建议使用更具体的类型定义，或使用 unknown 替代 any',
          }
        }
        return null
      },
    },
    {
      name: 'non-null-assertion',
      severity: 'warning',
      check: (line, index) => {
        if (/!\.[a-zA-Z]/.test(line) || /!\s*\(/.test(line)) {
          return {
            severity: 'warning',
            line: index + 1,
            message: '使用非空断言 (!)',
            suggestion: '非空断言会绕过类型检查，建议使用可选链 (?.) 或类型守卫',
          }
        }
        return null
      },
    },
  ]

  async review(request: CodeReviewRequest): Promise<CodeReviewResult[]> {
    console.log(
      `[SOLO] [CodeReview] 🔍 开始代码审查`,
      `\n  文件: ${request.filePath}`,
      `\n  语言: ${request.language}`,
      `\n  Diff 长度: ${request.diff.length} 字符`
    )

    const results: CodeReviewResult[] = []
    const lines = request.diff.split('\n').filter(l => l.startsWith('+') || l.startsWith('-') || l.startsWith(' '))
    console.log(`[SOLO] [CodeReview]   审查行数: ${lines.length} 行 (${lines.filter(l => l.startsWith('+')).length} 新增, ${lines.filter(l => l.startsWith('-')).length} 删除)`)

    // Group by severity
    for (const rule of this.rules) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        // Only check added/modified lines (starting with + or space)
        if (line.startsWith('-')) continue

        const content = line.substring(1) // Remove the diff prefix
        const result = rule.check(content, i, lines.map(l => l.substring(1)), request.filePath)
        if (result) {
          results.push(result)
        }
      }
    }

    // Check file-wide patterns
    this.checkFileWidePatterns(lines.map(l => l.substring(1)), request.filePath, results)

    // Deduplicate and sort by severity
    const unique = this.deduplicate(results)
    const sorted = this.sortBySeverity(unique)

    console.log(
      `[SOLO] [CodeReview] ✅ 审查完成`,
      `\n  规则数: ${this.rules.length}`,
      `\n  发现问题: ${sorted.length} 个`,
      sorted.length > 0
        ? `\n  严重等级分布: ${sorted.filter(r => r.severity === 'error').length} error, ${sorted.filter(r => r.severity === 'warning').length} warning, ${sorted.filter(r => r.severity === 'info').length} info`
        : '',
      sorted.length > 0
        ? `\n  前 5 个问题:\n${sorted.slice(0, 5).map(r => `    - [${r.severity}] 行${r.line}: ${r.message}`).join('\n')}`
        : ''
    )

    return sorted
  }

  private checkFileWidePatterns(lines: string[], filePath: string, results: CodeReviewResult[]): void {
    // Check file size
    if (lines.length > 300) {
      results.push({
        severity: 'warning',
        line: 0,
        message: `文件变更量较大 (${lines.length} 行)`,
        suggestion: '建议将大变更拆分为多个小提交，便于审查',
      })
    }

    // Check for missing imports
    const importCount = lines.filter(l => l.startsWith('import ')).length
    if (importCount > 10) {
      results.push({
        severity: 'info',
        line: 0,
        message: `大量导入语句 (${importCount} 个)`,
        suggestion: '考虑使用 barrel 文件 (index.ts) 统一导出',
      })
    }

    // Check for deep directory references
    const deepRefs = lines.filter(l => l.includes('../../../../'))
    if (deepRefs.length > 0) {
      results.push({
        severity: 'info',
        line: 0,
        message: `发现深层路径引用 (${deepRefs.length} 处)`,
        suggestion: '建议使用路径别名或重构目录结构',
      })
    }

    // Check language-specific patterns
    const ext = filePath.split('.').pop()?.toLowerCase()
    if (ext === 'tsx' || ext === 'jsx') {
      this.checkReactPatterns(lines, results)
    }
  }

  private checkReactPatterns(lines: string[], results: CodeReviewResult[]): void {
    const fullContent = lines.join('\n')

    // Check for missing key in lists
    if (fullContent.includes('.map(') && !fullContent.includes('key=') && !fullContent.includes('key={')) {
      results.push({
        severity: 'warning',
        line: 0,
        message: '列表渲染中缺少 key 属性',
        suggestion: '为 .map() 渲染的元素添加唯一的 key 属性',
      })
    }

    // Check for useState direct mutation
    if (fullContent.includes('.push(') || fullContent.includes('.splice(')) {
      results.push({
        severity: 'error',
        line: 0,
        message: '直接修改状态变量',
        suggestion: '使用 setState 函数更新状态，不要直接修改状态变量',
      })
    }
  }

  private deduplicate(results: CodeReviewResult[]): CodeReviewResult[] {
    const seen = new Set<string>()
    return results.filter(r => {
      const key = `${r.severity}:${r.line}:${r.message}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  private sortBySeverity(results: CodeReviewResult[]): CodeReviewResult[] {
    const severityOrder = { error: 0, warning: 1, info: 2 }
    return results.sort((a, b) => {
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (severityDiff !== 0) return severityDiff
      return a.line - b.line
    })
  }
}