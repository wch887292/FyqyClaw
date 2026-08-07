import React, { useRef, useCallback, useState, useEffect } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import { useEditorStore } from '../../main/stores/editor-store'
import { useEditorRefStore } from '../../main/stores/editor-ref-store'
import { writeFile } from '../../main/utils/electron-bridge'

interface MonacoEditorProps {
  tabId: string
  language: string
  value: string
  path: string
}

// Language alias mapping
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  mjs: 'javascript',
  cjs: 'javascript',
  mts: 'typescript',
  cts: 'typescript',
  py: 'python',
  pyw: 'python',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  java: 'java',
  kt: 'kotlin',
  kts: 'kotlin',
  swift: 'swift',
  php: 'php',
  cs: 'csharp',
  fs: 'fsharp',
  fsx: 'fsharp',
  vue: 'html',
  svelte: 'html',
  astro: 'html',
  md: 'markdown',
  mdx: 'markdown',
  json: 'json',
  jsonc: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'plaintext',
  xml: 'xml',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  sql: 'sql',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  ps1: 'powershell',
  dockerfile: 'dockerfile',
  graphql: 'graphql',
  gql: 'graphql',
}

// 内置格式化规则（语言 -> 格式化函数）
const BUILTIN_FORMATTERS: Record<string, (code: string) => string> = {
  json: (code) => {
    try { return JSON.stringify(JSON.parse(code), null, 2) } catch { return code }
  },
  html: (code) => code,
  css: (code) => code,
  markdown: (code) => code,
}

