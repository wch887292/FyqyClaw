export function isElectron(): boolean {
  return typeof window !== 'undefined' && 'electronAPI' in window
}

export async function getPlatform(): Promise<string> {
  if (isElectron()) {
    return window.electronAPI!.getPlatform()
  }
  return navigator.platform
}