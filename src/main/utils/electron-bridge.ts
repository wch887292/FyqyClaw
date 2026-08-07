/**
 * 浏览器安全的 Electron API 桥接
 * 在 Electron 环境中调用原生 API，在纯浏览器中优雅降级
 * 支持浏览器 File System Access API 作为后备方案
 */

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI?.invoke

export async function openFolderDialog(): Promise<string | undefined> {
  if (isElectron) {
    try {
      return await (window as any).electronAPI.invoke('dialog:open-folder')
    } catch (err) {
      console.error('[electron-bridge] openFolderDialog 失败:', err)
      return undefined
    }
  }
  // Browser fallback: use File System Access API
  try {
    if (typeof (window as any).showDirectoryPicker === 'function') {
      const dirHandle = await (window as any).showDirectoryPicker()
      // Store the handle for later use
      ;(window as any).__currentDirHandle = dirHandle
      return dirHandle.name
    }
  } catch (err: any) {
    if (err.name !== 'AbortError') { // user cancelled
      console.warn('[electron-bridge] showDirectoryPicker 不可用:', err)
    }
    return undefined
  }
  console.warn('[electron-bridge] openFolderDialog: 浏览器 File System Access API 不可用')
  return undefined
}

export async function openFileDialog(): Promise<string | undefined> {
  if (isElectron) {
    try {
      return await (window as any).electronAPI.invoke('dialog:open-file')
    } catch (err) {
      console.error('[electron-bridge] openFileDialog 失败:', err)
      return undefined
    }
  }
  // Browser fallback: use File input
  try {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.onchange = () => {
        const file = input.files?.[0]
        if (file) {
          resolve(file.name)
        } else {
          resolve(undefined)
        }
      }
      input.click()
    })
  } catch {
    return undefined
  }
}

export async function getGitStatus(cwd?: string): Promise<{ branch?: string } | undefined> {
  if (isElectron) {
    try {
      return await (window as any).electronAPI.invoke('git:status', cwd || getCwd())
    } catch {
      return undefined
    }
  }
  return undefined
}

export function getCwd(): string {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    return process.cwd()
  }
  return '/'
}

export function isElectronEnv(): boolean {
  return isElectron
}

/**
 * Read directory contents. Uses Electron IPC in Electron, otherwise returns mock data.
 */
export async function readDirectory(dirPath: string): Promise<Array<{ name: string; path: string; type: 'file' | 'directory' }> | undefined> {
  if (isElectron) {
    try {
      return await (window as any).electronAPI.invoke('fs:read-directory', dirPath)
    } catch (err) {
      console.error('[electron-bridge] readDirectory 失败:', err)
      return undefined
    }
  }
  // Browser fallback: try File System Access API
  try {
    const dirHandle = (window as any).__currentDirHandle
    if (!dirHandle) return undefined

    const entries: Array<{ name: string; path: string; type: 'file' | 'directory' }> = []
    for await (const entry of dirHandle.values()) {
      entries.push({
        name: entry.name,
        path: `${dirPath}/${entry.name}`,
        type: entry.kind === 'directory' ? 'directory' : 'file',
      })
    }
    return entries.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
  } catch (err) {
    console.warn('[electron-bridge] readDirectory 浏览器回退失败:', err)
    return undefined
  }
}

/**
 * Read file content. Uses Electron IPC in Electron, otherwise returns placeholder content.
 */
export async function readFile(filePath: string): Promise<string | undefined> {
  if (isElectron) {
    try {
      return await (window as any).electronAPI.invoke('fs:read-file', filePath)
    } catch (err) {
      console.error('[electron-bridge] readFile 失败:', err)
      return undefined
    }
  }
  // Browser fallback: try File System Access API
  try {
    const dirHandle = (window as any).__currentDirHandle
    if (!dirHandle) return undefined

    const fileName = filePath.split('/').pop() || filePath
    const fileHandle = await dirHandle.getFileHandle(fileName)
    const file = await fileHandle.getFile()
    return await file.text()
  } catch (err) {
    console.warn('[electron-bridge] readFile 浏览器回退失败:', err)
    return undefined
  }
}

/**
 * Write content to a file. Uses Electron IPC in Electron, otherwise tries File System Access API.
 */
export async function writeFile(filePath: string, content: string): Promise<boolean> {
  if (isElectron) {
    try {
      await (window as any).electronAPI.invoke('fs:write-file', filePath, content)
      return true
    } catch (err) {
      console.error('[electron-bridge] writeFile 失败:', err)
      return false
    }
  }
  // Browser fallback: use File System Access API
  try {
    const dirHandle = (window as any).__currentDirHandle
    if (!dirHandle) return false

    const fileName = filePath.split('/').pop() || filePath
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(content)
    await writable.close()
    return true
  } catch (err) {
    console.warn('[electron-bridge] writeFile 浏览器回退失败:', err)
    return false
  }
}