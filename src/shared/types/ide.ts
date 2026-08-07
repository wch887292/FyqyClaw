export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  language?: string
  size?: number
  modifiedAt?: string
}

export interface EditorTab {
  id: string
  path: string
  title: string
  language: string
  isDirty: boolean
  content?: string
}

export interface CursorPosition {
  lineNumber: number
  column: number
}

export interface TerminalSession {
  id: string
  name: string
  cwd: string
  isActive: boolean
}

// Extended Electron API type
export interface ElectronAPI {
  getVersion: () => Promise<string>
  getPlatform: () => Promise<string>
  readDirectory: (dirPath: string) => Promise<FileNode[]>
  readFile: (filePath: string) => Promise<string | null>
  writeFile: (filePath: string, content: string) => Promise<boolean>
  fileExists: (filePath: string) => Promise<boolean>
  getFileInfo: (filePath: string) => Promise<{ size: number; isDirectory: boolean; isFile: boolean; createdAt: string; modifiedAt: string } | null>
  openFolder: () => Promise<string | null>
  openFile: () => Promise<string | null>
  on: (channel: string, callback: (...args: unknown[]) => void) => void
  send: (channel: string, ...args: unknown[]) => void
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>
}

// Augment window
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}