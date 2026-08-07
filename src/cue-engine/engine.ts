import type { CompletionContext, CompletionResult, CodeIntelligence } from './types'
import { CompletionProvider } from './completion/provider'
import { InlineCompletionProvider } from './completion/inline-provider'
import { ChainCompletionProvider } from './completion/chain-provider'
import { MultiLineEditor } from './completion/multi-line-edit'
import { CodeAnalyzer } from './context/analyzer'

export class CueEngine {
  private completionProvider: CompletionProvider
  private inlineProvider: InlineCompletionProvider
  private chainProvider: ChainCompletionProvider
  private multiLineEditor: MultiLineEditor
  private codeAnalyzer: CodeAnalyzer

  constructor() {
    this.completionProvider = new CompletionProvider()
    this.inlineProvider = new InlineCompletionProvider()
    this.chainProvider = new ChainCompletionProvider()
    this.multiLineEditor = new MultiLineEditor()
    this.codeAnalyzer = new CodeAnalyzer()
  }

  async getCompletions(context: CompletionContext): Promise<CompletionResult[]> {
    const intelligence = await this.codeAnalyzer.analyze(context)
    const basic = await this.completionProvider.provideCompletions(context, intelligence)
    const chain = this.chainProvider.provideChainCompletions(context, intelligence)
    return [...basic, ...chain].sort((a, b) => b.score - a.score).slice(0, 30)
  }

  async getInlineCompletions(context: CompletionContext) {
    const intelligence = await this.codeAnalyzer.analyze(context)
    return this.inlineProvider.provideInlineSuggestions(context, intelligence)
  }

  async getChainCompletions(context: CompletionContext): Promise<CompletionResult[]> {
    const intelligence = await this.codeAnalyzer.analyze(context)
    return this.chainProvider.provideChainCompletions(context, intelligence)
  }

  async getIntelligence(context: CompletionContext): Promise<CodeIntelligence> {
    return this.codeAnalyzer.analyze(context)
  }

  async getImportSuggestions(context: CompletionContext): Promise<CompletionResult[]> {
    const intelligence = await this.codeAnalyzer.analyze(context)
    const unusedImports = intelligence.imports.filter(i => !i.isUsed)
    const suggestions: CompletionResult[] = []

    for (const imp of unusedImports) {
      suggestions.push({
        text: `import { ${imp.symbols.join(', ')} } from '${imp.source}'`,
        label: `导入 ${imp.source}`,
        type: 'import',
        score: 80,
      })
    }

    return suggestions
  }

  async getMultiLineEdits(context: CompletionContext) {
    return this.multiLineEditor.suggestEdits(context)
  }
}