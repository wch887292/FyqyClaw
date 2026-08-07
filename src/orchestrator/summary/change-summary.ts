import type { ChangeSummary, ChangeEntry, ChangeStatistics } from '../agent/types'

export class ChangeSummaryGenerator {
  generateSummary(taskId: string, description: string, changes: ChangeEntry[]): ChangeSummary {
    const stats = this.calculateStatistics(changes)
    return {
      taskId,
      description,
      filesChanged: changes.map(c => c.file),
      changes,
      statistics: stats,
      generatedAt: Date.now(),
    }
  }

  generateCommitMessage(summary: ChangeSummary): string {
    const lines: string[] = []

    // First line: type + description
    const type = this.inferCommitType(summary.changes)
    const shortDesc = summary.description.length > 72
      ? summary.description.substring(0, 69) + '...'
      : summary.description
    lines.push(`${type}: ${shortDesc}`)
    lines.push('')

    // Body: details
    lines.push(summary.description)
    lines.push('')

    // Changes list
    for (const change of summary.changes) {
      const icon = change.type === 'created' ? '✨' :
                   change.type === 'modified' ? '🔧' :
                   change.type === 'deleted' ? '🗑️' : '📎'
      lines.push(`${icon} ${change.type}: ${change.file} - ${change.summary}`)
    }

    lines.push('')
    lines.push(`---`)
    lines.push(`${summary.statistics.totalFiles} files changed, ` +
      `${summary.statistics.totalLinesAdded} insertions(+), ` +
      `${summary.statistics.totalLinesRemoved} deletions(-)`)

    return lines.join('\n')
  }

  private calculateStatistics(changes: ChangeEntry[]): ChangeStatistics {
    const languages = new Set<string>()
    let totalAdded = 0
    let totalRemoved = 0

    for (const change of changes) {
      totalAdded += change.linesAdded || 0
      totalRemoved += change.linesRemoved || 0
      const ext = change.file.split('.').pop()
      if (ext) languages.add(this.extToLanguage(ext))
    }

    const totalFiles = changes.length
    let estimatedEffort = 'low'
    if (totalFiles > 5 || totalAdded > 200) estimatedEffort = 'medium'
    if (totalFiles > 15 || totalAdded > 500) estimatedEffort = 'high'

    return {
      totalFiles,
      totalLinesAdded: totalAdded,
      totalLinesRemoved: totalRemoved,
      languages: Array.from(languages),
      estimatedEffort,
    }
  }

  private inferCommitType(changes: ChangeEntry[]): string {
    const types = changes.map(c => c.type)
    if (types.every(t => t === 'created')) return 'feat'
    if (types.some(t => t === 'deleted')) return 'cleanup'
    if (types.some(t => t === 'modified')) return 'update'
    return 'chore'
  }

  private extToLanguage(ext: string): string {
    const map: Record<string, string> = {
      ts: 'TypeScript', tsx: 'TypeScript React', js: 'JavaScript',
      jsx: 'JavaScript React', py: 'Python', go: 'Go', rs: 'Rust',
      java: 'Java', json: 'JSON', md: 'Markdown', css: 'CSS',
      html: 'HTML', yaml: 'YAML', sql: 'SQL',
    }
    return map[ext] || ext
  }
}