import type { ContextItem } from '@shared/types/ai'

export class ContextManager {
  private contexts: Map<string, ContextItem> = new Map()

  async loadContext(item: ContextItem): Promise<void> {
    const key = item.path || `${item.type}-${Date.now()}`
    this.contexts.set(key, item)
  }

  async loadFileContext(filePath: string): Promise<ContextItem> {
    // In a real implementation, this reads the file from disk
    const item: ContextItem = {
      type: 'file',
      path: filePath,
      content: `// 文件内容: ${filePath}`,
      metadata: { language: this.inferLanguage(filePath) },
    }
    this.contexts.set(filePath, item)
    return item
  }

  async loadFolderContext(folderPath: string): Promise<ContextItem> {
    const item: ContextItem = {
      type: 'folder',
      path: folderPath,
      content: `文件夹: ${folderPath}`,
      metadata: { fileCount: 0 },
    }
    this.contexts.set(folderPath, item)
    return item
  }

  removeContext(key: string): void {
    this.contexts.delete(key)
  }

  clearContext(): void {
    this.contexts.clear()
  }

  getContext(key: string): ContextItem | undefined {
    return this.contexts.get(key)
  }

  getAllContexts(): ContextItem[] {
    return Array.from(this.contexts.values())
  }

  getContextSummary(): string {
    const items = this.getAllContexts()
    if (items.length === 0) return '无上下文加载'

    return items
      .map(item => `[${item.type}] ${item.path || 'unnamed'}`)
      .join('\n')
  }

  private inferLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const languageMap: Record<string, string> = {
      ts: 'typescript',
      tsx: 'typescriptreact',
      js: 'javascript',
      jsx: 'javascriptreact',
      py: 'python',
      go: 'go',
      rs: 'rust',
      java: 'java',
      json: 'json',
      md: 'markdown',
      css: 'css',
      html: 'html',
    }
    return languageMap[ext || ''] || 'plaintext'
  }
}