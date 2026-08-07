import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { FileNode, EditorTab } from '@shared/types/ide'

interface EditorState {
  openTabs: EditorTab[]
  activeTabId: string | null
  fileTree: FileNode[]
  currentFile: string | null
  /** 最近关闭的标签页（用于撤销关闭） */
  recentlyClosedTab: EditorTab | null
  /** 搜索历史 */
  searchHistory: string[]
  /** 替换历史 */
  replaceHistory: string[]

  openFile: (tab: EditorTab) => void
  closeTab: (tabId: string) => void
  closeOtherTabs: (tabId: string) => void
  closeAllTabs: () => void
  closeTabsToRight: (tabId: string) => void
  reopenClosedTab: () => void
  reorderTab: (fromIndex: number, toIndex: number) => void
  setActiveTab: (tabId: string) => void
  setFileTree: (tree: FileNode[]) => void
  setCurrentFile: (path: string | null) => void
  updateTabContent: (tabId: string, content: string) => void
  markTabDirty: (tabId: string, dirty: boolean) => void
  addSearchHistory: (query: string) => void
  addReplaceHistory: (query: string) => void
}

export const useEditorStore = create<EditorState>()(
  immer((set) => ({
    openTabs: [],
    activeTabId: null,
    fileTree: [],
    currentFile: null,
    recentlyClosedTab: null,
    searchHistory: [],
    replaceHistory: [],

    openFile: (tab) => set((state) => {
      const existing = state.openTabs.find(t => t.id === tab.id)
      if (!existing) {
        state.openTabs.push(tab)
      }
      state.activeTabId = tab.id
    }),

    closeTab: (tabId) => set((state) => {
      const index = state.openTabs.findIndex(t => t.id === tabId)
      if (index === -1) return

      // Save to recently closed for undo
      state.recentlyClosedTab = state.openTabs[index]

      state.openTabs.splice(index, 1)

      if (state.activeTabId === tabId) {
        if (state.openTabs.length > 0) {
          // Select the nearest tab
          state.activeTabId = state.openTabs[Math.min(index, state.openTabs.length - 1)].id
        } else {
          state.activeTabId = null
        }
      }
    }),

    closeOtherTabs: (tabId) => set((state) => {
      const keepTab = state.openTabs.find(t => t.id === tabId)
      if (keepTab) {
        state.openTabs = [keepTab]
        state.activeTabId = tabId
      }
    }),

    closeAllTabs: () => set((state) => {
      state.openTabs = []
      state.activeTabId = null
      state.currentFile = null
    }),

    closeTabsToRight: (tabId) => set((state) => {
      const index = state.openTabs.findIndex(t => t.id === tabId)
      if (index >= 0) {
        state.openTabs = state.openTabs.slice(0, index + 1)
        state.activeTabId = tabId
      }
    }),

    reopenClosedTab: () => set((state) => {
      if (state.recentlyClosedTab) {
        const tab = state.recentlyClosedTab
        const existing = state.openTabs.find(t => t.id === tab.id)
        if (!existing) {
          state.openTabs.push(tab)
        }
        state.activeTabId = tab.id
        state.recentlyClosedTab = null
      }
    }),

    reorderTab: (fromIndex, toIndex) => set((state) => {
      if (fromIndex < 0 || fromIndex >= state.openTabs.length) return
      if (toIndex < 0 || toIndex >= state.openTabs.length) return
      const [moved] = state.openTabs.splice(fromIndex, 1)
      state.openTabs.splice(toIndex, 0, moved)
    }),

    setActiveTab: (tabId) => set((state) => {
      state.activeTabId = tabId
    }),

    setFileTree: (tree) => set((state) => {
      state.fileTree = tree
    }),

    setCurrentFile: (path) => set((state) => {
      state.currentFile = path
    }),

    updateTabContent: (tabId, content) => set((state) => {
      const tab = state.openTabs.find(t => t.id === tabId)
      if (tab) {
        tab.content = content
        tab.isDirty = true
      }
    }),

    markTabDirty: (tabId, dirty) => set((state) => {
      const tab = state.openTabs.find(t => t.id === tabId)
      if (tab) {
        tab.isDirty = dirty
      }
    }),

    addSearchHistory: (query) => set((state) => {
      if (!state.searchHistory.includes(query)) {
        state.searchHistory.unshift(query)
        if (state.searchHistory.length > 20) {
          state.searchHistory.pop()
        }
      }
    }),

    addReplaceHistory: (query) => set((state) => {
      if (!state.replaceHistory.includes(query)) {
        state.replaceHistory.unshift(query)
        if (state.replaceHistory.length > 10) {
          state.replaceHistory.pop()
        }
      }
    }),
  }))
)