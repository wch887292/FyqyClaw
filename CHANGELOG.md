# Changelog

本文件记录 FyqyClaw（飞扬企源AI）所有值得注意的变更，格式参考 [Keep a Changelog](https://keepachangelog.com/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

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
