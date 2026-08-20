import type { CompletionContext, CodeIntelligence, SymbolInfo, ImportInfo, DiagnosticInfo } from '../types'

export class CodeAnalyzer {
  async analyze(context: CompletionContext): Promise<CodeIntelligence> {
    const symbols = this.extractSymbols(context)
    const imports = this.extractImports(context)
    const diagnostics = this.extractDiagnostics(context)

    return { symbols, imports, diagnostics }
  }

  private extractSymbols(context: CompletionContext): SymbolInfo[] {
    const symbols: SymbolInfo[] = []
    const code = context.prefix + '\n' + context.suffix

    // Extract function declarations
    const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/g
    let match
    while ((match = funcRegex.exec(code)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'function',
        filePath: context.filePath,
        line: code.substring(0, match.index).split('\n').length,
        column: match.index - code.lastIndexOf('\n', match.index) - 1,
      })
    }

    // Extract class declarations
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/g
    while ((match = classRegex.exec(code)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'class',
        filePath: context.filePath,
        line: code.substring(0, match.index).split('\n').length,
        column: match.index - code.lastIndexOf('\n', match.index) - 1,
      })
    }

    // Extract variable/const declarations
    const varRegex = /(?:export\s+)?(?:const|let|var)\s+(\w+)/g
    while ((match = varRegex.exec(code)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'variable',
        filePath: context.filePath,
        line: code.substring(0, match.index).split('\n').length,
        column: match.index - code.lastIndexOf('\n', match.index) - 1,
      })
    }

    return symbols
  }

  private extractImports(context: CompletionContext): ImportInfo[] {
    const imports: ImportInfo[] = []
    const code = context.prefix
    // 排除 import/export 语句行后的代码，用于判断符号是否在业务代码中真正被使用
    // （否则 import 语句自身包含符号名，isUsed 恒为 true，未使用导入建议永不生效）
    const nonImportCode = code
      .split('\n')
      .filter(l => !/^\s*(import|from|export\s*\{)/.test(l))
      .join('\n')

    // Extract import statements
    const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g
    let match
    while ((match = importRegex.exec(code)) !== null) {
      const symbols = match[1].split(',').map(s => s.trim())
      imports.push({
        source: match[2],
        symbols,
        isUsed: symbols.every(s => nonImportCode.includes(s)),
      })
    }

    // Default imports
    const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
    while ((match = defaultImportRegex.exec(code)) !== null) {
      imports.push({
        source: match[2],
        symbols: [match[1]],
        isUsed: nonImportCode.includes(match[1]),
      })
    }

    return imports
  }

  private extractDiagnostics(context: CompletionContext): DiagnosticInfo[] {
    const diagnostics: DiagnosticInfo[] = []
    const code = context.prefix
    const lines = code.split('\n')

    lines.forEach((line, index) => {
      // Check for unused variables (simple heuristic)
      const varMatch = line.match(/(?:const|let|var)\s+(\w+)\s*=/)
      if (varMatch) {
        const varName = varMatch[1]
        const isUsed = code.split('\n').some((l, i) => i !== index && l.includes(varName))
        if (!isUsed) {
          diagnostics.push({
            severity: 'warning',
            message: `未使用的变量: ${varName}`,
            line: index + 1,
            column: line.indexOf(varName) + 1,
            code: 'no-unused-vars',
          })
        }
      }
    })

    return diagnostics
  }
}