import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  // App
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  getPlatform: () => ipcRenderer.invoke('app:get-platform'),

  // File System
  readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:read-directory', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:write-file', filePath, content),
  fileExists: (filePath: string) => ipcRenderer.invoke('fs:file-exists', filePath),
  getFileInfo: (filePath: string) => ipcRenderer.invoke('fs:get-file-info', filePath),

  // Dialogs
  openFolder: () => ipcRenderer.invoke('dialog:open-folder'),
  openFile: () => ipcRenderer.invoke('dialog:open-file'),

  // Generic IPC
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  send: (channel: string, ...args: unknown[]) => {
    ipcRenderer.send(channel, ...args)
  },
  invoke: (channel: string, ...args: unknown[]) => {
    return ipcRenderer.invoke(channel, ...args)
  },
})