import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { evaluateSandboxPolicy } from '../src/sandbox/policy/evaluate'

// ──────────────────────────────────────────────────────────────
// 修复 Windows 安装后主窗口内容区「纯黑」的问题
// 部分显卡/驱动、远程桌面(RDP)、虚拟机环境下，Chromium 的 GPU 合成会失败，
// 表现为：原生标题栏/菜单正常，但网页内容区渲染为纯黑。
// 关闭硬件加速回退到软件渲染，并允许 WebGL(Monaco / xterm) 走 SwiftShader。
// ──────────────────────────────────────────────────────────────
app.disableHardwareAcceleration()
app.commandLine.appendSwitch('enable-unsafe-swiftshader')

// 渲染进程异常日志（黑屏 / 崩溃时便于定位，文件在 userData 目录）
function logRendererError(...args: unknown[]) {
  try {
    const p = path.join(app.getPath('userData'), 'renderer-error.log')
    fs.appendFileSync(p, `[${new Date().toISOString()}] ${args.map((a) => String(a)).join(' ')}\n`)
  } catch {
    /* ignore */
  }
}

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'FyqyClaw - 飞扬企源AI',
    backgroundColor: '#1e1e1e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 诊断：把渲染进程加载失败写入日志，避免「静默黑屏」无法排查
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logRendererError('did-fail-load', errorCode, errorDescription, validatedURL)
  })
  // 调试开关：FYQY_DEBUG=1 时自动打开 DevTools
  if (process.env.FYQY_DEBUG) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

app.whenReady().then(createWindow)

app.on('render-process-gone', (_event, _window, details) => {
  logRendererError('render-process-gone', details?.reason)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC handlers for module communication
ipcMain.handle('app:get-version', () => {
  return app.getVersion()
})

ipcMain.handle('app:get-platform', () => {
  return process.platform
})

// File System IPC handlers
ipcMain.handle('fs:read-directory', async (_event, dirPath: string) => {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true })
    const result = entries
      .filter(entry => !entry.name.startsWith('.') && !entry.name.startsWith('node_modules'))
      .map(entry => {
        const fullPath = path.join(dirPath, entry.name)
        const isDir = entry.isDirectory()
        return {
          name: entry.name,
          path: fullPath,
          type: isDir ? 'directory' : 'file',
          ...(isDir ? { children: [] } : {}),
          size: isDir ? undefined : 0,
          modifiedAt: undefined,
        }
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
        return a.name.localeCompare(b.name)
      })
    return result
  } catch (error) {
    console.error('Failed to read directory:', error)
    return []
  }
})

ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
  try {
    const content = await fs.promises.readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    console.error('Failed to read file:', error)
    return null
  }
})

ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
  try {
    // 确保父目录存在（SOLO 生成代码可能写入尚未创建的子目录）
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
    await fs.promises.writeFile(filePath, content, 'utf-8')
    return true
  } catch (error) {
    console.error('Failed to write file:', error)
    return false
  }
})

ipcMain.handle('fs:file-exists', async (_event, filePath: string) => {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:get-file-info', async (_event, filePath: string) => {
  try {
    const stats = await fs.promises.stat(filePath)
    return {
      size: stats.size,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      createdAt: stats.birthtime.toISOString(),
      modifiedAt: stats.mtime.toISOString(),
    }
  } catch {
    return null
  }
})

