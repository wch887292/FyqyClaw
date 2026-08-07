import React, { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] 捕获错误:', error.message, errorInfo.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 40,
            gap: 16,
            background: 'var(--bg-primary)',
            color: 'var(--text-primary)',
          }}
        >
          <div style={{ fontSize: 48, opacity: 0.6 }}>⚠️</div>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-highlight)', margin: 0 }}>
            组件发生错误
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 24px',
              borderRadius: 6,
              border: 'none',
              background: 'var(--accent-blue)',
              color: 'white',
              fontSize: 13,
              cursor: 'pointer',
              transition: 'opacity 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}