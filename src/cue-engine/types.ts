export interface CompletionContext {
  prefix: string
  suffix: string
  language: string
  filePath: string
  projectFiles?: string[]
  cursorPosition: { line: number; column: number }
}

export interface CompletionResult {
  text: string
  label: string
  detail?: string
  type: 'statement' | 'expression' | 'import' | 'snippet' | 'variable'
  score: number
}

export interface CodeIntelligence {
  symbols: SymbolInfo[]
  imports: ImportInfo[]
  diagnostics: DiagnosticInfo[]
}

export interface SymbolInfo {
  name: string
  kind: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'module'
  filePath: string
  line: number
  column: number
}

export interface ImportInfo {
  source: string
  symbols: string[]
  isUsed: boolean
}

export interface DiagnosticInfo {
  severity: 'error' | 'warning' | 'info'
  message: string
  line: number
  column: number
  code?: string
}