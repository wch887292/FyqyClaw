import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import { evaluateSandboxPolicy } from '../src/sandbox/policy/evaluate'
import { isWithinRoot } from '../src/sandbox/policy/path-guard'

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

// 主进程全局兜底：任何 IPC handler / 事件回调中的未捕获异常都不应让主进程直接退出
process.on('uncaughtException', (err) => {
  logRendererError('main:uncaughtException', err?.message, err?.stack)
})
process.on('unhandledRejection', (reason) => {
  logRendererError('main:unhandledRejection', reason instanceof Error ? `${reason.message} ${reason.stack}` : String(reason))
})

let mainWindow: BrowserWindow | null = null

// ──────────────────────────────────────────────────────────────
// 安全边界状态（主进程持有，渲染层通过 IPC 同步）
// - workspaceRoot：用户打开的项目目录；fs:* 操作被限制在此之内（防任意读写）
// - sandboxConfig：沙箱策略（隐私模式禁网 / 允许列表 / 严格白名单）
// ──────────────────────────────────────────────────────────────
let workspaceRoot: string | null = null

interface SandboxRuntimeConfig {
  privacyMode: boolean
  allowedCommands: string[]
  enforceAllowlist: boolean
}
let sandboxConfig: SandboxRuntimeConfig = {
  privacyMode: false,
  allowedCommands: [],
  enforceAllowlist: false,
}

const MAX_FILE_READ_BYTES = 10 * 1024 * 1024 // 读取上限 10MB，防内存撑爆

/** 校验文件路径是否落在工作区根目录内（workspaceRoot 未设置时仅做记录，不强制拦截） */
function validateFsPath(target: string): { ok: boolean; resolved?: string; reason?: string } {
  if (typeof target !== 'string' || target.length === 0) {
    return { ok: false, reason: '无效的文件路径' }
  }
  const resolved = path.resolve(target)
  if (workspaceRoot) {
    const root = path.resolve(workspaceRoot)
    if (!isWithinRoot(resolved, root)) {
      return {
        ok: false,
        resolved,
        reason: `路径越界：仅允许工作区 (${root}) 内的文件操作，已拒绝: ${target}`,
      }
    }
    // 真实路径校验：词法校验无法识别符号链接，需防「工作区内链接指向工作区外」
    // 目标可能尚不存在（写入新文件），取其已存在的最深父目录做真实路径解析
    try {
      const realRoot = fs.realpathSync(root)
      let probe = resolved
      let suffix: string[] = []
      while (!fs.existsSync(probe)) {
        const parent = path.dirname(probe)
        if (parent === probe) break
        suffix.unshift(path.basename(probe))
        probe = parent
      }
      const realTarget = fs.realpathSync(probe)
      const realResolved = suffix.length > 0 ? path.join(realTarget, ...suffix) : realTarget
      if (!isWithinRoot(realResolved, realRoot)) {
        return {
          ok: false,
          resolved,
          reason: `路径经符号链接指向工作区外，已拒绝: ${target}`,
        }
      }
    } catch {
      // realpath 解析失败（如权限不足）时退回词法校验结果
    }
  }
  return { ok: true, resolved }
}

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
  const v = validateFsPath(dirPath)
  if (!v.ok) {
    console.warn('[fs] 越界读取目录被拒绝:', dirPath, '-', v.reason)
    return []
  }
  try {
    const entries = await fs.promises.readdir(v.resolved!, { withFileTypes: true })
    const result = entries
      .filter(entry => !entry.name.startsWith('.') && !entry.name.startsWith('node_modules'))
      .map(entry => {
        const fullPath = path.join(v.resolved!, entry.name)
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
  const v = validateFsPath(filePath)
  if (!v.ok) {
    console.warn('[fs] 越界读取文件被拒绝:', filePath, '-', v.reason)
    return null
  }
  try {
    const stats = await fs.promises.stat(v.resolved!)
    if (stats.size > MAX_FILE_READ_BYTES) {
      console.warn('[fs] 文件过大拒绝读取:', v.resolved!, `(${stats.size} bytes)`)
      return null
    }
    const content = await fs.promises.readFile(v.resolved!, 'utf-8')
    return content
  } catch (error) {
    console.error('Failed to read file:', error)
    return null
  }
})

ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
  const v = validateFsPath(filePath)
  if (!v.ok) {
    console.warn('[fs] 越界写入文件被拒绝:', filePath, '-', v.reason)
    return false
  }
  try {
    // 确保父目录存在（SOLO 生成代码可能写入尚未创建的子目录）
    await fs.promises.mkdir(path.dirname(v.resolved!), { recursive: true })
    await fs.promises.writeFile(v.resolved!, content, 'utf-8')
    return true
  } catch (error) {
    console.error('Failed to write file:', error)
    return false
  }
})

