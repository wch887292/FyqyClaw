import React, { useState, useEffect } from 'react'
import { useAppStore } from '../../stores/app-store'
import { mockModels, type ModelEntry } from '../../mock-data'
import { modelManager } from '../solo-engine'

const LOG_PREFIX = '[Config-Models]'
const MODELS_STORAGE_KEY = 'fyqyclaw.customModels'
const toast = (msg: string) => useAppStore.getState().setToast(msg)

/** 从 localStorage 读取用户自定义模型并重新注册到引擎 */
function loadPersistedModels(): ModelEntry[] {
  try {
    const raw = localStorage.getItem(MODELS_STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as ModelEntry[]
    for (const m of list) {
      modelManager.configureCustomModel({
        provider: m.provider === 'Custom' ? 'custom' : m.provider.toLowerCase(),
        modelName: m.modelId,
        endpoint: m.endpoint,
      })
    }
    return list
  } catch {
    return []
  }
}

function persistModels(list: ModelEntry[]): void {
  try {
    localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(list.filter(m => m.id.startsWith('custom-'))))
  } catch {
    /* 忽略持久化失败 */
  }
}

export function ModelsSection() {
  const [models, setModels] = useState<ModelEntry[]>(() => [...mockModels, ...loadPersistedModels()])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newModel, setNewModel] = useState({
    name: '', provider: 'OpenAI', modelId: '', endpoint: '', apiKey: '',
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editModel, setEditModel] = useState({
    name: '', provider: 'OpenAI', modelId: '', endpoint: '', apiKey: '',
  })
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const activeModel = useAppStore(s => s.activeModel)

  // 组件挂载时打印初始模型列表
  useEffect(() => {
    console.group(`${LOG_PREFIX} 组件挂载`)
    console.log('时间:', new Date().toISOString())
    console.log('预置模型数量:', models.length)
    models.forEach(m => {
      console.log(`  [${m.id}] ${m.name} | 提供商: ${m.provider} | 端点: ${m.endpoint} | 状态: ${m.status} | 启用: ${m.enabled}`)
    })
    console.log('全局活跃模型:', activeModel ? `${activeModel.presetName} / ${activeModel.modelName}` : '无')
    console.groupEnd()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 活跃模型变化时打印
  useEffect(() => {
    if (activeModel) {
      console.log(`${LOG_PREFIX} 活跃模型变更:`, {
        presetId: activeModel.presetId,
        modelId: activeModel.modelId,
        presetName: activeModel.presetName,
        modelName: activeModel.modelName,
        provider: activeModel.provider,
        endpoint: activeModel.endpoint,
        temperature: activeModel.temperature,
        maxTokens: activeModel.maxTokens,
      })
    }
  }, [activeModel])

  // models 状态变化时打印（排除首次挂载）
  const modelsRef = React.useRef(models)
  useEffect(() => {
    if (modelsRef.current !== models) {
      console.log(`${LOG_PREFIX} 模型列表状态变更:`, models.map(m => ({
        id: m.id,
        name: m.name,
        enabled: m.enabled,
        status: m.status,
      })))
      modelsRef.current = models
    }
  }, [models])

  const handleAddModel = () => {
    if (!newModel.name.trim()) {
      toast('请输入模型名称')
      return
    }
    if (!newModel.modelId.trim()) {
      toast('请输入模型 ID')
      return
    }
    if (!newModel.endpoint.trim()) {
      toast('请输入端点地址')
      return
    }
    const id = `custom-${Date.now()}`
    const entry: ModelEntry = {
      id,
      name: newModel.name.trim(),
      modelId: newModel.modelId.trim(),
      provider: newModel.provider,
      endpoint: newModel.endpoint.trim(),
      status: 'online',
      latency: '-',
      enabled: true,
    }
    console.group(`${LOG_PREFIX} handleAddModel`)
    console.log('添加模型:', entry)
    console.log('API Key:', newModel.apiKey ? '已设置 (已隐藏)' : '未设置')
    console.groupEnd()

    // 真正注册到模型适配器管理器，并设为默认模型（引擎/ApiServer 即可用）
    modelManager.configureCustomModel({
      provider: newModel.provider === 'Custom' ? 'custom' : newModel.provider.toLowerCase(),
      modelName: entry.modelId,
      endpoint: entry.endpoint,
      apiKey: newModel.apiKey || undefined,
    })
    modelManager.setDefaultModel(entry.modelId)

    const next = [...models, entry]
    setModels(next)
    persistModels(next)
    setNewModel({ name: '', provider: 'OpenAI', modelId: '', endpoint: '', apiKey: '' })
    setShowAddForm(false)
    toast(`已添加模型: ${entry.name}`)
  }

  const toggleModel = (id: string) => {
    const target = models.find(m => m.id === id)
    const newEnabled = !target?.enabled
    console.group(`${LOG_PREFIX} toggleModel`)
    console.log('操作: 模型启停')
    console.log('模型ID:', id)
    console.log('模型名称:', target?.name)
    console.log('当前状态:', target?.enabled ? '已启用' : '已禁用')
    console.log('目标状态:', newEnabled ? '启用' : '禁用')
    console.log('时间戳:', Date.now())
    console.groupEnd()

    setModels(prev => {
      const next = prev.map(m => (m.id === id ? { ...m, enabled: !m.enabled } : m))
      persistModels(next)
      return next
    })
  }

  const handleEditClick = (model: ModelEntry) => {
    setShowAddForm(false)
    setEditingId(model.id)
    setEditModel({
      name: model.name,
      provider: model.provider,
      modelId: model.modelId,
      endpoint: model.endpoint,
      apiKey: '',
    })
  }

  const handleEditSave = () => {
    if (!editingId) return
    if (!editModel.name.trim()) {
      toast('请输入模型名称')
      return
    }
    if (!editModel.modelId.trim()) {
      toast('请输入模型 ID')
      return
    }
    if (!editModel.endpoint.trim()) {
      toast('请输入端点地址')
      return
    }
    console.group(`${LOG_PREFIX} handleEditSave`)
    console.log('编辑模型 ID:', editingId)
    console.log('编辑后:', editModel)
    console.groupEnd()

    setModels(prev => prev.map(m =>
      m.id === editingId
        ? { ...m, name: editModel.name.trim(), modelId: editModel.modelId.trim(), provider: editModel.provider, endpoint: editModel.endpoint.trim() }
        : m
    ))
    setEditingId(null)
    toast('模型已更新')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id)
  }

  const handleDeleteConfirm = () => {
    if (!deleteConfirmId) return
    const target = models.find(m => m.id === deleteConfirmId)
    console.group(`${LOG_PREFIX} handleDeleteConfirm`)
    console.log('删除模型 ID:', deleteConfirmId)
    console.log('模型名称:', target?.name)
    console.groupEnd()

    const next = models.filter(m => m.id !== deleteConfirmId)
    setModels(next)
    persistModels(next)
    setDeleteConfirmId(null)
    toast(`已删除模型: ${target?.name || '未知'}`)
  }

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 4 }}>
            AI 模型管理
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            管理和配置 AI 模型提供商、端点和参数
          </p>
        </div>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setEditingId(null) }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 6,
            border: '1px solid var(--accent-blue)',
            background: showAddForm ? 'var(--bg-tertiary)' : 'var(--accent-blue)',
            color: showAddForm ? 'var(--text-primary)' : 'white',
            fontSize: 13, fontWeight: 500,
            cursor: 'pointer', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {showAddForm ? (
              <React.Fragment>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </React.Fragment>
            ) : (
              <React.Fragment>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </React.Fragment>
            )}
          </svg>
          {showAddForm ? '取消' : '添加模型'}
        </button>
      </div>

      {/* Add Model Form */}
      {showAddForm && (
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: 10,
          border: '1px solid var(--border-color)',
          padding: 20,
          marginBottom: 16,
        }}>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 16 }}>
            添加新模型
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ width: 80, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>提供商</label>
              <select
                value={newModel.provider}
                onChange={e => setNewModel(p => ({ ...p, provider: e.target.value }))}
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="DeepSeek">DeepSeek</option>
                <option value="硅基流动">硅基流动 (SiliconFlow)</option>
                <option value="Google">Google</option>
                <option value="Moonshot">月之暗面 (Moonshot)</option>
                <option value="Zhipu">智谱 AI</option>
                <option value="Qwen">通义千问</option>
                <option value="Baidu">百度千帆</option>
                <option value="Custom">自定义 (兼容 OpenAI)</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ width: 80, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>模型名称</label>
              <input
                value={newModel.name}
                onChange={e => setNewModel(p => ({ ...p, name: e.target.value }))}
                placeholder="例: DeepSeek V3"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ width: 80, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>模型 ID</label>
              <input
                value={newModel.modelId}
                onChange={e => setNewModel(p => ({ ...p, modelId: e.target.value }))}
                placeholder="API 调用时使用的模型 ID，例如: deepseek-ai/DeepSeek-V3"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ width: 80, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>端点地址</label>
              <input
                value={newModel.endpoint}
                onChange={e => setNewModel(p => ({ ...p, endpoint: e.target.value }))}
                placeholder="例: https://api.siliconflow.cn/v1"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ width: 80, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>API Key</label>
              <input
                type="password"
                value={newModel.apiKey}
                onChange={e => setNewModel(p => ({ ...p, apiKey: e.target.value }))}
                placeholder="输入 API 密钥"
                style={{
                  flex: 1, padding: '6px 10px', borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                  fontSize: 13, outline: 'none',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setShowAddForm(false)}
                style={{
                  padding: '6px 16px', borderRadius: 6,
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                取消
              </button>
              <button
                onClick={handleAddModel}
                style={{
                  padding: '6px 16px', borderRadius: 6,
                  border: '1px solid var(--accent-blue)',
                  background: 'var(--accent-blue)', color: 'white',
                  fontSize: 13, cursor: 'pointer',
                }}
              >
                确认添加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Model Form */}
      {editingId && (() => {
        const model = models.find(m => m.id === editingId)
        if (!model) return null
        return (
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: 10,
            border: '1px solid var(--accent-blue)',
            padding: 20,
            marginBottom: 16,
          }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 16 }}>
              编辑模型: {model.name}
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ width: 80, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>提供商</label>
                <select
                  value={editModel.provider}
                  onChange={e => setEditModel(p => ({ ...p, provider: e.target.value }))}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none', cursor: 'pointer',
                  }}
                >
                  <option value="OpenAI">OpenAI</option>
                  <option value="Anthropic">Anthropic</option>
                  <option value="DeepSeek">DeepSeek</option>
                  <option value="硅基流动">硅基流动 (SiliconFlow)</option>
                  <option value="Google">Google</option>
                  <option value="Moonshot">月之暗面 (Moonshot)</option>
                  <option value="Zhipu">智谱 AI</option>
                  <option value="Qwen">通义千问</option>
                  <option value="Baidu">百度千帆</option>
                  <option value="Custom">自定义 (兼容 OpenAI)</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ width: 80, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>模型名称</label>
                <input
                  value={editModel.name}
                  onChange={e => setEditModel(p => ({ ...p, name: e.target.value }))}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ width: 80, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>模型 ID</label>
                <input
                  value={editModel.modelId}
                  onChange={e => setEditModel(p => ({ ...p, modelId: e.target.value }))}
                  placeholder="API 调用时使用的模型 ID，例如: deepseek-ai/DeepSeek-V3"
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ width: 80, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>端点地址</label>
                <input
                  value={editModel.endpoint}
                  onChange={e => setEditModel(p => ({ ...p, endpoint: e.target.value }))}
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <label style={{ width: 80, fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>API Key</label>
                <input
                  type="password"
                  value={editModel.apiKey}
                  onChange={e => setEditModel(p => ({ ...p, apiKey: e.target.value }))}
                  placeholder="留空则不修改"
                  style={{
                    flex: 1, padding: '6px 10px', borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                    fontSize: 13, outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button
                  onClick={handleCancelEdit}
                  style={{
                    padding: '6px 16px', borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleEditSave}
                  style={{
                    padding: '6px 16px', borderRadius: 6,
                    border: '1px solid var(--accent-blue)',
                    background: 'var(--accent-blue)', color: 'white',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  保存修改
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (() => {
        const target = models.find(m => m.id === deleteConfirmId)
        return (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
          }}
            onClick={handleDeleteCancel}
          >
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: 12,
              border: '1px solid var(--border-color)',
              padding: 24,
              maxWidth: 400,
              width: '90%',
              boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
            }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,77,77,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent-red)',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-highlight)' }}>
                    确认删除
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                    此操作不可撤销
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, margin: '0 0 20px 0' }}>
                确定要删除模型 <strong>"{target?.name}"</strong> 吗？该操作将从配置中永久移除该模型及其相关设置。
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button
                  onClick={handleDeleteCancel}
                  style={{
                    padding: '7px 16px', borderRadius: 6,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-tertiary)', color: 'var(--text-primary)',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  style={{
                    padding: '7px 16px', borderRadius: 6,
                    border: '1px solid var(--accent-red)',
                    background: 'var(--accent-red)', color: 'white',
                    fontSize: 13, cursor: 'pointer',
                  }}
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Model List */}
      <div style={{
        background: 'var(--bg-secondary)',
        borderRadius: 10,
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}>
        {/* Table Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 2fr 100px 80px 80px 100px',
          gap: 12,
          padding: '12px 16px',
          background: 'var(--bg-tertiary)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          <span>模型名称</span>
          <span>提供商</span>
          <span>端点</span>
          <span>状态</span>
          <span>延迟</span>
          <span>启用</span>
          <span style={{ textAlign: 'center' }}>操作</span>
        </div>

        {/* Table Rows */}
        {models.map((model, i) => (
          <div
            key={model.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 2fr 100px 80px 80px 100px',
              gap: 12,
              padding: '12px 16px',
              borderTop: '1px solid var(--border-color)',
              alignItems: 'center',
              fontSize: 13,
              background: activeModel?.presetId === model.id ? 'rgba(78,201,176,0.06)' : 'transparent',
            }}
          >
            <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{model.name}</div>
            <div style={{ color: 'var(--text-secondary)' }}>{model.provider}</div>
            <div style={{
              color: 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {model.endpoint}
            </div>
            <div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 12,
                color: model.status === 'online' ? 'var(--accent-green)'
                  : model.status === 'error' ? 'var(--accent-red)'
                  : 'var(--text-secondary)',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: model.status === 'online' ? 'var(--accent-green)'
                    : model.status === 'error' ? 'var(--accent-red)'
                    : 'var(--text-secondary)',
                }} />
                {model.status === 'online' ? '在线' : model.status === 'error' ? '错误' : '离线'}
              </span>
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{model.latency}</div>
            <div>
              <button
                onClick={() => toggleModel(model.id)}
                style={{
                  width: 36, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: model.enabled ? 'var(--accent-green)' : 'var(--bg-tertiary)',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 14, height: 14, borderRadius: '50%', background: 'white',
                  position: 'absolute', top: 2, transition: 'left 0.2s',
                  left: model.enabled ? 20 : 2, boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
              <button
                onClick={() => handleEditClick(model)}
                title="编辑"
                style={{
                  width: 28, height: 28, borderRadius: 5,
                  border: 'none', background: 'transparent',
                  color: 'var(--accent-blue)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.08s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,120,212,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={() => handleDeleteClick(model.id)}
                title="删除"
                style={{
                  width: 28, height: 28, borderRadius: 5,
                  border: 'none', background: 'transparent',
                  color: 'var(--accent-red)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.08s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,77,77,0.1)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Model Config Help */}
      <div style={{
        marginTop: 24,
        padding: 16,
        background: 'var(--bg-secondary)',
        borderRadius: 10,
        border: '1px solid var(--border-color)',
      }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-highlight)', marginBottom: 8 }}>
          配置说明
        </h4>
        <ul style={{
          fontSize: 12, color: 'var(--text-secondary)',
          lineHeight: 1.8, paddingLeft: 16,
        }}>
          <li>支持的模型提供商：OpenAI、Anthropic、DeepSeek、Google、自定义兼容 OpenAI 接口的端点</li>
          <li>API Key 存储在本地，不会上传到云端</li>
          <li>可配置每个模型的温度、最大 Token 等参数</li>
          <li>自定义模型需兼容 OpenAI Chat Completions 接口格式</li>
        </ul>
      </div>
    </div>
  )
}