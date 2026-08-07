/**
 * 全局 Monaco Editor 实例引用存储
 * 允许 MenuBar 等组件访问当前编辑器实例，执行撤销/重做/查找等操作
 */
import { create } from 'zustand'

interface EditorRefState {
  editor: any | null
  monaco: any | null

  setEditor: (editor: any, monaco: any) => void
  clearEditor: () => void

  undo: () => void
  redo: () => void
  find: () => void
  replace: () => void
  format: () => void
}

export const useEditorRefStore = create<EditorRefState>()((set, get) => ({
  editor: null,
  monaco: null,

  setEditor: (editor, monaco) => set({ editor, monaco }),

  clearEditor: () => set({ editor: null, monaco: null }),

  undo: () => {
    const { editor } = get()
    if (editor) {
      editor.trigger('menu', 'undo')
    }
  },

  redo: () => {
    const { editor } = get()
    if (editor) {
      editor.trigger('menu', 'redo')
    }
  },

  find: () => {
    const { editor } = get()
    if (editor) {
      editor.trigger('menu', 'actions.find')
    }
  },

  replace: () => {
    const { editor } = get()
    if (editor) {
      editor.trigger('menu', 'editor.action.startFindReplaceAction')
    }
  },

  format: () => {
    const { editor } = get()
    if (editor) {
      editor.trigger('menu', 'editor.action.formatDocument')
    }
  },
}))