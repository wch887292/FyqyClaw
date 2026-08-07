import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { IdePage } from './pages/IdePage'
import { ConfigPage } from './pages/ConfigPage'
import { LoginPage } from './pages/LoginPage'
import { useAppStore } from './stores/app-store'
import { ErrorBoundary } from './components/ErrorBoundary'

export function App() {
  const theme = useAppStore(s => s.theme)
  return (
    <div data-theme={theme} style={{ height: '100%', width: '100%' }}>
      <ErrorBoundary>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/ide" element={<IdePage />} />
          <Route path="/config" element={<ConfigPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ErrorBoundary>
    </div>
  )
}