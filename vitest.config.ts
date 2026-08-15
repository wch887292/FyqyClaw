import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@ide': path.resolve(__dirname, 'src/ide'),
      '@orchestrator': path.resolve(__dirname, 'src/orchestrator'),
      '@model-adapter': path.resolve(__dirname, 'src/model-adapter'),
      '@sandbox': path.resolve(__dirname, 'src/sandbox'),
      '@cue': path.resolve(__dirname, 'src/cue-engine'),
      '@api': path.resolve(__dirname, 'src/api'),
      '@plugin': path.resolve(__dirname, 'src/plugin-system'),
      '@mcp': path.resolve(__dirname, 'src/mcp'),
      '@skills': path.resolve(__dirname, 'src/skills'),
    },
  },
})
