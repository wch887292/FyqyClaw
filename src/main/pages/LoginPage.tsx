import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

export function LoginPage() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [logging, setLogging] = useState(false)

  const validatePhone = (v: string) => /^1[3-9]\d{9}$/.test(v)

  const handleLogin = useCallback(async () => {
    if (!validatePhone(phone)) return
    setLogging(true)
    // Simulate login
    await new Promise(r => setTimeout(r, 800))
    setLogging(false)
    navigate('/ide')
  }, [phone, navigate])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 400,
          padding: '40px 36px',
          borderRadius: 12,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      >
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, var(--accent-blue), #4ec9b0)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 800,
              color: 'white',
              margin: '0 auto 16px',
            }}
          >
            FC
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-highlight)', margin: 0 }}>
            登录 FyqyClaw
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}>
            输入手机号即可快速开始开发
          </p>
        </div>

        {/* Phone Input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, marginBottom: 6, display: 'block' }}>
            手机号码
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: 13,
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <span>+86</span>
            </div>
            <input
              value={phone}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                setPhone(v)
              }}
              onKeyDown={handleKeyDown}
              placeholder="请输入手机号"
              maxLength={11}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 8,
                background: 'var(--bg-tertiary)',
                border: `1px solid ${phone && !validatePhone(phone) ? 'var(--accent-red)' : 'var(--border-color)'}`,
                color: 'var(--text-primary)',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.12s',
              }}
            />
          </div>
          {phone && !validatePhone(phone) && (
            <div style={{ fontSize: 11, color: 'var(--accent-red)', marginTop: 4 }}>
              请输入有效的手机号码
            </div>
          )}
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={!validatePhone(phone) || logging}
          style={{
            width: '100%',
            padding: '12px 0',
            borderRadius: 8,
            border: 'none',
            background: !validatePhone(phone) ? 'var(--bg-tertiary)' : 'linear-gradient(135deg, var(--accent-blue), #4ec9b0)',
            color: !validatePhone(phone) ? 'var(--text-secondary)' : 'white',
            cursor: !validatePhone(phone) ? 'not-allowed' : 'pointer',
            fontSize: 15,
            fontWeight: 600,
            transition: 'opacity 0.12s',
            opacity: logging ? 0.7 : 1,
          }}
          onMouseEnter={e => {
            if (validatePhone(phone)) {
              e.currentTarget.style.opacity = '0.85'
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '1'
          }}
        >
          {logging ? '登录中...' : '登录'}
        </button>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          登录即表示同意
          <span style={{ color: 'var(--accent-blue)', cursor: 'pointer' }}> 服务条款 </span>
          和
          <span style={{ color: 'var(--accent-blue)', cursor: 'pointer' }}> 隐私政策</span>
        </div>
      </div>
    </div>
  )
}