// Dialog handlers
ipcMain.handle('dialog:open-folder', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '选择项目文件夹',
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

ipcMain.handle('dialog:open-file', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: '打开文件',
    filters: [
      { name: '所有支持的代码文件', extensions: ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs', 'java', 'json', 'md', 'css', 'html'] },
      { name: '所有文件', extensions: ['*'] },
    ],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// Sandbox - Real command execution via child_process, with security policy enforced at the main-process boundary
ipcMain.handle('sandbox:execute', async (_event, request: { id: string; command: string; cwd: string; timeout: number }) => {
  return new Promise((resolve) => {
    const startTime = Date.now()

    // 安全策略检查（主进程边界强制，防止渲染层绕过）
    const policy = evaluateSandboxPolicy(request.command, request.cwd || process.cwd())
    if (!policy.allowed) {
      const reason = policy.reason || '命令被安全策略阻止'
      console.warn('[sandbox] 已拦截命令:', request.command, '-', reason)
      logRendererError('sandbox:blocked', request.command, reason)
      return resolve({
        id: request.id,
        exitCode: -1,
        stdout: '',
        stderr: reason,
        duration: Date.now() - startTime,
        wasBlocked: true,
        blockReason: reason,
      })
    }

    let stdout = ''
    let stderr = ''

    const isWindows = process.platform === 'win32'
    const shell = isWindows ? 'cmd.exe' : '/bin/bash'
    const shellArgs = isWindows ? ['/c', request.command] : ['-c', request.command]

    const child = spawn(shell, shellArgs, {
      cwd: request.cwd || process.cwd(),
      timeout: request.timeout || 30000,
      shell: true,
      env: { ...process.env, PATH: process.env.PATH },
    })

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    child.on('error', (error: Error) => {
      resolve({
        id: request.id,
        exitCode: -1,
        stdout,
        stderr: error.message,
        duration: Date.now() - startTime,
        wasBlocked: false,
      })
    })

    child.on('close', (exitCode: number | null) => {
      resolve({
        id: request.id,
        exitCode: exitCode ?? -1,
        stdout,
        stderr,
        duration: Date.now() - startTime,
        wasBlocked: false,
      })
    })
  })
})

// Git IPC handlers
ipcMain.handle('git:status', async (_event, repoPath: string) => {
  try {
    // Check if .git exists
    const gitDir = path.join(repoPath, '.git')
    try {
      await fs.promises.access(gitDir, fs.constants.F_OK)
    } catch {
      return null
    }

    const execGit = (args: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const child = spawn('git', args.split(' '), {
          cwd: repoPath,
          shell: true,
        })
        let output = ''
        child.stdout.on('data', (data: Buffer) => { output += data.toString() })
        child.on('close', (code) => {
          code === 0 ? resolve(output.trim()) : reject(new Error(output))
        })
        child.on('error', reject)
      })
    }

    const [branchOutput, statusOutput, aheadBehind] = await Promise.all([
      execGit('rev-parse --abbrev-ref HEAD'),
      execGit('status --porcelain'),
      execGit('rev-list --left-right --count HEAD...@{upstream}').catch(() => '0 0'),
    ])

    const [ahead, behind] = aheadBehind.split(/\s+/).map(Number)
    const lines = statusOutput.split('\n').filter(Boolean)
    const changes = lines.map(line => {
      const staged = line[0] !== ' '
      const statusChar = staged ? line[0] : line[1]
      const path = line.substring(3).trim()
      let status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked' = 'modified'
      if (statusChar === 'M' || statusChar === ' ') status = 'modified'
      else if (statusChar === 'A') status = 'added'
      else if (statusChar === 'D') status = 'deleted'
      else if (statusChar === 'R') status = 'renamed'
      else if (statusChar === '?' || statusChar === '!') status = 'untracked'
      return { path, status, staged }
    })

    return {
      branch: branchOutput || 'unknown',
      changes,
      ahead: ahead || 0,
      behind: behind || 0,
      staged: changes.filter(c => c.staged).length,
      unstaged: changes.filter(c => !c.staged).length,
    }
  } catch (error) {
    console.error('Git status failed:', error)
    return null
  }
})

ipcMain.handle('git:log', async (_event, repoPath: string, count: number = 10) => {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn('git', [`log`, `--oneline`, `--format=%H|%an|%ai|%s`, `-${count}`], {
        cwd: repoPath,
        shell: true,
      })
      let output = ''
      child.stdout.on('data', (data: Buffer) => { output += data.toString() })
      child.on('close', (code) => {
        code === 0 ? resolve(output.trim()) : reject(new Error(output))
      })
      child.on('error', reject)
    })

    return result.split('\n').filter(Boolean).map(line => {
      const [hash, author, date, ...msgParts] = line.split('|')
      return { hash, author, date, message: msgParts.join('|') }
    })
  } catch {
    return []
  }
})

ipcMain.handle('git:branches', async (_event, repoPath: string) => {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn('git', ['branch', '--all'], {
        cwd: repoPath,
        shell: true,
      })
      let output = ''
      child.stdout.on('data', (data: Buffer) => { output += data.toString() })
      child.on('close', (code) => {
        code === 0 ? resolve(output.trim()) : reject(new Error(output))
      })
      child.on('error', reject)
    })

    return result.split('\n').filter(Boolean).map(line => {
      const current = line.startsWith('*')
      const name = line.replace('*', '').trim()
      const remote = name.startsWith('remotes/') ? 'remote' : undefined
      return { name: name.replace('remotes/', ''), current, remote }
    })
  } catch {
    return []
  }
})

ipcMain.handle('git:add', async (_event, repoPath: string, filePath: string) => {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn('git', ['add', filePath], {
        cwd: repoPath,
        shell: true,
      })
      let output = ''
      child.stdout.on('data', (data: Buffer) => { output += data.toString() })
      child.stderr.on('data', (data: Buffer) => { output += data.toString() })
      child.on('close', (code) => {
        code === 0 ? resolve(output.trim()) : reject(new Error(output))
      })
      child.on('error', reject)
    })
    return true
  } catch {
    return false
  }
})

ipcMain.handle('git:add-all', async (_event, repoPath: string) => {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn('git', ['add', '-A'], {
        cwd: repoPath,
        shell: true,
      })
      let output = ''
      child.stdout.on('data', (data: Buffer) => { output += data.toString() })
      child.stderr.on('data', (data: Buffer) => { output += data.toString() })
      child.on('close', (code) => {
        code === 0 ? resolve(output.trim()) : reject(new Error(output))
      })
      child.on('error', reject)
    })
    return true
  } catch {
    return false
  }
})

ipcMain.handle('git:commit', async (_event, repoPath: string, message: string) => {
  try {
    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn('git', ['commit', '-m', message], {
        cwd: repoPath,
        shell: true,
      })
      let output = ''
      child.stdout.on('data', (data: Buffer) => { output += data.toString() })
      child.stderr.on('data', (data: Buffer) => { output += data.toString() })
      child.on('close', (code) => {
        code === 0 ? resolve(output.trim()) : reject(new Error(output))
      })
      child.on('error', reject)
    })
    return true
  } catch {
    return false
  }
})