import type { CompletionContext } from '../types'

interface MultiLineEdit {
  range: { startLine: number; endLine: number }
  newText: string
  label: string
  description: string
}

export class MultiLineEditor {
  suggestEdits(context: CompletionContext): MultiLineEdit[] {
    const edits: MultiLineEdit[] = []
    const lines = context.prefix.split('\n')

    // Find duplicate lines
    const lineCount = new Map<string, number>()
    lines.forEach((line, index) => {
      const trimmed = line.trim()
      if (trimmed && !trimmed.match(/^[{}[\]]$/)) {
        lineCount.set(trimmed, (lineCount.get(trimmed) || 0) + 1)
      }
    })

    // Suggest removing duplicate lines
    for (const [line, count] of lineCount.entries()) {
      if (count > 1) {
        const indices = lines
          .map((l, i) => ({ line: l.trim(), index: i }))
          .filter(x => x.line === line)
          .map(x => x.index)

        if (indices.length > 1) {
          edits.push({
            range: { startLine: indices[1], endLine: indices[indices.length - 1] + 1 },
            newText: '',
            label: '删除重复行',
            description: `发现 ${count - 1} 行重复代码`,
          })
          break // Only suggest one edit at a time
        }
      }
    }

    // Suggest converting to template literal
    const concatMatch = lines.find(l => l.includes("' + ") || l.includes('" + '))
    if (concatMatch) {
      edits.push({
        range: { startLine: lines.indexOf(concatMatch), endLine: lines.indexOf(concatMatch) + 1 },
        newText: concatMatch.replace(/['"]\s*\+\s*['"]/g, ''),
        label: '转换为模板字符串',
        description: '使用模板字符串替代字符串拼接',
      })
    }

    // Suggest adding semicolons
    const noSemicolonLines = lines
      .map((l, i) => ({ line: l, index: i }))
      .filter(({ line }) => {
        const trimmed = line.trim()
        return trimmed &&
          !trimmed.endsWith(';') &&
          !trimmed.endsWith('{') &&
          !trimmed.endsWith('}') &&
          !trimmed.endsWith('(') &&
          !trimmed.endsWith(')') &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('*') &&
          !trimmed.endsWith(':')
      })

    if (noSemicolonLines.length > 2) {
      const range = {
        startLine: noSemicolonLines[0].index,
        endLine: noSemicolonLines[noSemicolonLines.length - 1].index + 1,
      }
      edits.push({
        range,
        newText: noSemicolonLines.map(({ line }) => {
          const trimmed = line.trimEnd()
          return trimmed.endsWith(';') ? trimmed : trimmed + ';'
        }).join('\n'),
        label: '添加分号',
        description: `为 ${noSemicolonLines.length} 行添加分号`,
      })
    }

    return edits
  }
}