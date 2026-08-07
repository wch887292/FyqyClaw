export interface ModelPreset {
  id: string
  name: string
  provider: string
  endpoint: string
  apiKey?: string
  models: ModelOption[]
  isCustom?: boolean
}

export interface ModelOption {
  id: string
  name: string
  description: string
  maxTokens: number
  supportsStreaming: boolean
  supportsVision: boolean
}

export const MODEL_PRESETS: ModelPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', description: '最新旗舰模型，支持多模态', maxTokens: 16384, supportsStreaming: true, supportsVision: true },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: '轻量级高性价比模型', maxTokens: 16384, supportsStreaming: true, supportsVision: true },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: '增强版 GPT-4', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '快速经济的对话模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'o1-mini', name: 'O1 Mini', description: 'OpenAI 推理模型轻量版', maxTokens: 65536, supportsStreaming: true, supportsVision: false },
      { id: 'o1-preview', name: 'O1 Preview', description: 'OpenAI 高级推理模型', maxTokens: 65536, supportsStreaming: true, supportsVision: false },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    provider: 'anthropic',
    endpoint: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: '最新平衡型模型，高性价比', maxTokens: 8192, supportsStreaming: true, supportsVision: true },
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: '高性能平衡型模型', maxTokens: 8192, supportsStreaming: true, supportsVision: true },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: '快速轻量级模型', maxTokens: 8192, supportsStreaming: true, supportsVision: true },
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: '最强旗舰模型', maxTokens: 8192, supportsStreaming: true, supportsVision: true },
    ],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'openai-compatible',
    endpoint: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek V3', description: '最新通用对话模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'deepseek-reasoner', name: 'DeepSeek R1', description: '推理增强模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: '代码专用模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
    ],
  },
  {
    id: 'moonshot',
    name: 'Moonshot (月之暗面)',
    provider: 'openai-compatible',
    endpoint: 'https://api.moonshot.cn/v1',
    models: [
      { id: 'moonshot-v1-8k', name: 'Moonshot 8K', description: '标准上下文模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'moonshot-v1-32k', name: 'Moonshot 32K', description: '长上下文模型', maxTokens: 32768, supportsStreaming: true, supportsVision: false },
      { id: 'moonshot-v1-128k', name: 'Moonshot 128K', description: '超长上下文模型', maxTokens: 131072, supportsStreaming: true, supportsVision: false },
    ],
  },
  {
    id: 'zhipu',
    name: '智谱 AI (GLM)',
    provider: 'openai-compatible',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4',
    models: [
      { id: 'glm-4-plus', name: 'GLM-4-Plus', description: '旗舰增强模型', maxTokens: 8192, supportsStreaming: true, supportsVision: true },
      { id: 'glm-4-air', name: 'GLM-4-Air', description: '轻量高性价比模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'glm-4-flash', name: 'GLM-4-Flash', description: '快速响应模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
    ],
  },
  {
    id: 'baidu',
    name: '百度千帆',
    provider: 'openai-compatible',
    endpoint: 'https://qianfan.baidubce.com/v2',
    models: [
      { id: 'ernie-4.0-8k', name: 'ERNIE 4.0', description: '最新旗舰模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'ernie-3.5-8k', name: 'ERNIE 3.5', description: '高性能模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'ernie-speed-8k', name: 'ERNIE Speed', description: '快速响应模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
    ],
  },
  {
    id: 'qwen',
    name: '阿里通义千问',
    provider: 'openai-compatible',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: [
      { id: 'qwen-plus', name: 'Qwen Plus', description: '增强版通义千问', maxTokens: 131072, supportsStreaming: true, supportsVision: true },
      { id: 'qwen-turbo', name: 'Qwen Turbo', description: '快速响应模型', maxTokens: 131072, supportsStreaming: true, supportsVision: false },
      { id: 'qwen-max', name: 'Qwen Max', description: '最强旗舰模型', maxTokens: 32768, supportsStreaming: true, supportsVision: true },
      { id: 'qwen2.5-coder-32b', name: 'Qwen 2.5 Coder', description: '代码专用 32B 模型', maxTokens: 32768, supportsStreaming: true, supportsVision: false },
    ],
  },
  {
    id: 'google',
    name: 'Google (Gemini)',
    provider: 'openai-compatible',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: [
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: '最新旗舰多模态模型', maxTokens: 65536, supportsStreaming: true, supportsVision: true },
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: '快速轻量模型', maxTokens: 65536, supportsStreaming: true, supportsVision: true },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: '稳定版旗舰模型', maxTokens: 65536, supportsStreaming: true, supportsVision: true },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', description: '快速响应模型', maxTokens: 65536, supportsStreaming: true, supportsVision: true },
    ],
  },
  {
    id: 'siliconflow',
    name: '硅基流动 (SiliconFlow)',
    provider: 'openai-compatible',
    endpoint: 'https://api.siliconflow.cn/v1',
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3', description: 'DeepSeek V3 通用对话模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek R1', description: 'DeepSeek R1 推理模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen2.5 72B', description: '通义千问2.5 72B 指令模型', maxTokens: 32768, supportsStreaming: true, supportsVision: false },
      { id: 'Qwen/Qwen2.5-Coder-32B-Instruct', name: 'Qwen2.5 Coder 32B', description: '通义千问代码模型 32B', maxTokens: 32768, supportsStreaming: true, supportsVision: false },
      { id: 'THUDM/glm-4-9b-chat', name: 'GLM-4 9B', description: '智谱GLM-4 9B 对话模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'meta-llama/Meta-Llama-3.1-8B-Instruct', name: 'Llama 3.1 8B', description: 'Meta Llama 3.1 8B 指令模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
      { id: 'Pro/Qwen/Qwen2.5-7B-Instruct', name: 'Qwen2.5 7B (Pro)', description: '通义千问2.5 7B 高速版', maxTokens: 32768, supportsStreaming: true, supportsVision: false },
      { id: 'stabilityai/stable-diffusion-3-5-large', name: 'Stable Diffusion 3.5', description: '文生图模型', maxTokens: 4096, supportsStreaming: false, supportsVision: false },
    ],
  },
]

export function getModelPreset(presetId: string): ModelPreset | undefined {
  return MODEL_PRESETS.find(p => p.id === presetId)
}

export function getModelOption(presetId: string, modelId: string): ModelOption | undefined {
  const preset = getModelPreset(presetId)
  return preset?.models.find(m => m.id === modelId)
}

export function createCustomPreset(name: string, endpoint: string, apiKey: string, modelId: string): ModelPreset {
  return {
    id: `custom-${Date.now()}`,
    name,
    provider: 'openai-compatible',
    endpoint,
    apiKey,
    models: [
      { id: modelId, name: modelId, description: '自定义模型', maxTokens: 8192, supportsStreaming: true, supportsVision: false },
    ],
    isCustom: true,
  }
}