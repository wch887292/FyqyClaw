import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron'
import electronRenderer from 'vite-plugin-electron-renderer'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    electronRenderer(),
  ],
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