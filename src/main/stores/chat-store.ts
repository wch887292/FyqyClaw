import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import type { ChatMessage, AgentTask } from '@shared/types/ai'

interface ChatState {
  messages: ChatMessage[]
  currentTask: AgentTask | null
  isProcessing: boolean
  inputValue: string

  addMessage: (message: ChatMessage) => void
  setMessages: (messages: ChatMessage[]) => void
  setCurrentTask: (task: AgentTask | null) => void
  updateTask: (task: AgentTask) => void
  setProcessing: (processing: boolean) => void
  setInputValue: (value: string) => void
  clearChat: () => void
}

export const useChatStore = create<ChatState>()(
  immer((set) => ({
    messages: [],
    currentTask: null,
    isProcessing: false,
    inputValue: '',

    addMessage: (message) => set((state) => {
      state.messages.push(message)
    }),

    setMessages: (messages) => set((state) => {
      state.messages = messages
    }),

    setCurrentTask: (task) => set((state) => {
      state.currentTask = task
    }),

    updateTask: (task) => set((state) => {
      state.currentTask = task
    }),

    setProcessing: (processing) => set((state) => {
      state.isProcessing = processing
    }),

    setInputValue: (value) => set((state) => {
      state.inputValue = value
    }),

    clearChat: () => set((state) => {
      state.messages = []
      state.currentTask = null
    }),
  }))
)