import type { CompletionContext, CompletionResult, CodeIntelligence } from '../types'

interface InlineSuggestion {
  prefix: string
  suffix: string
  suggestion: string
  confidence: number
}

export class InlineCompletionProvider {
  private patterns: Array<{ regex: RegExp; template: string; description: string }> = [
    { regex: /function\s+(\w+)\s*\(([^)]*)\)\s*\{/, template: 'function $1($2) {\n  // TODO: implement\n}', description: '函数实现' },
    { regex: /for\s*\(/, template: 'for (let i = 0; i < length; i++) {\n  \n}', description: 'for 循环' },
    { regex: /if\s*\(/, template: 'if () {\n  \n}', description: 'if 条件' },
    { regex: /try\s*\{/, template: 'try {\n  \n} catch (error) {\n  \n}', description: 'try-catch' },
    { regex: /class\s+(\w+)/, template: 'class $1 {\n  constructor() {\n    \n  }\n}', description: '类定义' },
    { regex: /console\.log/, template: 'console.log()', description: '日志输出' },
    { regex: /import\s+\{/, template: 'import {  } from \'module\'', description: '导入语句' },
    { regex: /export\s+default/, template: 'export default {\n  \n}', description: '默认导出' },
    { regex: /useEffect\s*\(/, template: 'useEffect(() => {\n  \n}, [])', description: 'React useEffect' },
    { regex: /useState\s*\(/, template: 'useState()', description: 'React useState' },
    { regex: /async\s+function/, template: 'async function () {\n  \n}', description: '异步函数' },
    { regex: /Promise/, template: 'new Promise((resolve, reject) => {\n  \n})', description: 'Promise' },
  ]

  provideInlineSuggestions(context: CompletionContext, intelligence: CodeIntelligence): InlineSuggestion[] {
    const suggestions: InlineSuggestion[] = []
    const currentLine = context.prefix.split('\n').pop()?.trim() || ''

    // Check pattern-based suggestions
    for (const pattern of this.patterns) {
      if (pattern.regex.test(currentLine)) {
        suggestions.push({
          prefix: currentLine,
          suffix: '',
          suggestion: pattern.template,
          confidence: 0.85,
        })
      }
    }

    // Check for variable assignments
    const assignMatch = currentLine.match(/^(const|let|var)\s+(\w+)\s*=\s*$/)
    if (assignMatch) {
      suggestions.push({
        prefix: currentLine,
        suffix: '',
        suggestion: `${assignMatch[1]} ${assignMatch[2]} = value`,
        confidence: 0.7,
      })
    }

    // Check for arrow function
    if (currentLine.endsWith('=>') || currentLine.endsWith('=> {')) {
      suggestions.push({
        prefix: currentLine,
        suffix: '',
        suggestion: currentLine.endsWith('{') ? '\n  \n}' : ' => {\n  \n}',
        confidence: 0.8,
      })
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 3)
  }
}