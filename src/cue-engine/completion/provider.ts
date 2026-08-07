import type { CompletionContext, CompletionResult, CodeIntelligence } from '../types'
import { LanguageSupportProvider } from './language-support'

export class CompletionProvider {
  private langSupport: LanguageSupportProvider

  constructor() {
    this.langSupport = new LanguageSupportProvider()
  }

  provideCompletions(context: CompletionContext, intelligence: CodeIntelligence): CompletionResult[] {
    const results: CompletionResult[] = []

    // Get language-specific definitions
    const langDef = this.langSupport.getLanguage(context.language) ||
                    this.langSupport.getLanguageByExtension(context.filePath.split('.').pop() || '')

    if (langDef) {
      // Language keywords
      for (const keyword of langDef.keywords) {
        if (this.matches(context, keyword)) {
          results.push({
            text: keyword,
            label: keyword,
            detail: `${langDef.name} 关键字`,
            type: 'statement',
            score: 90,
          })
        }
      }

      // Language builtins
      for (const builtin of langDef.builtins) {
        if (this.matches(context, builtin)) {
          results.push({
            text: builtin,
            label: builtin,
            detail: `${langDef.name} 内置对象`,
            type: 'statement',
            score: 85,
          })
        }
      }

      // Snippets
      for (const snippet of langDef.snippets) {
        if (snippet.prefix.startsWith(this.getLastWord(context.prefix))) {
          results.push({
            text: snippet.body.join('\n'),
            label: snippet.prefix,
            detail: snippet.description,
            type: 'snippet',
            score: 95,
          })
        }
      }
    }

    // Symbols from analysis
    for (const symbol of intelligence.symbols) {
      if (symbol.name.toLowerCase().startsWith(this.getLastWord(context.prefix).toLowerCase())) {
        results.push({
          text: symbol.name,
          label: symbol.name,
          detail: `${symbol.kind} - ${symbol.filePath}`,
          type: symbol.kind === 'function' ? 'statement' : 'variable',
          score: 80,
        })
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score).slice(0, 30)
  }

  private matches(context: CompletionContext, candidate: string): boolean {
    const lastWord = this.getLastWord(context.prefix)
    if (!lastWord) return true
    return candidate.toLowerCase().startsWith(lastWord.toLowerCase())
  }

  private getLastWord(prefix: string): string {
    const match = prefix.match(/[\w_]+$/g)
    return match ? match[0] : ''
  }
}