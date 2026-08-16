import type { ContextItem } from '@shared/types/ai'

/** 文件读取器：注入式，便于在测试/非 Electron 环境替换为可控实现 */
export type FileReader = (path: string) => Promise<string | undefined>

const fallbackReader: FileReader = async () => undefined

export class ContextManager {
  private contexts: Map<string, ContextItem> = new Map()
  private fileReader: FileReader = fallbackReader

  /** 注入真实文件读取器（如 Electron 主进程通过 fs:read-file IPC 读取） */
  setFileReader(reader: FileReader): void {
    this.fileReader = reader
  }

  async loadContext(item: ContextItem): Promise<void> {
    const key = item.path || `${item.type}-${Date.now()}`
    this.contexts.set(key, item)
  }

  async loadFileContext(filePath: string): Promise<ContextItem> {
    // 真实读取磁盘内容；读取失败或环境不支持时回退到占位说明（不抛错、不伪造内容）
    const content = await this.fileReader(filePath)
    const item: ContextItem = {
      type: 'file',
      path: filePath,
      content: content ?? `// 文件内容暂不可读: ${filePath}`,
      metadata: { language: this.inferLanguage(filePath), readable: content !== undefined },
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