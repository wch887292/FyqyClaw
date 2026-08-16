import { describe, it, expect } from 'vitest'
import { PluginManager } from '@plugin-system/manager'
import type { PluginManifest } from '@plugin-system/types'

describe('PluginManager 真实注册', () => {
  const manifest: PluginManifest = {
    name: 'demo',
    version: '1.0.0',
    description: 'demo',
    author: 'test',
    main: 'index.js',
  }

  it('registerCommand/executeCommand 真正生效', async () => {
    const mgr = new PluginManager()
    let called: unknown[] = []
    await mgr.loadPlugin(manifest, () => ({
      manifest,
      activate: async (api) => {
        api.registerCommand('hello', (...args) => {
          called = args
          return 'hi'
        })
      },
    }))
    expect(mgr.getCommands()).toContain('hello')
    const r = mgr.executeCommand('hello', 1, 2)
    expect(r).toBe('hi')
    expect(called).toEqual([1, 2])
  })

  it('registerView 真正存入并可取回', async () => {
    const mgr = new PluginManager()
    const comp = { type: 'sidebar' }
    await mgr.loadPlugin(manifest, () => ({
      manifest,
      activate: async (api) => {
        api.registerView('my-view', comp)
      },
    }))
    expect(mgr.getView('my-view')).toBe(comp)
  })

  it('getWorkspacePath 支持注入解析器', async () => {
    const mgr = new PluginManager()
    mgr.setWorkspaceResolver(() => '/proj')
    let got = ''
    await mgr.loadPlugin(manifest, () => ({
      manifest,
      activate: async (api) => {
        got = api.getWorkspacePath() ?? ''
      },
    }))
    expect(got).toBe('/proj')
  })

  it('unloadPlugin 移除其注册的命令', async () => {
    const mgr = new PluginManager()
    await mgr.loadPlugin(manifest, () => ({
      manifest,
      activate: async (api) => {
        api.registerCommand('temp', () => 1)
      },
    }))
    expect(mgr.getCommands()).toContain('temp')
    await mgr.unloadPlugin('demo')
    expect(mgr.getCommands()).not.toContain('temp')
  })
})