export function MonacoEditor({ tabId, language, value, path }: MonacoEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null)
  const monacoRef = useRef<any>(null)
  const updateTabContent = useEditorStore(s => s.updateTabContent)
  const markTabDirty = useEditorStore(s => s.markTabDirty)
  const setEditor = useEditorRefStore(s => s.setEditor)
  const clearEditor = useEditorRefStore(s => s.clearEditor)
  const [isReady, setIsReady] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedContentRef = useRef<string>(value)

  // Resolve language
  const resolvedLanguage = LANGUAGE_ALIASES[language] || language || 'plaintext'

  // 自动保存：保存当前文件内容到磁盘
  const saveFile = useCallback(async (content: string) => {
    if (!path) return
    try {
      await writeFile(path, content)
      lastSavedContentRef.current = content
      markTabDirty(tabId, false)
    } catch (err: any) {
      console.warn(`[MonacoEditor] ⚠️ 自动保存失败: ${path}`, err.message)
    }
  }, [path, tabId, markTabDirty])

  // 格式化代码
  const formatCode = useCallback(() => {
    const editor = editorRef.current
    if (!editor) return
    const model = editor.getModel()
    if (!model) return

    const formatter = BUILTIN_FORMATTERS[resolvedLanguage]
    if (formatter) {
      const fullText = model.getValue()
      const formatted = formatter(fullText)
      if (formatted !== fullText) {
        editor.executeEdits('format', [{
          range: model.getFullModelRange(),
          text: formatted,
          forceMoveMarkers: true,
        }])
        model.pushStackElement()
      }
    } else {
      // 使用 Monaco 内置格式化
      editor.getAction('editor.action.formatDocument')?.run()
    }
  }, [resolvedLanguage])

  const handleEditorDidMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor
    monacoRef.current = monaco
    // 注册到全局编辑器引用存储，供 MenuBar 等组件使用
    setEditor(editor, monaco)
    editor.focus()
    setIsReady(true)

    // 注册快捷键：Ctrl+Shift+F 格式化
    editor.addAction({
      id: 'format-code',
      label: '格式化代码',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF],
      run: () => {
        const action = editor.getAction('editor.action.formatDocument')
        if (action) action.run()
      },
    })

    // 注册快捷键：Ctrl+S 保存
    editor.addAction({
      id: 'save-file',
      label: '保存文件',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        saveFile(editor.getValue())
      },
    })
  }, [resolvedLanguage, setEditor, saveFile])

  const handleChange: OnChange = useCallback((newValue) => {
    if (newValue !== undefined) {
      updateTabContent(tabId, newValue)

      // 标记文件为脏（内容变化）
      if (newValue !== lastSavedContentRef.current) {
        markTabDirty(tabId, true)
      }

      // 自动保存：防抖 3 秒
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      if (path && newValue !== lastSavedContentRef.current) {
        autoSaveTimerRef.current = setTimeout(() => {
          saveFile(newValue)
        }, 3000)
      }
    }
  }, [tabId, path, updateTabContent, markTabDirty, saveFile])

  // 组件卸载时清除编辑器引用和自动保存定时器
  useEffect(() => {
    return () => {
      clearEditor()
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      // 离开时自动保存
      if (path && editorRef.current) {
        const content = editorRef.current.getValue()
        if (content !== lastSavedContentRef.current) {
          saveFile(content)
        }
      }
    }
  }, [clearEditor, path, saveFile])

  return (
    <Editor
      height="100%"
      language={resolvedLanguage}
      value={value}
      path={path}
      onChange={handleChange}
      onMount={handleEditorDidMount}
      theme="vs-dark"
      options={{
        // Typography
        fontSize: 14,
        fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', Consolas, monospace",
        fontLigatures: true,

        // Scroll & Layout
        minimap: { enabled: true, size: 'fit' },
        scrollBeyondLastLine: false,
        scrollbar: {
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
          alwaysConsumeMouseWheel: false,
        },

        // Line numbers
        lineNumbers: 'on',
        lineNumbersMinChars: 3,
        renderLineHighlight: 'all',
        cursorWidth: 2,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        smoothScrolling: true,

        // Indentation
        tabSize: 2,
        insertSpaces: true,
        autoIndent: 'full',
        formatOnPaste: true,
        formatOnType: true,

        // Code editing
        wordWrap: 'off',
        bracketPairColorization: { enabled: true },
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        autoClosingOvertype: 'always',
        autoSurround: 'languageDefined',
        autoClosingDelete: 'auto',

        // Folding
        folding: true,
        foldingStrategy: 'indentation',
        foldingHighlight: true,
        foldingMaximumRegions: 5000,
        unfoldOnClickAfterEndOfLine: true,
        foldingImportsByDefault: true,

        // Selection
        multiCursorModifier: 'alt',
        multiCursorMergeOverlapping: true,
        selectionHighlight: true,
        occurrencesHighlight: 'singleFile',
        matchBrackets: 'always',
        selectionClipboard: true,

        // Minimap decorations
        overviewRulerBorder: false,
        overviewRulerLanes: 3,
        hideCursorInOverviewRuler: true,

        // Code suggestions
        suggest: {
          showMethods: true,
          showFunctions: true,
          showConstructors: true,
          showFields: true,
          showVariables: true,
          showClasses: true,
          showStructs: true,
          showInterfaces: true,
          showModules: true,
          showProperties: true,
          showEvents: true,
          showOperators: true,
          showUnits: true,
          showValues: true,
          showConstants: true,
          showEnums: true,
          showEnumMembers: true,
          showKeywords: true,
          showWords: true,
          showColors: true,
          showFiles: true,
          showReferences: true,
          showSnippets: true,
          showUsers: true,
          showIssues: true,
          snippetsPreventQuickSuggestions: false,
        },
        quickSuggestions: {
          other: true,
          comments: false,
          strings: true,
        },
        quickSuggestionsDelay: 100,
        parameterHints: { enabled: true, cycle: true },

        // Inline suggestions
        inlineSuggest: { enabled: true },

        // Code lens
        codeLens: true,
        codeLensFontSize: 12,

        // Colors & Decorations
        colorDecorators: true,
        colorDecoratorsActivatedOn: 'click',

        // Accessibility
        accessibilitySupport: 'auto',
        ariaLabel: '代码编辑器',

        // Document symbols / breadcrumbs
        // Note: breadcrumbs is not available in IStandaloneEditorConstructionOptions
        // Monaco Editor's built-in breadcrumbs are enabled via the editor's context menu

        // Drop into editor
        dragAndDrop: true,
        emptySelectionClipboard: true,
        copyWithSyntaxHighlighting: true,

        // Miscellaneous
        padding: { top: 8 },
        renderWhitespace: 'selection',
        renderControlCharacters: false,
        roundedSelection: true,
        guides: {
          indentation: true,
          bracketPairs: true,
          highlightActiveIndentation: true,
        },
        stickyScroll: {
          enabled: true,
          maxLineCount: 5,
        },
        // Linked editing (e.g., rename HTML tags)
        linkedEditing: true,
        // Rename suggestions
        renameOnType: true,
        // Code actions
        // Note: codeActionsOnSave is not available in IStandaloneEditorConstructionOptions
        // Inlay hints
        inlayHints: {
          enabled: 'on',
          fontSize: 11,
        },
      }}
    />
  )
}