ipcMain.handle('fs:file-exists', async (_event, filePath: string) => {
  const v = validateFsPath(filePath)
  if (!v.ok) return false
  try {
    await fs.promises.access(v.resolved!, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:get-file-info', async (_event, filePath: string) => {
  const v = validateFsPath(filePath)
  if (!v.ok) return null
  try {
    const stats = await fs.promises.stat(v.resolved!)
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

// Workspace root sync（渲染层打开项目目录后调用，fs:* 操作被限制在此内）
ipcMain.handle('workspace:set-root', (_event, root: string) => {
  if (!root) {
    workspaceRoot = null
    console.log('[workspace] root cleared')
    return
  }
  workspaceRoot = path.resolve(root)
  console.log('[workspace] root set to', workspaceRoot)
})

// Sandbox runtime config sync（渲染层隐私模式/白名单变化时调用）
ipcMain.handle('sandbox:configure', (_event, cfg: Partial<SandboxRuntimeConfig>) => {
  if (typeof cfg?.privacyMode === 'boolean') sandboxConfig.privacyMode = cfg.privacyMode
  if (Array.isArray(cfg?.allowedCommands)) sandboxConfig.allowedCommands = cfg.allowedCommands
  if (typeof cfg?.enforceAllowlist === 'boolean') sandboxConfig.enforceAllowlist = cfg.enforceAllowlist
  console.log('[sandbox] config updated', sandboxConfig)
})

// Sandbox - Real command execution via child_process, with security policy enforced at the main-process boundary
ipcMain.handle('sandbox:execute', async (_event, request: { id: string; command: string; cwd: string; timeout: number; privacyMode?: boolean; allowedCommands?: string[]; enforceAllowlist?: boolean }) => {
  return new Promise((resolve) => {
    const startTime = Date.now()

    // 安全策略检查（主进程边界强制，防止渲染层绕过）
    // 注意：策略只取主进程持有的 sandboxConfig，绝不信任渲染层请求参数里的
    // privacyMode/allowedCommands/enforceAllowlist —— 渲染层可能被 XSS / prompt
    // injection 控制，若允许其自报策略即可轻易绕过白名单与隐私模式。
    const policy = evaluateSandboxPolicy(request.command, request.cwd || process.cwd(), {
      privacyMode: sandboxConfig.privacyMode,
      allowedCommands: sandboxConfig.allowedCommands,
      enforceAllowlist: sandboxConfig.enforceAllowlist,
    })
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
    let outputTruncated = false
    const MAX_OUTPUT_BYTES = 1024 * 1024 // 主进程输出上限 1MB，防 stdout/stderr 无限累积撑爆内存

    const isWindows = process.platform === 'win32'
    const shell = isWindows ? 'cmd.exe' : '/bin/bash'
    const shellArgs = isWindows ? ['/c', request.command] : ['-c', request.command]

    // 直接以 shell 为程序执行，不要再用 shell:true 双重包裹（否则变成 sh -c "bash -c cmd"）
    const child = spawn(shell, shellArgs, {
      cwd: request.cwd || process.cwd(),
      detached: !isWindows,
      env: { ...process.env, PATH: process.env.PATH },
    })

    // 超时终止：杀整个进程组（POSIX），避免遗留孤儿子进程
    const killTimer = setTimeout(() => {
      try {
        if (!isWindows && child.pid) {
          process.kill(-child.pid, 'SIGKILL')
        } else {
          child.kill('SIGKILL')
        }
      } catch {
        /* 进程可能已退出 */
      }
      clearTimeout(killTimer)
    }, request.timeout || 30000)
    killTimer.unref()

    child.stdout.on('data', (data: Buffer) => {
      if (!outputTruncated) {
        const text = data.toString()
        if (stdout.length + text.length > MAX_OUTPUT_BYTES) {
          stdout = stdout.slice(0, MAX_OUTPUT_BYTES) + '\n[输出超限，已截断]'
          outputTruncated = true
        } else {
          stdout += text
        }
      }
    })

    child.stderr.on('data', (data: Buffer) => {
      if (!outputTruncated) {
        const text = data.toString()
        if (stderr.length + text.length > MAX_OUTPUT_BYTES) {
          stderr = stderr.slice(0, MAX_OUTPUT_BYTES) + '\n[输出超限，已截断]'
          outputTruncated = true
        } else {
          stderr += text
        }
      }
    })

    child.on('error', (error: Error) => {
      clearTimeout(killTimer)
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
      clearTimeout(killTimer)
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

// Git IPC handlers（安全说明：一律 shell:false 传参数组，禁止 shell 拼接，防命令注入）
ipcMain.handle('git:status', async (_event, repoPath: string) => {
  try {
    if (typeof repoPath !== 'string' || repoPath.length === 0) return null
    // Check if .git exists
    const gitDir = path.join(repoPath, '.git')
    try {
      await fs.promises.access(gitDir, fs.constants.F_OK)
    } catch {
      return null
    }

    const execGit = (args: string[]): Promise<string> => {
      return new Promise((resolve, reject) => {
        const child = spawn('git', args, {
          cwd: repoPath,
          shell: false,
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
      execGit(['rev-parse', '--abbrev-ref', 'HEAD']),
      execGit(['status', '--porcelain']),
      execGit(['rev-list', '--left-right', '--count', 'HEAD...@{upstream}']).catch(() => '0 0'),
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
    if (typeof repoPath !== 'string' || repoPath.length === 0) return []
    const n = Math.max(1, Math.min(100, Number(count) || 10))
    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn('git', ['log', '--oneline', '--format=%H|%an|%ai|%s', `-${n}`], {
        cwd: repoPath,
        shell: false,
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
    if (typeof repoPath !== 'string' || repoPath.length === 0) return []
    const result = await new Promise<string>((resolve, reject) => {
      const child = spawn('git', ['branch', '--all'], {
        cwd: repoPath,
        shell: false,
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
    if (typeof repoPath !== 'string' || repoPath.length === 0 || typeof filePath !== 'string') return false
    await new Promise<string>((resolve, reject) => {
      const child = spawn('git', ['add', '--', filePath], {
        cwd: repoPath,
        shell: false,
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
    if (typeof repoPath !== 'string' || repoPath.length === 0) return false
    await new Promise<string>((resolve, reject) => {
      const child = spawn('git', ['add', '-A'], {
        cwd: repoPath,
        shell: false,
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
    if (typeof repoPath !== 'string' || repoPath.length === 0 || typeof message !== 'string') return false
    await new Promise<string>((resolve, reject) => {
      const child = spawn('git', ['commit', '-m', message], {
        cwd: repoPath,
        shell: false,
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