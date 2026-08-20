import path from 'path'

/**
 * 判断目标路径是否落在根目录内（含根自身）。
 * 用于主进程 fs:* IPC 的越界校验：agent / 任意调用方只能读写工作区内的文件，
 * 防止写到 /etc、~/.ssh 等任意位置（防 prompt injection 越权）。
 */
export function isWithinRoot(target: string, root: string): boolean {
  const rel = path.relative(root, target)
  if (rel === '') return true
  if (rel === '..') return false
  if (rel.startsWith('..')) return !rel.startsWith('..' + path.sep)
  return !path.isAbsolute(rel)
}
