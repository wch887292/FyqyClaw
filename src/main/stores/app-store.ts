import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { DevelopmentMode, AppConfig } from '@shared/types/core'
import type { ModelPreset, ModelOption } from '../../model-adapter/presets'
import { MODEL_PRESETS } from '../../model-adapter/presets'

export interface Command {
  id: string
  label: string
  description: string
  category: string
  shortcut?: string
  icon?: string
  action: () => void
}

export interface ActiveModel {
  presetId: string
  modelId: string
  presetName: string
  modelName: string
  provider: string
  endpoint: string
  /** 三重加密后的 API Key（禁止明文存储），使用时通过 decryptApiKey 解密 */
  apiKey: string
  temperature: number
  maxTokens: number
}

export type SidebarView = 'files' | 'search' | 'git' | 'debug' | 'extensions' | 'skills' | 'agents' | 'browser' | 'crawler'
export type BottomTab = 'terminal' | 'debug-console' | 'output' | 'problems' | 'ai-review'

interface AppState {
  mode: DevelopmentMode
  config: AppConfig | null
  isLoading: boolean
  error: string | null
  commandPaletteOpen: boolean
  sidebarVisible: boolean
  activeSidebarView: SidebarView
  sidebarWidth: number
  commands: Command[]
  modelConfigOpen: boolean
  customPresets: ModelPreset[]
  activeModel: ActiveModel | null
  bottomPanelVisible: boolean
  bottomPanelHeight: number
  activeBottomTab: BottomTab
  rightPanelVisible: boolean
  rightPanelWidth: number
  soloFullScreen: boolean
  privacyMode: boolean
  sandboxEnabled: boolean
  settingsOpen: boolean
  theme: 'dark' | 'light'
  toast: { message: string; visible: boolean }
  rootPath: string | undefined

  setMode: (mode: DevelopmentMode) => void
  toggleMode: () => void
  setConfig: (config: AppConfig) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  toggleCommandPalette: () => void
  setCommandPaletteOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarVisible: (visible: boolean) => void
  setActiveSidebarView: (view: SidebarView) => void
  setSidebarWidth: (width: number) => void
  registerCommands: (commands: Command[]) => void
  setModelConfigOpen: (open: boolean) => void
  toggleModelConfig: () => void
  setActiveModel: (model: ActiveModel | null) => void
  addCustomPreset: (preset: ModelPreset) => void
  removeCustomPreset: (presetId: string) => void
  toggleBottomPanel: () => void
  setBottomPanelVisible: (visible: boolean) => void
  setBottomPanelHeight: (height: number) => void
  setActiveBottomTab: (tab: BottomTab) => void
  toggleRightPanel: () => void
  setRightPanelVisible: (visible: boolean) => void
  setRightPanelWidth: (width: number) => void
  setSoloFullScreen: (fullScreen: boolean) => void
  toggleSoloFullScreen: () => void
  togglePrivacyMode: () => void
  toggleSandboxEnabled: () => void
  setSettingsOpen: (open: boolean) => void
  toggleSettings: () => void
  setTheme: (theme: 'dark' | 'light') => void
  setToast: (message: string) => void
  setRootPath: (path: string | undefined) => void
}

export const useAppStore = create<AppState>()(
  immer((set) => ({
    mode: 'ide',
    config: null,
    isLoading: false,
    error: null,
    commandPaletteOpen: false,
    sidebarVisible: true,
    activeSidebarView: 'files',
    sidebarWidth: 260,
    commands: [],
    modelConfigOpen: false,
    customPresets: [],
    activeModel: null,
    bottomPanelVisible: false,
    bottomPanelHeight: 200,
    activeBottomTab: 'terminal',
    rightPanelVisible: false,
    rightPanelWidth: 320,
    soloFullScreen: false,
    privacyMode: true,
    sandboxEnabled: true,
    settingsOpen: false,
    theme: 'dark',
    toast: { message: '', visible: false },
    rootPath: undefined,

    setMode: (mode) => set((state) => {
      state.mode = mode
    }),

    toggleMode: () => set((state) => {
      state.mode = state.mode === 'ide' ? 'solo' : 'ide'
    }),

    setConfig: (config) => set((state) => {
      state.config = config
    }),

    setLoading: (loading) => set((state) => {
      state.isLoading = loading
    }),

    setError: (error) => set((state) => {
      state.error = error
    }),

    toggleCommandPalette: () => set((state) => {
      state.commandPaletteOpen = !state.commandPaletteOpen
    }),

    setCommandPaletteOpen: (open) => set((state) => {
      state.commandPaletteOpen = open
    }),

    toggleSidebar: () => set((state) => {
      state.sidebarVisible = !state.sidebarVisible
    }),

    setSidebarVisible: (visible) => set((state) => {
      state.sidebarVisible = visible
    }),

    setActiveSidebarView: (view) => set((state) => {
      state.activeSidebarView = view
    }),

    setSidebarWidth: (width) => set((state) => {
      state.sidebarWidth = Math.max(180, Math.min(500, width))
    }),

    registerCommands: (commands) => set((state) => {
      state.commands = commands
    }),

    setModelConfigOpen: (open) => set((state) => {
      state.modelConfigOpen = open
    }),

    toggleModelConfig: () => set((state) => {
      state.modelConfigOpen = !state.modelConfigOpen
    }),

    setActiveModel: (model) => set((state) => {
      state.activeModel = model
    }),

    addCustomPreset: (preset) => set((state) => {
      const existing = state.customPresets.findIndex(p => p.id === preset.id)
      if (existing >= 0) {
        state.customPresets[existing] = preset
      } else {
        state.customPresets.push(preset)
      }
    }),

    removeCustomPreset: (presetId) => set((state) => {
      state.customPresets = state.customPresets.filter(p => p.id !== presetId)
      if (state.activeModel?.presetId === presetId) {
        state.activeModel = null
      }
    }),

    toggleBottomPanel: () => set((state) => {
      state.bottomPanelVisible = !state.bottomPanelVisible
    }),

    setBottomPanelVisible: (visible) => set((state) => {
      state.bottomPanelVisible = visible
    }),

    setBottomPanelHeight: (height) => set((state) => {
      state.bottomPanelHeight = Math.max(100, Math.min(500, height))
    }),

    setActiveBottomTab: (tab) => set((state) => {
      state.activeBottomTab = tab
    }),

    toggleRightPanel: () => set((state) => {
      state.rightPanelVisible = !state.rightPanelVisible
    }),

    setRightPanelVisible: (visible) => set((state) => {
      state.rightPanelVisible = visible
    }),

    setRightPanelWidth: (width) => set((state) => {
      state.rightPanelWidth = Math.max(250, Math.min(600, width))
    }),

    setSoloFullScreen: (fullScreen) => set((state) => {
      state.soloFullScreen = fullScreen
    }),

    toggleSoloFullScreen: () => set((state) => {
      state.soloFullScreen = !state.soloFullScreen
    }),

    togglePrivacyMode: () => set((state) => {
      state.privacyMode = !state.privacyMode
    }),

    toggleSandboxEnabled: () => set((state) => {
      state.sandboxEnabled = !state.sandboxEnabled
    }),

    setSettingsOpen: (open) => set((state) => {
      state.settingsOpen = open
    }),

    toggleSettings: () => set((state) => {
      state.settingsOpen = !state.settingsOpen
    }),

    setTheme: (theme) => set((state) => {
      state.theme = theme
    }),

    setToast: (message) => set((state) => {
      state.toast = { message, visible: true }
    }),

    setRootPath: (path) => set((state) => {
      state.rootPath = path
    }),
  }))
)