import React, { useState, useRef, useCallback, useEffect } from 'react'

export function BrowserPanel() {
  const [url, setUrl] = useState('https://www.baidu.com')
  const [currentUrl, setCurrentUrl] = useState('https://www.baidu.com')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<string[]>(['https://www.baidu.com'])
  const [historyIndex, setHistoryIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const canGoBack = historyIndex > 0
  const canGoForward = historyIndex < history.length - 1

  const navigate = useCallback((targetUrl: string) => {
    let normalized = targetUrl.trim()
    if (!normalized) return
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = 'https://' + normalized
    }
    setUrl(normalized)
    setCurrentUrl(normalized)
    setLoading(true)
    setError(null)

    // Trim history if we navigated back then went somewhere new
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(normalized)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }, [history, historyIndex])

  const handleGo = useCallback(() => {
    navigate(url)
  }, [url, navigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleGo()
    }
  }

  const handleBack = useCallback(() => {
    if (!canGoBack) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    const prevUrl = history[newIndex]
    setUrl(prevUrl)
    setCurrentUrl(prevUrl)
    setLoading(true)
    setError(null)
  }, [canGoBack, historyIndex, history])

  const handleForward = useCallback(() => {
    if (!canGoForward) return
    const newIndex = historyIndex + 1
    setHistoryIndex(newIndex)
    const nextUrl = history[newIndex]
    setUrl(nextUrl)
    setCurrentUrl(nextUrl)
    setLoading(true)
    setError(null)
  }, [canGoForward, historyIndex, history])

  const handleRefresh = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl
    }
    setLoading(true)
    setError(null)
  }, [currentUrl])

  // Try to detect iframe load errors
  const handleIframeLoad = useCallback(() => {
    setLoading(false)
    // Check if the iframe loaded successfully by trying to access contentDocument
    try {
      const doc = iframeRef.current?.contentDocument
      if (!doc) {
        setError(null) // cross-origin, but page likely loaded
      }
    } catch {
      // cross-origin restriction, page loaded fine
      setError(null)
    }
  }, [])

  // Detect iframe errors via a timer check
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => {
      if (loading) {
        setLoading(false)
        setError('页面加载超时，请检查网址是否正确或目标网站是否可访问')
      }
    }, 15000)
    return () => clearTimeout(timer)
  }, [loading, currentUrl])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 12 }}>
      {/* Navigation Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 8px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        flexShrink: 0,
      }}>
        {/* Back button */}
        <button
          onClick={handleBack}
          disabled={!canGoBack}
          title="后退"
          style={{
            width: 26, height: 26, borderRadius: 4,
            border: 'none', background: 'transparent',
            color: canGoBack ? 'var(--text-primary)' : 'var(--border-color)',
            cursor: canGoBack ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.08s',
          }}
          onMouseEnter={e => { if (canGoBack) e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Forward button */}
        <button
          onClick={handleForward}
          disabled={!canGoForward}
          title="前进"
          style={{
            width: 26, height: 26, borderRadius: 4,
            border: 'none', background: 'transparent',
            color: canGoForward ? 'var(--text-primary)' : 'var(--border-color)',
            cursor: canGoForward ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.08s',
          }}
          onMouseEnter={e => { if (canGoForward) e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* Refresh button */}
        <button
          onClick={handleRefresh}
          title="刷新"
          style={{
            width: 26, height: 26, borderRadius: 4,
            border: 'none', background: 'transparent',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.08s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>

        {/* URL Input */}
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入网址..."
            style={{
              width: '100%',
              padding: '4px 10px',
              paddingRight: 30,
              borderRadius: 6,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: 12,
              outline: 'none',
              fontFamily: 'monospace',
            }}
          />
          {loading && (
            <div style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 14,
              height: 14,
              border: '2px solid var(--border-color)',
              borderTopColor: 'var(--accent-blue)',
              borderRadius: '50%',
              animation: 'spin 0.6s linear infinite',
            }} />
          )}
        </div>

        {/* Go button */}
        <button
          onClick={handleGo}
          title="前往"
          style={{
            width: 26, height: 26, borderRadius: 4,
            border: 'none', background: 'var(--accent-blue)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.08s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.85' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          padding: '8px 12px',
          background: 'rgba(244,71,71,0.1)',
          borderBottom: '1px solid rgba(244,71,71,0.3)',
          color: 'var(--accent-red)',
          fontSize: 11,
          lineHeight: 1.5,
          flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* Iframe content area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <iframe
          ref={iframeRef}
          src={currentUrl}
          onLoad={handleIframeLoad}
          title="内置浏览器"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'white',
          }}
        />
        {/* Loading overlay */}
        {loading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: 'var(--bg-tertiary)',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: '30%',
              background: 'linear-gradient(90deg, var(--accent-blue), #4ec9b0)',
              borderRadius: 1,
              animation: 'browserProgress 1.2s ease-in-out infinite',
            }} />
          </div>
        )}
      </div>
    </div>
  )
}