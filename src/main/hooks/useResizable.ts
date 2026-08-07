import { useRef, useState, useCallback, useEffect } from 'react'

interface UseResizableOptions {
  initialSize: number
  minSize?: number
  maxSize?: number
  direction: 'horizontal' | 'vertical'
  invert?: boolean
  onSizeChange?: (size: number) => void
}

interface UseResizableReturn {
  size: number
  setSize: (size: number) => void
  resizerRef: React.RefObject<HTMLDivElement>
  isResizing: boolean
  handleMouseDown: (e: React.MouseEvent) => void
}

/**
 * 可拖拽缩放面板的通用 Hook
 * 提取 Sidebar、RightAIPanel、BottomPanel 三处重复的 resize 逻辑
 *
 * @param options.initialSize - 初始尺寸
 * @param options.minSize - 最小尺寸（默认 150）
 * @param options.maxSize - 最大尺寸（默认 800）
 * @param options.direction - 'horizontal'（水平拖拽）| 'vertical'（垂直拖拽）
 * @param options.invert - 是否反转方向（如右侧面板拖拽左侧时）
 * @param options.onSizeChange - 尺寸变化回调
 */
export function useResizable(options: UseResizableOptions): UseResizableReturn {
  const {
    initialSize,
    minSize = 150,
    maxSize = 800,
    direction,
    invert = false,
    onSizeChange,
  } = options

  const [size, setSizeState] = useState(initialSize)
  const resizerRef = useRef<HTMLDivElement>(null as unknown as HTMLDivElement)
  const [isResizing, setIsResizing] = useState(false)
  const startPos = useRef(0)
  const startSize = useRef(initialSize)

  const setSize = useCallback((newSize: number) => {
    const clamped = Math.max(minSize, Math.min(maxSize, newSize))
    setSizeState(clamped)
    onSizeChange?.(clamped)
  }, [minSize, maxSize, onSizeChange])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY
    startSize.current = size
  }, [direction, size])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY
      const delta = currentPos - startPos.current
      const newSize = invert ? startSize.current - delta : startSize.current + delta
      setSize(newSize)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing, direction, invert, setSize])

  return {
    size,
    setSize,
    resizerRef,
    isResizing,
    handleMouseDown,
  }
}