import React, { useState, useCallback, useRef, useEffect } from 'react'

interface CrawlResult {
  selector: string
  count: number
  data: string[]
  preview: string
}

type CrawlerMode = 'fetch' | 'browse'

export function CrawlerPanel() {
  const [mode, setMode] = useState<CrawlerMode>('fetch')
  const [url, setUrl] = useState('')
  const [selector, setSelector] = useState('')
  const [useProxy, setUseProxy] = useState(true)
  const [proxyUrl, setProxyUrl] = useState('https://api.allorigins.win/raw?url=')
  const [loading, setLoading] = useState(false)
  const [rawHtml, setRawHtml] = useState<string | null>(null)
  const [results, setResults] = useState<CrawlResult[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // Browse mode states
  const [browseUrl, setBrowseUrl] = useState('')
  const [browseHtml, setBrowseHtml] = useState<string | null>(null)
  const [pickerMode, setPickerMode] = useState(false)
  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, string>>({})
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Anti-crawler settings
  const [antiCrawlerOpen, setAntiCrawlerOpen] = useState(false)
  const [requestDelay, setRequestDelay] = useState(0)
  const [randomDelay, setRandomDelay] = useState(true)
  const [retryCount, setRetryCount] = useState(1)
  const [useReferer, setUseReferer] = useState(true)
  const [customHeaders, setCustomHeaders] = useState('')

  const addLog = useCallback((msg: string) => {
    setLogs(prev => {
      const next = [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]
      return next.slice(-100)
    })
    setTimeout(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' })
    }, 50)
  }, [])

  // Delay helper for anti-crawler
  const sleep = useCallback(async () => {
    if (requestDelay <= 0) return
    const delay = randomDelay
      ? requestDelay + Math.random() * requestDelay
      : requestDelay
    await new Promise(r => setTimeout(r, delay))
  }, [requestDelay, randomDelay])

  // Build fetch headers with anti-crawler measures
  const buildHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {}
    // Parse custom headers
    if (customHeaders.trim()) {
      customHeaders.split('\n').forEach(line => {
        const idx = line.indexOf(':')
        if (idx > 0) {
          const key = line.slice(0, idx).trim()
          const val = line.slice(idx + 1).trim()
          if (key && val) headers[key] = val
        }
      })
    }
    // Set referer
    if (useReferer) {
      headers['Referer'] = url.trim() || browseUrl.trim()
    }
    return headers
  }, [customHeaders, useReferer, url, browseUrl])

  // Fetch with retry and anti-crawler delay
  const fetchWithRetry = useCallback(async (fetchUrl: string, signal: AbortSignal): Promise<Response> => {
    const maxRetries = Math.max(0, retryCount)
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        addLog(`🔄 重试第 ${attempt} 次...`)
        // Longer delay before retry
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000))
      }

      // Apply delay before request
      await sleep()

      try {
        const headers = buildHeaders()
        const response = await fetch(fetchUrl, { signal, headers })
        return response
      } catch (err: any) {
        lastError = err
        if (err.name === 'AbortError') throw err
        if (attempt < maxRetries) {
          addLog(`⚠️ 请求失败: ${err.message}, 准备重试`)
        }
      }
    }
    throw lastError || new Error('请求失败')
  }, [retryCount, sleep, addLog, buildHeaders])

  // ─── Fetch mode ───

  const handleFetch = useCallback(async () => {
    const targetUrl = url.trim()
    if (!targetUrl) return

    setLoading(true)
    setError(null)
    setRawHtml(null)
    setResults([])
    addLog(`开始抓取: ${targetUrl}`)

    try {
      const fetchUrl = useProxy
        ? `${proxyUrl.replace(/\/+$/, '')}/${encodeURIComponent(targetUrl)}`
        : targetUrl

      addLog(`请求地址: ${fetchUrl}`)
      const response = await fetchWithRetry(fetchUrl, AbortSignal.timeout(30000))

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      setRawHtml(html)
      addLog(`成功获取页面，大小: ${(html.length / 1024).toFixed(1)} KB`)

      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')

      const title = doc.querySelector('title')?.textContent || '无标题'
      const links = doc.querySelectorAll('a[href]').length
      const images = doc.querySelectorAll('img').length
      const headings = doc.querySelectorAll('h1, h2, h3').length

      addLog(`页面标题: ${title}`)
      addLog(`页面分析: ${links} 个链接, ${images} 张图片, ${headings} 个标题`)

      const autoResults: CrawlResult[] = []

      // Detect links
      const linkData: string[] = []
      doc.querySelectorAll('a[href]').forEach(el => {
        const href = (el as HTMLAnchorElement).href
        const text = el.textContent?.trim()
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          linkData.push(`${text || '链接'}: ${href}`)
        }
      })
      if (linkData.length > 0) {
        autoResults.push({
          selector: 'a[href] (所有链接)',
          count: linkData.length,
          data: linkData.slice(0, 50),
          preview: linkData.slice(0, 3).join('\n'),
        })
      }

      // Detect images
      const imgData: string[] = []
      doc.querySelectorAll('img[src]').forEach(el => {
        const src = (el as HTMLImageElement).src
        const alt = (el as HTMLImageElement).alt || '无描述'
        if (src) imgData.push(`${alt}: ${src}`)
      })
      if (imgData.length > 0) {
        autoResults.push({
          selector: 'img[src] (所有图片)',
          count: imgData.length,
          data: imgData.slice(0, 50),
          preview: imgData.slice(0, 3).join('\n'),
        })
      }

      // Detect headings
      const headingData: string[] = []
      doc.querySelectorAll('h1, h2, h3').forEach(el => {
        const tag = el.tagName.toLowerCase()
        const text = el.textContent?.trim()
        if (text) headingData.push(`[${tag}] ${text}`)
      })
      if (headingData.length > 0) {
        autoResults.push({
          selector: 'h1, h2, h3 (标题结构)',
          count: headingData.length,
          data: headingData,
          preview: headingData.slice(0, 5).join('\n'),
        })
      }

      // Detect tables
      doc.querySelectorAll('table').forEach((table, i) => {
        const rows: string[] = []
        table.querySelectorAll('tr').forEach(row => {
          const cells: string[] = []
          row.querySelectorAll('td, th').forEach(cell => {
            cells.push(cell.textContent?.trim() || '')
          })
          if (cells.length > 0) rows.push(cells.join(' | '))
        })
        if (rows.length > 0) {
          autoResults.push({
            selector: `table[${i + 1}] (表格)`,
            count: rows.length - 1,
            data: rows,
            preview: rows.slice(0, 3).join('\n'),
          })
        }
      })

      if (autoResults.length > 0) {
        setResults(autoResults)
        addLog(`自动检测到 ${autoResults.length} 类数据结构`)
      } else {
        addLog('未检测到明显的结构化数据，请使用自定义选择器提取')
      }

      addLog('抓取完成')
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? '请求超时：目标页面响应过慢'
        : `请求失败: ${err.message || '未知错误'}`
      setError(msg)
      addLog(`❌ ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [url, useProxy, proxyUrl, addLog])

  const handleExtract = useCallback(async () => {
    const sel = selector.trim()
    if (!sel || !rawHtml) return

    addLog(`使用选择器提取: ${sel}`)

    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(rawHtml, 'text/html')

      let elements: Element[] = []
      try {
        elements = Array.from(doc.querySelectorAll(sel))
      } catch {
        throw new Error(`CSS 选择器无效: ${sel}`)
      }

      if (elements.length === 0) {
        addLog(`未找到匹配 "${sel}" 的元素`)
        setError(`未找到匹配 "${sel}" 的元素`)
        return
      }

      const data = elements.map(el => {
        if (el.tagName === 'A') return (el as HTMLAnchorElement).href || el.textContent?.trim() || ''
        if (el.tagName === 'IMG') return (el as HTMLImageElement).src || el.getAttribute('data-src') || ''
        return el.textContent?.trim() || el.innerHTML?.trim() || ''
      })

      const newResult: CrawlResult = {
        selector: sel,
        count: data.length,
        data,
        preview: data.slice(0, 5).join('\n'),
      }

      setResults(prev => {
        const filtered = prev.filter(r => r.selector !== sel)
        return [...filtered, newResult]
      })
      addLog(`提取完成: ${data.length} 条数据`)
      setError(null)
    } catch (err: any) {
      const msg = `提取失败: ${err.message || '未知错误'}`
      setError(msg)
      addLog(`❌ ${msg}`)
    }
  }, [selector, rawHtml, addLog])

  // ─── Browse mode ───

  const handleBrowseLoad = useCallback(async () => {
    const targetUrl = browseUrl.trim()
    if (!targetUrl) return

    setLoading(true)
    setError(null)
    setBrowseHtml(null)
    setPickerMode(false)
    setSelectedElement(null)
    setFormData({})
    addLog(`浏览模式加载: ${targetUrl}`)

    try {
      const fetchUrl = useProxy
        ? `${proxyUrl.replace(/\/+$/, '')}/${encodeURIComponent(targetUrl)}`
        : targetUrl

      addLog(`通过代理获取: ${fetchUrl}`)
      const response = await fetchWithRetry(fetchUrl, AbortSignal.timeout(30000))

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      setBrowseHtml(html)
      addLog(`页面获取成功，大小: ${(html.length / 1024).toFixed(1)} KB`)
      addLog('页面已渲染到浏览器视图，可进行交互操作')
    } catch (err: any) {
      const msg = err.name === 'AbortError'
        ? '请求超时：目标页面响应过慢'
        : `加载失败: ${err.message || '未知错误'}`
      setError(msg)
      addLog(`❌ ${msg}`)
    } finally {
      setLoading(false)
    }
  }, [browseUrl, useProxy, proxyUrl, addLog])

  // Inject <base> tag to resolve relative URLs, and inject picker script if picker mode is on
  const getIframeSrcdoc = useCallback(() => {
    if (!browseHtml) return ''
    const baseUrl = browseUrl.trim()
    // Inject base tag and picker support
    const baseTag = baseUrl
      ? `<base href="${baseUrl.replace(/\/[^/]*$/, '/')}">`
      : ''
    const pickerScript = `
<script>
  window.__pickerMode = false
  window.__selectedInfo = null

  // Listen for picker mode toggle from parent
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'set-picker') {
      window.__pickerMode = e.data.value
      document.body.style.cursor = window.__pickerMode ? 'crosshair' : ''
    }
    if (e.data && e.data.type === 'fill-form') {
      var el = document.querySelector(e.data.selector)
      if (el) el.value = e.data.value
    }
    if (e.data && e.data.type === 'click-element') {
      var el = document.querySelector(e.data.selector)
      if (el) el.click()
    }
    if (e.data && e.data.type === 'scroll-to') {
      var el = document.querySelector(e.data.selector)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
    if (e.data && e.data.type === 'extract-data') {
      var sel = e.data.selector
      var items = document.querySelectorAll(sel)
      var data = Array.from(items).map(function(el) {
        if (el.tagName === 'A') return el.href || el.textContent || ''
        if (el.tagName === 'IMG') return el.src || el.getAttribute('data-src') || ''
        return el.textContent ? el.textContent.trim() : (el.innerHTML || '').trim()
      })
      window.parent.postMessage({ type: 'extracted', selector: sel, count: items.length, data: data }, '*')
    }
    if (e.data && e.data.type === 'extract-table') {
      var tables = document.querySelectorAll(e.data.selector || 'table')
      var allData = []
      tables.forEach(function(t, i) {
        var rows = t.querySelectorAll('tr')
        var tableData = []
        rows.forEach(function(row) {
          var cells = []
          row.querySelectorAll('td, th').forEach(function(cell) {
            cells.push(cell.textContent ? cell.textContent.trim() : '')
          })
          if (cells.length > 0) tableData.push(cells.join(' | '))
        })
        allData.push({ index: i, rows: tableData, count: tableData.length })
      })
      window.parent.postMessage({ type: 'extracted-table', data: allData }, '*')
    }
  })

  // Click handler for picker mode
  document.addEventListener('click', function(e) {
    if (window.__pickerMode) {
      e.preventDefault()
      e.stopPropagation()
      var el = e.target
      var path = []
      var current = el
      while (current && current !== document.body && current !== document.documentElement) {
        var tag = current.tagName.toLowerCase()
        if (current.id) {
          path.unshift('#' + current.id)
          break
        }
        var parent = current.parentElement
        if (parent) {
          var siblings = Array.from(parent.children).filter(function(c) { return c.tagName === current.tagName })
          if (siblings.length > 1) {
            var idx = siblings.indexOf(current) + 1
            path.unshift(tag + ':nth-child(' + (Array.from(parent.children).indexOf(current) + 1) + ')')
          } else {
            path.unshift(tag)
          }
        } else {
          path.unshift(tag)
        }
        current = parent
      }
      var cssPath = path.join(' > ')
      var info = {
        tag: el.tagName,
        text: (el.textContent || '').trim().substring(0, 100),
        html: (el.innerHTML || '').trim().substring(0, 200),
        selector: cssPath,
        id: el.id || null,
        className: el.className || null,
      }
      window.__selectedInfo = info
      window.parent.postMessage({ type: 'element-picked', info: info }, '*')
    }
  }, true)
</script>`
    return browseHtml.replace('</head>', `${baseTag}${pickerScript}</head>`)
  }, [browseHtml, browseUrl])

  // Listen for messages from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      // 安全校验：只接受来自本应用内嵌 iframe（srcdoc）的 postMessage，
      // 防止用户抓取的任意页面伪造 element-picked/extracted 消息污染提取结果
      if (e.origin !== window.location.origin) return
      if (!e.source || e.source !== iframeRef.current?.contentWindow) return
      if (e.data?.type === 'element-picked') {
        setSelectedElement(JSON.stringify(e.data.info, null, 2))
        addLog(`选取元素: ${e.data.info.tag} - ${e.data.info.text?.substring(0, 50) || '无文本'}`)
        addLog(`CSS 选择器: ${e.data.info.selector}`)
        setPickerMode(false)
      }
      if (e.data?.type === 'extracted') {
        const newResult: CrawlResult = {
          selector: e.data.selector,
          count: e.data.count,
          data: e.data.data.slice(0, 100),
          preview: e.data.data.slice(0, 5).join('\n'),
        }
        setResults(prev => {
          const filtered = prev.filter(r => r.selector !== e.data.selector)
          return [...filtered, newResult]
        })
        addLog(`提取完成: ${e.data.count} 条数据 (选择器: ${e.data.selector})`)
      }
      if (e.data?.type === 'extracted-table') {
        e.data.data.forEach((t: any) => {
          const newResult: CrawlResult = {
            selector: `table[${t.index + 1}] (浏览模式)`,
            count: t.count,
            data: t.rows,
            preview: t.rows.slice(0, 5).join('\n'),
          }
          setResults(prev => [...prev, newResult])
        })
        addLog(`提取完成: ${e.data.data.length} 个表格`)
      }
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [addLog])

  const togglePickerMode = useCallback(() => {
    const newMode = !pickerMode
    setPickerMode(newMode)
    iframeRef.current?.contentWindow?.postMessage({ type: 'set-picker', value: newMode }, '*')
    addLog(newMode ? '🖱️ 元素选取模式已开启，点击页面元素获取信息' : '元素选取模式已关闭')
  }, [pickerMode, addLog])

  const handleFormFill = useCallback(() => {
    if (!selectedElement) return
    try {
      const info = JSON.parse(selectedElement)
      if (!info.selector) return
      const value = prompt('输入要填写的内容:', '')
      if (value !== null) {
        iframeRef.current?.contentWindow?.postMessage({ type: 'fill-form', selector: info.selector, value }, '*')
        setFormData(prev => ({ ...prev, [info.selector]: value }))
        addLog(`已填写表单: ${info.selector} = "${value}"`)
      }
    } catch { /* ignore */ }
  }, [selectedElement, addLog])

  const handleClickElement = useCallback(() => {
    if (!selectedElement) return
    try {
      const info = JSON.parse(selectedElement)
      if (!info.selector) return
      iframeRef.current?.contentWindow?.postMessage({ type: 'click-element', selector: info.selector }, '*')
      addLog(`已点击元素: ${info.selector}`)
    } catch { /* ignore */ }
  }, [selectedElement, addLog])

  const handleExtractFromIframe = useCallback(() => {
    if (!selectedElement) return
    try {
      const info = JSON.parse(selectedElement)
      if (!info.selector) return
      iframeRef.current?.contentWindow?.postMessage({ type: 'extract-data', selector: info.selector }, '*')
      addLog(`正在提取数据: ${info.selector}`)
    } catch { /* ignore */ }
  }, [selectedElement, addLog])

  const handleExtractAllTables = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage({ type: 'extract-table', selector: 'table' }, '*')
    addLog('正在提取所有表格数据...')
  }, [addLog])

  const handleScrollTo = useCallback(() => {
    if (!selectedElement) return
    try {
      const info = JSON.parse(selectedElement)
      if (!info.selector) return
      iframeRef.current?.contentWindow?.postMessage({ type: 'scroll-to', selector: info.selector }, '*')
      addLog(`已滚动到元素: ${info.selector}`)
    } catch { /* ignore */ }
  }, [selectedElement, addLog])

  // ─── Common actions ───

  const handleExportCSV = useCallback(() => {
    if (results.length === 0) {
      addLog('没有数据可导出')
      return
    }

    let csv = '选择器, 序号, 数据\n'
    results.forEach(r => {
      r.data.forEach((item, i) => {
        const escaped = `"${item.replace(/"/g, '""')}"`
        csv += `"${r.selector}",${i + 1},${escaped}\n`
      })
    })

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `crawl-data-${Date.now()}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    addLog(`已导出 CSV 文件: ${link.download}`)
  }, [results, addLog])

  const handleClear = useCallback(() => {
    setRawHtml(null)
    setBrowseHtml(null)
    setResults([])
    setLogs([])
    setError(null)
    setSelectedElement(null)
    setPickerMode(false)
    addLog('已清空所有数据')
  }, [addLog])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: 12 }}>
      {/* Mode Tabs */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)', flexShrink: 0,
      }}>
        <button
          onClick={() => setMode('fetch')}
          style={{
            flex: 1, padding: '6px 0', border: 'none', background: 'transparent',
            color: mode === 'fetch' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            fontSize: 11, fontWeight: mode === 'fetch' ? 600 : 400, cursor: 'pointer',
            borderBottom: mode === 'fetch' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            transition: 'all 0.12s',
          }}
        >
          <span style={{ marginRight: 4 }}>📡</span> 抓取模式
        </button>
        <button
          onClick={() => setMode('browse')}
          style={{
            flex: 1, padding: '6px 0', border: 'none', background: 'transparent',
            color: mode === 'browse' ? 'var(--accent-blue)' : 'var(--text-secondary)',
            fontSize: 11, fontWeight: mode === 'browse' ? 600 : 400, cursor: 'pointer',
            borderBottom: mode === 'browse' ? '2px solid var(--accent-blue)' : '2px solid transparent',
            transition: 'all 0.12s',
          }}
        >
          <span style={{ marginRight: 4 }}>🌐</span> 浏览模式
        </button>
      </div>

      {/* Toolbar */}
      <div style={{
        padding: '6px 10px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        flexShrink: 0,
      }}>
        {/* URL input + Fetch button */}
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            value={mode === 'fetch' ? url : browseUrl}
            onChange={e => mode === 'fetch' ? setUrl(e.target.value) : setBrowseUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                mode === 'fetch' ? handleFetch() : handleBrowseLoad()
              }
            }}
            placeholder={mode === 'fetch' ? '输入目标网址抓取数据...' : '输入网址在浏览器中加载...'}
            style={{
              flex: 1,
              padding: '5px 8px',
              borderRadius: 4,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-primary)',
              fontSize: 12,
              outline: 'none',
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={mode === 'fetch' ? handleFetch : handleBrowseLoad}
            disabled={loading || !(mode === 'fetch' ? url.trim() : browseUrl.trim())}
            title={mode === 'fetch' ? '抓取页面数据' : '加载页面到浏览器'}
            style={{
              padding: '5px 12px',
              borderRadius: 4,
              border: 'none',
              background: loading ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
              color: loading ? 'var(--text-secondary)' : 'white',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: 12, height: 12,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                }} />
                {mode === 'fetch' ? '抓取中' : '加载中'}
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                {mode === 'fetch' ? '抓取' : '加载'}
              </>
            )}
          </button>
        </div>

        {/* Proxy config */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={useProxy}
              onChange={e => setUseProxy(e.target.checked)}
              style={{ accentColor: 'var(--accent-blue)' }}
            />
            使用 CORS 代理
          </label>
          {useProxy && (
            <input
              value={proxyUrl}
              onChange={e => setProxyUrl(e.target.value)}
              placeholder="代理地址"
              style={{
                flex: 1,
                padding: '2px 6px',
                borderRadius: 3,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: 11,
                outline: 'none',
                fontFamily: 'monospace',
              }}
            />
          )}
        </div>

        {/* Anti-crawler toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={() => setAntiCrawlerOpen(!antiCrawlerOpen)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', borderRadius: 3,
              border: '1px solid var(--border-color)',
              background: antiCrawlerOpen ? 'rgba(220,220,170,0.1)' : 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 10,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            反爬虫设置
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: antiCrawlerOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.12s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <span style={{ fontSize: 10, color: 'var(--text-secondary)', opacity: 0.5 }}>
            {requestDelay > 0 ? `延迟 ${requestDelay}ms` : '无延迟'}
            {retryCount > 0 ? ` · 重试 ${retryCount} 次` : ''}
            {randomDelay ? ' · 随机延时' : ''}
          </span>
        </div>

        {/* Anti-crawler settings panel */}
        {antiCrawlerOpen && (
          <div style={{
            padding: '8px 10px', borderRadius: 6,
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 2 }}>
              反爬虫规避设置
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 10, color: 'var(--text-secondary)', width: 70, flexShrink: 0 }}>请求延迟 (ms)</label>
              <input
                type="number" min={0} max={10000} step={100}
                value={requestDelay}
                onChange={e => setRequestDelay(Math.max(0, Number(e.target.value)))}
                style={{
                  width: 80, padding: '2px 6px', borderRadius: 3,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  fontSize: 11, outline: 'none',
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: 4 }}>
                <input type="checkbox" checked={randomDelay} onChange={e => setRandomDelay(e.target.checked)} style={{ accentColor: 'var(--accent-blue)' }} />
                随机延时 (0~N)
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 10, color: 'var(--text-secondary)', width: 70, flexShrink: 0 }}>重试次数</label>
              <input
                type="number" min={0} max={10}
                value={retryCount}
                onChange={e => setRetryCount(Math.max(0, Number(e.target.value)))}
                style={{
                  width: 80, padding: '2px 6px', borderRadius: 3,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  fontSize: 11, outline: 'none',
                }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-secondary)', cursor: 'pointer', marginLeft: 4 }}>
                <input type="checkbox" checked={useReferer} onChange={e => setUseReferer(e.target.checked)} style={{ accentColor: 'var(--accent-blue)' }} />
                自动设置 Referer
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: 10, color: 'var(--text-secondary)' }}>自定义请求头 (每行一个: 键: 值)</label>
              <textarea
                value={customHeaders}
                onChange={e => setCustomHeaders(e.target.value)}
                placeholder={'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36\nAccept-Language: zh-CN,zh;q=0.9'}
                rows={2}
                style={{
                  width: '100%', padding: '4px 6px', borderRadius: 3,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                  fontSize: 10, outline: 'none', fontFamily: 'monospace',
                  resize: 'vertical',
                }}
              />
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-secondary)', opacity: 0.6, lineHeight: 1.4 }}>
              提示：适当设置请求延迟和自定义 User-Agent 可有效降低被目标网站反爬虫机制拦截的概率
            </div>
          </div>
        )}

        {/* Fetch mode: CSS Selector + Extract */}
        {mode === 'fetch' && (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              value={selector}
              onChange={e => setSelector(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleExtract() }}
              placeholder="CSS 选择器 (如: .article-title, table tr)"
              disabled={!rawHtml}
              style={{
                flex: 1,
                padding: '5px 8px',
                borderRadius: 4,
                border: '1px solid var(--border-color)',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                fontSize: 12,
                outline: 'none',
                opacity: rawHtml ? 1 : 0.5,
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={handleExtract}
              disabled={!rawHtml || !selector.trim()}
              title="提取数据"
              style={{
                padding: '5px 12px',
                borderRadius: 4,
                border: 'none',
                background: !rawHtml || !selector.trim() ? 'var(--bg-tertiary)' : 'var(--accent-green)',
                color: !rawHtml || !selector.trim() ? 'var(--text-secondary)' : 'white',
                cursor: !rawHtml || !selector.trim() ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              提取
            </button>
          </div>
        )}

        {/* Browse mode: element action buttons */}
        {mode === 'browse' && browseHtml && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button
              onClick={togglePickerMode}
              style={{
                padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-color)',
                background: pickerMode ? 'rgba(78,201,176,0.15)' : 'transparent',
                color: pickerMode ? 'var(--accent-green)' : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 10, whiteSpace: 'nowrap',
              }}
            >
              {pickerMode ? '🟢 选取中...' : '🎯 选取元素'}
            </button>
            <button
              onClick={handleClickElement}
              disabled={!selectedElement}
              style={{
                padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-color)',
                background: 'transparent',
                color: selectedElement ? 'var(--text-secondary)' : 'var(--border-color)',
                cursor: selectedElement ? 'pointer' : 'not-allowed', fontSize: 10, whiteSpace: 'nowrap',
              }}
            >
              👆 点击
            </button>
            <button
              onClick={handleFormFill}
              disabled={!selectedElement}
              style={{
                padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-color)',
                background: 'transparent',
                color: selectedElement ? 'var(--text-secondary)' : 'var(--border-color)',
                cursor: selectedElement ? 'pointer' : 'not-allowed', fontSize: 10, whiteSpace: 'nowrap',
              }}
            >
              ✏️ 填写
            </button>
            <button
              onClick={handleExtractFromIframe}
              disabled={!selectedElement}
              style={{
                padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-color)',
                background: 'transparent',
                color: selectedElement ? 'var(--text-secondary)' : 'var(--border-color)',
                cursor: selectedElement ? 'pointer' : 'not-allowed', fontSize: 10, whiteSpace: 'nowrap',
              }}
            >
              📊 提取
            </button>
            <button
              onClick={handleExtractAllTables}
              style={{
                padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-color)',
                background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 10, whiteSpace: 'nowrap',
              }}
            >
              📋 提取表格
            </button>
            <button
              onClick={handleScrollTo}
              disabled={!selectedElement}
              style={{
                padding: '3px 8px', borderRadius: 3, border: '1px solid var(--border-color)',
                background: 'transparent',
                color: selectedElement ? 'var(--text-secondary)' : 'var(--border-color)',
                cursor: selectedElement ? 'pointer' : 'not-allowed', fontSize: 10, whiteSpace: 'nowrap',
              }}
            >
              🔽 滚动到
            </button>
          </div>
        )}

        {/* Action buttons (export/clear) */}
        {results.length > 0 && (
          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
            <button
              onClick={handleExportCSV}
              style={{
                padding: '3px 10px', borderRadius: 3,
                border: '1px solid var(--border-color)', background: 'transparent',
                color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 11,
              }}
            >
              导出 CSV
            </button>
            <button
              onClick={handleClear}
              style={{
                padding: '3px 10px', borderRadius: 3,
                border: '1px solid var(--accent-red)', background: 'transparent',
                color: 'var(--accent-red)', cursor: 'pointer', fontSize: 11,
              }}
            >
              清空
            </button>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div style={{
          padding: '6px 10px',
          background: 'rgba(244,71,71,0.1)',
          borderBottom: '1px solid rgba(244,71,71,0.3)',
          color: 'var(--accent-red)',
          fontSize: 11,
          flexShrink: 0,
        }}>
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {mode === 'browse' && browseHtml ? (
          <>
            {/* Browser view */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'white' }}>
              <iframe
                ref={iframeRef}
                srcDoc={getIframeSrcdoc()}
                title="爬虫浏览器"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                style={{
                  width: '100%', height: '100%', border: 'none',
                  background: 'white',
                }}
              />
              {loading && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: 'var(--bg-tertiary)', overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', width: '30%',
                    background: 'linear-gradient(90deg, var(--accent-blue), #4ec9b0)',
                    borderRadius: 1, animation: 'browserProgress 1.2s ease-in-out infinite',
                  }} />
                </div>
              )}
            </div>
          </>
        ) : mode === 'fetch' ? (
          /* Results area for fetch mode */
          <div style={{ flex: 1, overflow: 'auto', padding: '8px 10px' }}>
            {results.length === 0 && !rawHtml && (
              <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 11, lineHeight: 2 }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>🕷️</div>
                <div>输入网址并点击"抓取"获取页面数据</div>
                <div style={{ opacity: 0.6 }}>支持 CSS 选择器自定义提取</div>
                <div style={{ opacity: 0.6, marginTop: 8, fontSize: 10 }}>
                  也可切换到「浏览模式」模拟浏览器操作
                </div>
              </div>
            )}

            {results.length === 0 && rawHtml && (
              <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 11 }}>
                页面已加载，请输入 CSS 选择器提取数据
              </div>
            )}

            {results.map((result, i) => (
              <div key={i} style={{
                marginBottom: 10, borderRadius: 6,
                border: '1px solid var(--border-color)', overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 10px', background: 'var(--bg-tertiary)',
                  borderBottom: '1px solid var(--border-color)',
                  fontSize: 11, fontWeight: 500, color: 'var(--text-primary)',
                }}>
                  <span>{result.selector}</span>
                  <span style={{ color: 'var(--accent-blue)', fontSize: 10 }}>
                    {result.count} 条
                  </span>
                </div>
                <div style={{ padding: '6px 10px', maxHeight: 150, overflow: 'auto' }}>
                  {result.data.map((item, j) => (
                    <div key={j} style={{
                      padding: '3px 0', fontSize: 11, color: 'var(--text-secondary)',
                      borderBottom: j < result.data.length - 1 ? '1px solid var(--border-color)' : 'none',
                      lineHeight: 1.5, wordBreak: 'break-all',
                    }}>
                      {item}
                    </div>
                  ))}
                  {result.data.length > 50 && (
                    <div style={{ padding: '4px 0', fontSize: 10, color: 'var(--text-secondary)', opacity: 0.6 }}>
                      仅显示前 50 条，共 {result.data.length} 条
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-secondary)', fontSize: 11, lineHeight: 2 }}>
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>🌐</div>
            <div>输入网址并点击"加载"在浏览器中查看页面</div>
            <div style={{ opacity: 0.6 }}>支持选取元素、点击、填写表单、提取数据</div>
          </div>
        )}
      </div>

      {/* Selected element info */}
      {selectedElement && (
        <div style={{
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
          maxHeight: 80,
          overflow: 'auto',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '2px 10px', borderBottom: '1px solid var(--border-color)',
            fontSize: 10, color: 'var(--text-secondary)',
          }}>
            <span>已选取元素</span>
            <button
              onClick={() => setSelectedElement(null)}
              style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 10, padding: '0 4px',
              }}
            >
              清除
            </button>
          </div>
          <pre style={{ margin: 0, padding: '4px 10px', fontSize: 10, color: 'var(--accent-green)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {selectedElement}
          </pre>
        </div>
      )}

      {/* Log output */}
      {logs.length > 0 && (
        <div style={{
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
          flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '3px 10px', borderBottom: '1px solid var(--border-color)',
            fontSize: 10, color: 'var(--text-secondary)',
          }}>
            <span>运行日志</span>
            <button
              onClick={() => setLogs([])}
              style={{
                background: 'none', border: 'none', color: 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 10, padding: '0 4px',
              }}
            >
              清空
            </button>
          </div>
          <div ref={logRef} style={{
            maxHeight: 80, overflow: 'auto',
            padding: '4px 10px', fontFamily: 'monospace',
            fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.6,
          }}>
            {logs.map((log, i) => (
              <div key={i}>{log}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}