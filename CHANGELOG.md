# Changelog

本文件记录 FyqyClaw（飞扬企源AI）所有值得注意的变更，格式参考 [Keep a Changelog](https://keepachangelog.com/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [1.1.0] - 2026-08-16

「可信化落地」版本 —— 把 1.0.0 已承诺但为桩/假数据的功能真正跑通，让「正式版」名副其实。

### 修复（P0·安全与正确性）
- **沙箱策略真正生效**：抽出 `src/sandbox/policy/evaluate.ts`，主进程 `sandbox:execute` 在 spawn **前**强制调用 `SecurityPolicy`（allowCommand / allowPath / allowNetwork），拦截高危命令与系统敏感路径，返回 `wasBlocked: true`，不再只是装饰。
- **API Key 加密修复**：`crypto.ts` 改用 UTF-8（`TextEncoder/TextDecoder`），解决中文/非 ASCII 密钥往返损坏；设备指纹真正混入密钥派生（三重加密名副其实）。
- **Anthropic(Claude) 真适配**：新增 `AnthropicAdapter`，按 Messages API（`/v1/messages` + `x-api-key` 头）真实调用，修正此前被误路由到 `/v1/chat/completions` 必然失败的问题。
- **SOLO Agent 真实写盘**：`engine.applyCodeBlocks` 从「只存内存」改为经注入的落盘器（`electron-bridge.writeFile` → 主进程 `fs:write-file` IPC）真实写入工作区；主进程 `fs:write-file` 增加递归建父目录；变更汇总改为基于真实文件重算，去除 `file-N` 占位与硬编码行数；修复 planner action 与已注册能力名错配导致 create 任务不写盘的连带 bug。

### 改进（P1·让功能变真）
- **配置页接入真实管理器并持久化**：技能/模型/MCP 三个配置页的编辑、安装、注册真正落到 `SkillsManager` / `ModelAdapterManager` / `MCPServerManager`，模型配置持久化到 localStorage；MCP 注册表单字段真正绑定 state。
- **MCP 工具真实调用**：`MCPServerManager.executeToolCall` 走 http/stdio JSON-RPC 真实调用，失败明确回退为「模拟」（`success:false` 且标注），不再伪装成功。
- **插件系统落地**：`PluginManager.registerCommand/registerView` 真正注册到命令表/视图表，`executeCommand` 可调用，`getWorkspacePath` 支持注入解析器，`unloadPlugin` 清理其注册的命令与视图；移除 `getWorkspacePath/getConfig` 的 `undefined` 空桩。
- **上下文管理器真实读盘**：`ContextManager.loadFileContext` 通过可注入读取器真实读取磁盘内容，不可读时回退占位且标记 `readable:false`，不再返回「`// 文件内容: path`」假字符串。
- **代码审查审真实代码**：SOLO Phase 3 审查基于**真实落盘/生成的代码**（而非任务描述），杜绝「审的是描述」的假审查。

### 文档与构建（P2）
- **macOS 文档降级**：README/FAQ 将 macOS 由「完全支持」改为「仅本地未签名构建可用，CI 官方签名包待配置 Apple 开发者证书」，与 CI 实际跳过 macOS 一致。
- **REST API 死代码标注**：`src/api/server.ts` 注明当前未对外暴露/无 `listen()`，避免误导。
- **清理未用依赖**：移除 `xterm` / `xterm-addon-fit` / `xterm-addon-web-links` / `lucide-react` / `clsx`（全仓零引用），README 终端技术栈改为「内置终端面板（自定义实现，非 Xterm.js）」。
- **测试补齐**：新增沙箱策略、加密、上下文、代码审查、插件系统、MCP、Anthropic 适配器、Agent 写盘等单测；`vitest` 别名补齐 `@plugin-system`。

### 已知遗留
- macOS 安装包仍需 Apple 开发者证书/密钥（CSC 相关 Secrets）后由 CI 正式产出。
- 分支保护（`main`/`master`）当前未开启，建议重开严格保护。

## [1.0.0] - 2026-08-15

「宇宙能量级」系统性质量升级与双上线（GitHub Release + npm）就绪版本。

### 新增
- **npm 发布就绪**：补齐 `package.json` 的 `files` 白名单与 `prepublishOnly` 质量门，新增 `.npmignore`，确保 `npm publish` 仅发布干净的源码包（无 `node_modules` / 构建产物 / 密钥 / 日志）。
- **GitHub 可见度体系**：写入仓库描述与 16 个高发现量 Topics（`electron` `react` `typescript` `ai` `ai-agent` `llm` `agent` `ide` `developer-tools` `mcp` `code-generation` `automation` `open-source` `local-first` `vite` `monaco-editor`）。
- **分支保护**：`main`（默认分支）与 `master` 双分支开启严格保护（禁 force push、禁删除、对管理员强制、合并需 PR 且至少 1 人审批）。
- **GEO / 品牌优化**：修复 README 徽章与链接中的错误仓库名（`fyqy/FyqyClaw` → `wch887292/FyqyClaw`），新增品牌官网章节，logo 改为仓库内自托管 `docs/logo.svg`。
- **贡献规范**：`CONTRIBUTING.md` 明确分支保护规则与 PR 流程。

### 修复
- **Windows 黑屏**：主进程关闭硬件加速并回退 SwiftShader（`app.disableHardwareAcceleration()` + `enable-unsafe-swiftshader`），解决部分显卡 / 远程桌面 / 虚拟机下网页内容区纯黑的问题；渲染进程新增全局错误兜底面板，杜绝「静默黑屏」无法排查。
- **文档死链**：修正 README / FAQ / CONTRIBUTING / DEPLOYMENT 中 19 处指向 404 的错误仓库链接。
- **LICENSE 识别**：修正 LICENSE 中不规范的连字符，便于 GitHub 正确识别 Apache-2.0。

### 变更
- **开源协议**：由 MIT 变更为 **Apache License 2.0**（版权方：晋江市飞虹智科技企业管理有限公司），同步 LICENSE、README、FAQ、DISCLAIMER、DEPLOYMENT、应用内 LicenseSection 组件。
- **依赖**：`electron` 升级至 `^43.4.0`（补丁级安全 / 稳定性修复）。其余主版本（React 18、Vite 5、electron-builder 24、react-router 6、TypeScript 5.9 等）保持不变，跨主版本破坏性升级列为后续技术债，不在本版本范围。
- **版本号**：`0.1.6` → `1.0.0`。

## [0.1.6] - 2026-08-07

### 修复
- 修复 Windows 安装后主窗口内容区黑屏（GPU 合成失败 + 渲染进程静默崩溃）。
- 清理配置并加固加密（稳定 salt、移除动态 import、补充 typecheck）。

## [0.1.5] - 2026-07

### 修复
- Linux `.deb` 补充维护者 email 以满足打包要求。
- CI 移除 `cache: npm`（无 lockfile），修复跨平台 rollup 原生依赖解析。

## [0.1.1] - 2026-07

### 变更
- 重新纳入 `package-lock.json`，版本号对齐至 0.1.1，补充 author 字段。

## [0.1.0] - 2026-06

### 新增
- 首个开源版本，初始发布 FyqyClaw（飞扬企源AI）——全流程 AI 开发工具。
- GitHub Actions 标签自动构建 Windows 安装包的 Release 工作流。

---

[1.0.0]: https://github.com/wch887292/FyqyClaw/releases/tag/v1.0.0
[0.1.6]: https://github.com/wch887292/FyqyClaw/releases/tag/v0.1.6
[0.1.5]: https://github.com/wch887292/FyqyClaw/releases/tag/v0.1.5
[0.1.1]: https://github.com/wch887292/FyqyClaw/releases/tag/v0.1.1
[0.1.0]: https://github.com/wch887292/FyqyClaw/releases/tag/v0.1.0
