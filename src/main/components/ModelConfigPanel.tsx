import React, { useState, useMemo } from 'react'
import { useAppStore, type ActiveModel } from '../stores/app-store'
import { MODEL_PRESETS, createCustomPreset, type ModelPreset } from '../../model-adapter/presets'
import { encryptApiKey, obfuscateApiKey } from '../../main/utils/crypto'

type Tab = 'select' | 'custom' | 'manage'

export function ModelConfigPanel() {
  const open = useAppStore(s => s.modelConfigOpen)
  const setOpen = useAppStore(s => s.setModelConfigOpen)
  const activeModel = useAppStore(s => s.activeModel)
  const setActiveModel = useAppStore(s => s.setActiveModel)
  const customPresets = useAppStore(s => s.customPresets)
  const addCustomPreset = useAppStore(s => s.addCustomPreset)
  const removeCustomPreset = useAppStore(s => s.removeCustomPreset)

  const [tab, setTab] = useState<Tab>('select')
  const [selectedPreset, setSelectedPreset] = useState<string>(activeModel?.presetId || 'openai')
  const [selectedModel, setSelectedModel] = useState<string>(activeModel?.modelId || 'gpt-4o')
  // 不初始化密文，用户需重新输入密钥；使用 hasExistingKey 标记已有密钥
  const [apiKey, setApiKey] = useState('')
  const [hasExistingKey] = useState(!!activeModel?.apiKey)
  const [temperature, setTemperature] = useState(activeModel?.temperature ?? 0.7)
  const [showApiKey, setShowApiKey] = useState(false)

  // Custom form state
  const [customName, setCustomName] = useState('')
  const [customEndpoint, setCustomEndpoint] = useState('')
  const [customModelId, setCustomModelId] = useState('')
  const [customApiKey, setCustomApiKey] = useState('')

  // Test connection state
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

  const allPresets = useMemo(() => [...MODEL_PRESETS, ...customPresets], [customPresets])

  const currentPreset = useMemo(() => allPresets.find(p => p.id === selectedPreset), [allPresets, selectedPreset])

  const handleSave = () => {
    if (!currentPreset) return
    const model = currentPreset.models.find(m => m.id === selectedModel)
    if (!model) return

    // 加密 API Key 后存储，禁止明文写入配置
    const encryptedKey = apiKey ? encryptApiKey(apiKey) : (hasExistingKey ? activeModel?.apiKey || '' : '')

    const config: ActiveModel = {
      presetId: currentPreset.id,
      modelId: model.id,
      presetName: currentPreset.name,
      modelName: model.name,
      provider: currentPreset.provider,
      endpoint: currentPreset.endpoint,
      apiKey: encryptedKey,
      temperature,
      maxTokens: model.maxTokens,
    }
    setActiveModel(config)
    setOpen(false)
  }

  const handleTestConnection = async () => {
    if (!currentPreset) return
    setTesting(true)
    setTestResult(null)

    try {
      const response = await fetch(`${currentPreset.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(10000),
      })

      if (response.ok) {
        setTestResult({ ok: true, message: '连接成功！API 响应正常。' })
      } else {
        const errorText = await response.text().catch(() => '未知错误')
        setTestResult({ ok: false, message: `连接失败 (${response.status}): ${errorText.slice(0, 100)}` })
      }
    } catch (err: any) {
      setTestResult({ ok: false, message: `连接失败: ${err?.message || '网络错误'}` })
    } finally {
      setTesting(false)
    }
  }

  const handleAddCustom = () => {
    if (!customName.trim() || !customEndpoint.trim() || !customModelId.trim()) return
    const preset = createCustomPreset(customName.trim(), customEndpoint.trim(), customApiKey.trim(), customModelId.trim())
    addCustomPreset(preset)
    setSelectedPreset(preset.id)
    setSelectedModel(customModelId.trim())
    setApiKey(customApiKey.trim())
    setTab('select')
    // Reset form
    setCustomName('')
    setCustomEndpoint('')
    setCustomModelId('')
    setCustomApiKey('')
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        background: 'rgba(0,0,0,0.5)',
        animation: 'fadeIn 0.1s ease-out',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div style={{
        width: 600, maxHeight: '80vh',
        background: 'var(--bg-secondary)',
        borderRadius: 8,
        border: '1px solid var(--border-color)',
        boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'slideDown 0.12s ease-out',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border-color)',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-highlight)', margin: 0 }}>
            ⚙ 模型配置
          </h2>
          <button onClick={() => setOpen(false)} style={{
            background: 'none', border: 'none', color: 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 18, padding: '0 4px',
          }}>×</button>
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)' }}>
          {[
            { id: 'select' as Tab, label: '选择模型' },
            { id: 'custom' as Tab, label: '自定义模型' },
            { id: 'manage' as Tab, label: '管理预设' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, padding: '8px 0',
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 500,
                color: tab === t.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                borderBottom: tab === t.id ? '2px solid var(--accent-blue)' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
          {/* Tab: Select Model */}
          {tab === 'select' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Preset Selector */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  模型提供商
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {allPresets.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedPreset(preset.id)
                        setSelectedModel(preset.models[0]?.id || '')
                        setTestResult(null)
                      }}
                      style={{
                        padding: '6px 12px',
                        border: `1px solid ${selectedPreset === preset.id ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                        borderRadius: 6,
                        background: selectedPreset === preset.id ? 'rgba(0,120,212,0.15)' : 'var(--bg-tertiary)',
                        color: selectedPreset === preset.id ? 'var(--accent-blue)' : 'var(--text-primary)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 500,
                        transition: 'all 0.12s',
                      }}
                    >
                      {preset.isCustom && <span style={{ marginRight: 4, opacity: 0.6 }}>★</span>}
                      {preset.name}
                      {preset.isCustom && <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.5 }}>自定义</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model Selector */}
              {currentPreset && (
                <div>
                  <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                    模型选择 — {currentPreset.name}
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {currentPreset.models.map(model => (
                      <label
                        key={model.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '8px 12px', borderRadius: 6,
                          background: selectedModel === model.id ? 'rgba(0,120,212,0.1)' : 'transparent',
                          border: `1px solid ${selectedModel === model.id ? 'var(--accent-blue)' : 'transparent'}`,
                          cursor: 'pointer', transition: 'all 0.12s',
                        }}
                        onMouseEnter={e => { if (selectedModel !== model.id) e.currentTarget.style.background = 'var(--bg-hover)' }}
                        onMouseLeave={e => { if (selectedModel !== model.id) e.currentTarget.style.background = 'transparent' }}
                      >
                        <input
                          type="radio"
                          name="model"
                          checked={selectedModel === model.id}
                          onChange={() => { setSelectedModel(model.id); setTestResult(null) }}
                          style={{ accentColor: 'var(--accent-blue)' }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                            {model.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                            {model.description}
                          </div>
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <div>{model.maxTokens.toLocaleString()} tokens</div>
                          {model.supportsVision && <div style={{ opacity: 0.6 }}>多模态</div>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* API Key */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  API Key
                </label>
                {hasExistingKey && !apiKey && (
                  <div style={{
                    fontSize: 12, color: 'var(--accent-green)', marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    <span>●</span>
                    <span>密钥已设置（重新输入将覆盖旧密钥）</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={hasExistingKey ? '输入新密钥覆盖旧密钥' : 'sk-...'}
                    style={{
                      flex: 1, padding: '8px 10px', borderRadius: 6,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                      fontFamily: 'monospace',
                    }}
                  />
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    style={{
                      padding: '8px 12px', borderRadius: 6,
                      background: 'var(--bg-tertiary)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    {showApiKey ? '隐藏' : '显示'}
                  </button>
                </div>
              </div>

              {/* Temperature */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  Temperature: {temperature.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={e => setTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-blue)' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                  <span>精确 (0)</span>
                  <span>平衡 (1)</span>
                  <span>创意 (2)</span>
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <div style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: testResult.ok ? 'rgba(78,201,176,0.1)' : 'rgba(244,71,71,0.1)',
                  border: `1px solid ${testResult.ok ? 'var(--accent-green)' : 'var(--accent-red)'}`,
                  fontSize: 12, color: testResult.ok ? 'var(--accent-green)' : 'var(--accent-red)',
                }}>
                  {testResult.message}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={handleTestConnection}
                  disabled={testing || (!apiKey && !hasExistingKey)}
                  style={{
                    padding: '8px 16px', borderRadius: 6,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', cursor: testing || (!apiKey && !hasExistingKey) ? 'not-allowed' : 'pointer',
                    fontSize: 12, opacity: testing || (!apiKey && !hasExistingKey) ? 0.5 : 1,
                  }}
                >
                  {testing ? '测试中...' : '测试连接'}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    padding: '8px 16px', borderRadius: 6,
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  disabled={(!apiKey && !hasExistingKey) || !currentPreset}
                  style={{
                    padding: '8px 16px', borderRadius: 6,
                    background: (!apiKey && !hasExistingKey) ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                    border: 'none',
                    color: (!apiKey && !hasExistingKey) ? 'var(--text-secondary)' : 'white',
                    cursor: (!apiKey && !hasExistingKey) ? 'not-allowed' : 'pointer', fontSize: 12, fontWeight: 500,
                  }}
                >
                  保存配置
                </button>
              </div>
            </div>
          )}

          {/* Tab: Custom Model */}
          {tab === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  提供商名称
                </label>
                <input
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="例如：本地 Ollama、自定义代理"
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  API 端点 (需兼容 OpenAI 格式)
                </label>
                <input
                  value={customEndpoint}
                  onChange={e => setCustomEndpoint(e.target.value)}
                  placeholder="https://localhost:11434/v1"
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  模型 ID
                </label>
                <input
                  value={customModelId}
                  onChange={e => setCustomModelId(e.target.value)}
                  placeholder="llama3, qwen2.5-coder:7b, deepseek-r1:8b..."
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 6, display: 'block' }}>
                  API Key (可选)
                </label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={e => setCustomApiKey(e.target.value)}
                  placeholder="留空则使用无密钥连接"
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 6,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button
                  onClick={() => setTab('select')}
                  style={{
                    padding: '8px 16px', borderRadius: 6,
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
                  }}
                >
                  返回
                </button>
                <button
                  onClick={handleAddCustom}
                  disabled={!customName.trim() || !customEndpoint.trim() || !customModelId.trim()}
                  style={{
                    padding: '8px 16px', borderRadius: 6,
                    background: (!customName.trim() || !customEndpoint.trim() || !customModelId.trim()) ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
                    border: 'none',
                    color: (!customName.trim() || !customEndpoint.trim() || !customModelId.trim()) ? 'var(--text-secondary)' : 'white',
                    cursor: (!customName.trim() || !customEndpoint.trim() || !customModelId.trim()) ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 500,
                  }}
                >
                  添加自定义模型
                </button>
              </div>
            </div>
          )}

          {/* Tab: Manage Presets */}
          {tab === 'manage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {customPresets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-secondary)', fontSize: 13 }}>
                  暂无自定义模型预设
                  <br />
                  <span style={{ fontSize: 12, opacity: 0.7 }}>在「自定义模型」标签页中添加</span>
                </div>
              ) : (
                customPresets.map(preset => (
                  <div key={preset.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 6,
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                        ★ {preset.name}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, fontFamily: 'monospace' }}>
                        {preset.endpoint}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 1 }}>
                        模型: {preset.models.map(m => m.name).join(', ')}
                      </div>
                    </div>
                    <button
                      onClick={() => removeCustomPreset(preset.id)}
                      style={{
                        padding: '4px 10px', borderRadius: 4,
                        background: 'rgba(244,71,71,0.1)',
                        border: '1px solid rgba(244,71,71,0.3)',
                        color: 'var(--accent-red)', cursor: 'pointer', fontSize: 11,
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {activeModel && (
          <div style={{
            padding: '8px 16px', borderTop: '1px solid var(--border-color)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: 'var(--accent-green)',
          }}>
            <span>●</span>
            <span>当前模型: {activeModel.presetName} / {activeModel.modelName}</span>
          </div>
        )}
      </div>
    </div>
  )
}