import type { CompletionContext, CompletionResult, CodeIntelligence } from '../types'

interface ChainContext {
  prefix: string
  suffix: string
  language: string
  filePath: string
  cursorLine: number
  cursorColumn: number
}

export class ChainCompletionProvider {
  private chainDepth: number = 3

  provideChainCompletions(context: CompletionContext, intelligence: CodeIntelligence): CompletionResult[] {
    const results: CompletionResult[] = []
    const lines = context.prefix.split('\n')
    const currentLine = lines[lines.length - 1] || ''
    const prevLine = lines[lines.length - 2] || ''
    const prevPrevLine = lines[lines.length - 3] || ''

    const chainContext: ChainContext = {
      prefix: context.prefix,
      suffix: context.suffix,
      language: context.language,
      filePath: context.filePath,
      cursorLine: lines.length,
      cursorColumn: currentLine.length,
    }

    // Chained: Property access after object
    if (currentLine.includes('.')) {
      const parts = currentLine.split('.')
      const objectName = parts[parts.length - 2]?.trim()
      if (objectName) {
        const matchingSymbol = intelligence.symbols.find(s => s.name === objectName)
        if (matchingSymbol) {
          results.push({
            text: matchingSymbol.name,
            label: `${matchingSymbol.name}.`,
            detail: `${matchingSymbol.kind} - 链式访问`,
            type: 'statement',
            score: 95,
          })
        }
      }
    }

    // Chained: Method chaining pattern
    if (currentLine.trim().match(/^\.\w+/)) {
      results.push({
        text: currentLine.trim(),
        label: '方法链式调用',
        detail: '继续链式调用',
        type: 'statement',
        score: 90,
      })
    }

    // Chained: After a return statement
    if (prevLine.trim().startsWith('return ') || prevLine.trim() === 'return') {
      const chainSymbols = intelligence.symbols
        .filter(s => s.kind === 'function' || s.kind === 'variable')
        .slice(0, 5)
      for (const sym of chainSymbols) {
        results.push({
          text: sym.name,
          label: sym.name,
          detail: `返回 ${sym.kind}: ${sym.name}`,
          type: 'statement',
          score: 85,
        })
      }
    }

    // Chained: After an if/for/while block
    const blockPattern = /^\s*(if|for|while|switch)\s*\(/
    if (blockPattern.test(prevLine.trim())) {
      results.push({
        text: '\n  ',
        label: '代码块',
        detail: '自动补全代码块',
        type: 'snippet',
        score: 80,
      })
    }

    // Chained: After a template literal tag
    if (currentLine.includes('`')) {
      results.push({
        text: '${}',
        label: '模板插值',
        detail: '在模板字符串中插入表达式',
        type: 'snippet',
        score: 85,
      })
    }

    // Chained: Close bracket/brace/paren
    if (currentLine.trim().endsWith('(')) {
      results.push({
        text: ')',
        label: '自动补全括号',
        detail: '闭合未完成的括号',
        type: 'snippet',
        score: 95,
      })
    }

    return results
  }
}