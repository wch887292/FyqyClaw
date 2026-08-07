import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App'
import './styles/global.css'

// 把致命错误直接渲染到页面，避免「静默黑屏」：
// 应用尚未挂载时若发生模块加载 / 初始化异常，用户至少能看到错误信息而非一片黑。
function showFatalError(message: string) {
  const root = document.getElementById('root')
  if (!root || root.childElementCount > 0) return // 已成功挂载则不打扰界面
  const safe = String(message).replace(/</g, '&lt;')
  root.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;padding:40px;gap:16px;background:#1e1e1e;color:#e0e0e0;font-family:system-ui,-apple-system,sans-serif;text-align:center;">
      <div style="font-size:48px;opacity:.6;">⚠️</div>
      <h3 style="margin:0;color:#ff6b6b;font-size:18px;">应用启动失败</h3>
      <pre style="max-width:640px;font-size:12px;line-height:1.6;color:#bbb;white-space:pre-wrap;text-align:left;background:#2a2a2a;padding:16px;border-radius:8px;overflow:auto;">${safe}</pre>
    </div>`
}

try {
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  )
} catch (err) {
  showFatalError('渲染进程初始化异常：\n' + (err instanceof Error ? err.stack || err.message : String(err)))
}

// 兜底：捕获未被 ErrorBoundary 兜住的初始化 / 异步异常
window.addEventListener('error', (e) => {
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
    showFatalError(`资源加载失败：${(target as HTMLScriptElement).src || (target as HTMLLinkElement).href}`)
    return
  }
  showFatalError('运行时错误：\n' + ((e as ErrorEvent).error?.stack || e.message))
})
window.addEventListener('unhandledrejection', (e) => {
  const r = (e as PromiseRejectionEvent).reason
  showFatalError('未处理的 Promise 异常：\n' + (r?.stack || r?.message || String(r)))
})
