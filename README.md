<p align="center">
  <img src="https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=Modern%20tech%20logo%20with%20letters%20FC%2C%20digital%20blue%20and%20cyan%20gradient%2C%20hexagonal%20grid%20background%2C%20sleek%20minimalist%20design%2C%20AI%20and%20development%20tool%20vibe%2C%20high%20contrast%20professional%20look&image_size=square_hd" alt="FyqyClaw Logo" width="120" />
</p>

<h1 align="center">FyqyClaw · 飞扬企源 AI</h1>

<p align="center">
  <b>全流程 AI 驱动开发工具 — IDE + AI Agent 双模式，从需求到代码一站式完成</b>
</p>

<p align="center">
  <a href="https://github.com/fyqy/FyqyClaw/stargazers"><img src="https://img.shields.io/github/stars/fyqy/FyqyClaw?style=flat-square&logo=github" alt="Stars" /></a>
  <a href="https://github.com/fyqy/FyqyClaw/releases"><img src="https://img.shields.io/github/v/release/fyqy/FyqyClaw?style=flat-square&logo=github" alt="Release" /></a>
  <a href="https://github.com/fyqy/FyqyClaw/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square" alt="License" /></a>
  <img src="https://img.shields.io/badge/Windows-0078D6?style=flat-square&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/macOS-000000?style=flat-square&logo=apple" alt="macOS" />
  <img src="https://img.shields.io/badge/Linux-FCC624?style=flat-square&logo=linux" alt="Linux" />
  <img src="https://img.shields.io/badge/Electron-43.x-47848F?style=flat-square&logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/React-18.x-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square" alt="PRs Welcome" />
</p>

<p align="center">
  <a href="#-核心特性">核心特性</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-项目架构">项目架构</a> ·
  <a href="#-技术栈">技术栈</a> ·
  <a href="#-常见问题">常见问题</a> ·
  <a href="#-版本规划">版本规划</a> ·
  <a href="#-许可证">许可证</a>
</p>

---

## 📖 项目简介

**FyqyClaw（飞扬企源AI）** 是一款深度融合 AI 大模型能力的全流程开发工具，覆盖需求拆解、代码编写、项目理解、调试运行、代码审查、变更管理完整工程链路。

支持 **传统 IDE 精细操控** 与 **AI 智能体全自动开发** 双模式，适配个人开发与企业级工程迭代场景。

> **项目名称含义**: "Fyqy" 来自"飞扬企源"（Feiyang Qiyuan）的拼音缩写，"Claw" 寓意像爪子一样精准抓取代码、捕获问题。整体寓意是"飞扬企源 AI 开发利器"。

### 与 Cursor / Windsurf / Trae 对比

| 对比项 | FyqyClaw | Cursor / Windsurf / Trae |
|--------|---------|--------------------------|
| **开发模式** | IDE + SOLO 双模式，可随时切换 | 以 AI 辅助为主，无独立 AI Agent 模式 |
| **AI 自主性** | SOLO 模式下 AI 可自主规划、编码、测试、审查 | 需要逐条指令交互 |
| **MCP 协议** | 原生支持，可扩展工具链 | 部分支持或需插件 |
| **安全体系** | 隐私模式 + 沙箱执行 + API Key 三重加密 | 基础加密 |
| **开源** | ✅ MIT 开源 | ❌ 闭源商业产品 |
| **本地部署** | ✅ 完全本地运行 | 部分依赖云端 |
| **费用** | 免费开源（仅需自备 API Key） | 付费订阅 or 有限免费额度 |

---

## ✨ 核心特性

### 🎯 双重开发模式 — 按场景自由选择

| 模式 | 主导方 | 适用场景 | 特点 |
|------|--------|---------|------|
| **🖥️ IDE 模式** | 开发者主导 | 精细编码、调试、小规模修改 | 完整编辑器工具链，CUE 智能编码引擎，Git 管理，逐行控制 |
| **🤖 SOLO 模式** | AI 智能体主导 | 新项目搭建、大规模重构、批量功能 | AI 自主规划执行，自动生成+测试+审查，任务级控制 |

两种模式支持 **随时一键切换**（快捷键 `Ctrl+Shift+M`），互不干扰。

### 🤖 AI 全流程编程

**多模型兼容基座** — 内置 8 大模型提供商，一键切换：

| 提供商 | 支持模型 |
|--------|---------|
| **OpenAI** | GPT-4o、GPT-4o-mini、GPT-4-turbo、O1 系列 |
| **Anthropic** | Claude Sonnet 4、Claude 3.5 Sonnet、Claude Opus 4 |
| **DeepSeek** | DeepSeek V3、DeepSeek R1、DeepSeek Coder |
| **智谱 AI** | GLM-4-Plus、GLM-4-Air、GLM-4-Flash |
| **通义千问** | Qwen Plus、Qwen Turbo、Qwen Max、Qwen 2.5 Coder |
| **Google Gemini** | Gemini 2.5 Pro、Gemini 2.0 Flash |
| **硅基流动** | 多种开源模型托管 |
| **自定义模型** | 兼容 OpenAI 接口的任意模型 |

**CUE 智能编码引擎** — 链式补全、多行修改、依赖自动导入、引用批量重构，支持 Python / TypeScript / Golang 等主流语言。

**AI 智能体全自动开发** — SOLO 模式下 AI 可自主完成：
1. 📋 **需求拆解** — 分析用户需求，拆解为可执行任务列表
2. 🔧 **技术选型** — 根据项目特点推荐技术和框架
3. 📝 **代码生成** — 自动生成完整项目或模块代码
4. ✅ **自动化测试** — 生成并运行测试用例
5. 🔄 **错误修复** — 发现错误后自动尝试修复
6. 👁️ **代码审查** — 对生成的代码进行安全和质量审查
7. 📊 **变更汇总** — 生成变更摘要和 Commit 信息

**全域上下文感知** — 文件、文件夹、Git 仓库、终端日志、业务文档、网页资料均可作为 AI 上下文，让 AI 完全理解项目全貌。

### 🔒 企业级安全体系

| 安全特性 | 说明 |
|---------|------|
| **隐私模式** | 默认开启，所有代码、对话、生成内容不上传训练，全程本地留存 |
| **沙箱执行** | 隔离执行 AI 生成命令，拦截高危操作，限制文件访问权限，异常操作自动终止 |
| **API Key 三重加密** | 浏览器指纹 + 会话盐值 + 时间混淆，禁止明文存储，管理员也无法查看 |
| **日志遮蔽** | 日志输出自动遮蔽 API Key，只显示 `sk-****...****ab12` 格式 |
| **零数据收集** | 开源版不会收集任何用户数据，无需联网注册或登录 |

### 🔌 开放生态扩展

- **MCP 协议支持** — 对接 Git 操作、文件系统、GitHub、数据库等工具服务，AI 可直接调用外部工具
- **技能系统** — 可插拔 AI 辅助技能（代码审查、文档生成、测试生成、Commit 信息生成等）
- **插件系统** — 支持主题、语言包、功能扩展

---

## 🚀 快速开始

### 系统要求

| 平台 | 支持情况 |
|------|---------|
| Windows 10+ | ✅ 完全支持 |
| macOS 12+ | ✅ 完全支持 |
| Linux (Ubuntu 20.04+) | ✅ 完全支持 |
| WSL 2 | ✅ 支持 |

### 安装

#### 方式一：下载安装包

从 [Releases](https://github.com/fyqy/FyqyClaw/releases) 下载对应平台的安装包：

```bash
# Windows
FyqyClaw-Setup-x.x.x.exe

# macOS
FyqyClaw-x.x.x.dmg

# Linux
FyqyClaw-x.x.x.AppImage
```

#### 方式二：从源码构建

```bash
# 克隆仓库
git clone https://github.com/fyqy/FyqyClaw.git
cd FyqyClaw/fyqyclaw-app

# 安装依赖
npm install

# 启动开发服务器（Web 模式）
npm run dev

# 或启动 Electron 桌面应用
npm run electron:dev
```

#### 方式三：从源码构建安装包

```bash
# 构建所有平台（当前平台将生成安装包）
npm run electron:build

# 或指定平台构建
npm run build:win      # Windows NSIS 安装包 (.exe)
npm run build:mac      # macOS DMG + ZIP（需 macOS 环境）
npm run build:linux    # Linux AppImage + deb（需 Linux 环境）
```

构建产物输出到 `release/` 目录：

| 产物 | 平台 | 格式 |
|------|------|------|
| `FyqyClaw-Setup-${version}-win-x64.exe` | Windows | NSIS 安装器 |
| `FyqyClaw-${version}-mac-x64.dmg` | macOS Intel | DMG 磁盘映像 |
| `FyqyClaw-${version}-mac-arm64.dmg` | macOS Apple Silicon | DMG 磁盘映像 |
| `FyqyClaw-${version}-linux-x86_64.AppImage` | Linux | AppImage 便携包 |
| `FyqyClaw-${version}-linux-amd64.deb` | Linux (Debian/Ubuntu) | deb 包 |

### 首次使用

1. 🚀 启动应用，进入 **模型配置** 面板（快捷键 `Ctrl+Alt+M`）
2. 🤖 选择 AI 模型提供商，输入 API Key，点击 **测试连接** 验证
3. 🔄 选择开发模式：**IDE 模式** 或 **SOLO 模式**
4. 📂 创建或导入项目，开始开发！

### 快捷键速查

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+M` | 切换 IDE / SOLO 模式 |
| `Ctrl+Alt+M` | 打开模型配置面板 |
| `Ctrl+Shift+P` | 打开命令面板 |
| `Ctrl+S` | 保存当前文件 |
| `Ctrl+Shift+F` | 格式化代码 |
| `Ctrl+Shift+E` | 切换侧边栏显示 |
| `Ctrl+`` ` | 切换终端面板 |
| `Ctrl+Shift+X` | 打开扩展面板 |

---

## 🏗️ 项目架构

```
FyqyClaw/
├── electron/                 # Electron 主进程
│   ├── main.ts              # 主进程入口
│   └── preload.ts           # 预加载脚本
├── src/
│   ├── main/                # 前端应用主代码
│   │   ├── components/      # UI 组件
│   │   │   ├── config/      # 配置面板（模型/MCP/技能/设置）
│   │   │   ├── AppLayout.tsx
│   │   │   ├── EditorArea.tsx
│   │   │   ├── RightAIPanel.tsx
│   │   │   ├── SoloPanel.tsx
│   │   │   └── ...
│   │   ├── stores/          # 状态管理 (Zustand + Immer)
│   │   ├── pages/           # 页面（IDE / SOLO / 配置 / 登录）
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── utils/           # 工具函数（加密、Electron 桥接）
│   │   └── styles/          # 全局样式
│   ├── model-adapter/       # AI 模型适配器层
│   │   ├── adapters/        # 各模型提供商适配器
│   │   ├── manager.ts       # 适配器管理器
│   │   ├── presets.ts       # 模型预设配置
│   │   └── router.ts        # 模型路由
│   ├── orchestrator/        # AI 编排引擎
│   │   ├── agent/           # 智能体引擎
│   │   ├── planner/         # 任务规划器
│   │   ├── context/         # 上下文管理器
│   │   ├── review/          # 代码审查引擎
│   │   └── summary/         # 变更摘要
│   ├── sandbox/             # 沙箱安全执行引擎
│   │   ├── executor/        # 命令执行器
│   │   ├── monitor/         # 活动监控器
│   │   └── policy/          # 安全策略
│   ├── ide/                 # IDE 核心组件
│   │   ├── editor/          # Monaco 编辑器
│   │   ├── file-tree/       # 文件树
│   │   └── git/             # Git 集成
│   ├── cue-engine/          # CUE 智能编码引擎
│   ├── mcp/                 # MCP 协议管理
│   ├── plugin-system/       # 插件系统
│   └── skills/              # 技能系统
├── package.json
└── vite.config.ts
```

---

## 🛠️ 技术栈

| 类别 | 技术 |
|------|------|
| **前端框架** | React 18 + TypeScript 5 |
| **构建工具** | Vite 5 |
| **桌面框架** | Electron 43 |
| **构建打包** | electron-builder (NSIS / DMG / AppImage / deb) |
| **代码编辑器** | Monaco Editor 0.52 |
| **状态管理** | Zustand 4 + Immer 10 |
| **终端** | Xterm.js 5 |
| **AI 模型** | OpenAI / Anthropic / DeepSeek / 智谱 / 通义千问 / Google Gemini |
| **协议** | Model Context Protocol (MCP) |
| **安全** | 三重加密沙箱、隐私模式 |

---

## 📖 常见问题

> 完整 FAQ 请查阅 [FAQ.md](FAQ.md)

| 分类 | 问题 |
|------|------|
| **基础** | FyqyClaw 是什么？如何收费？支持哪些平台？ |
| **安装** | 如何安装？如何从源码构建？如何解决启动问题？ |
| **模型配置** | 支持哪些 AI 模型？如何配置 API Key？如何测试连接？ |
| **开发模式** | IDE 和 SOLO 模式有什么区别？如何切换？ |
| **安全** | 代码会上传训练吗？API Key 安全吗？沙箱是什么？ |
| **功能** | 如何使用编辑器/终端/Git/搜索？快捷键有哪些？ |
| **故障排查** | AI 回复慢怎么办？沙箱拦截命令怎么办？如何重置配置？ |

---

## 📊 版本规划

| 版本 | 状态 | 内容 |
|------|------|------|
| **V1.0.0-dev** | 🚧 开发中 | 双模式底座、CUE 引擎基础、多模型适配、沙箱安全 |
| V1.0.0 | 📅 计划中 | 正式版发布，全流程 AI 辅助开发闭环 |
| V1.1.0 | 📅 规划中 | 场景增强、批量重构、项目脚手架 |
| V1.2.0 | 📅 规划中 | 团队协作、自定义智能体市场 |
| V2.0.0 | 📅 规划中 | 架构升级、CI/CD 联动、企业私有化部署 |

---

## 🤝 参与贡献

我们欢迎所有形式的贡献！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 中的贡献指南了解详情。

### 贡献步骤

1. **Fork** 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 提交 **Pull Request**

### 行为准则

请遵守 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。

---

## 📄 许可证

本项目基于 **MIT 许可证** 开源 — 详见 [LICENSE](LICENSE) 文件。

版权所有 © 2026 [晋江市飞虹智科技企业管理有限公司](https://klai.top)

---

## 📬 联系我们

- **官方网站**: [https://klai.top](https://klai.top)
- **技术支持**: 361336873@qq.com
- **项目负责人**: 吴赐虹（飞扬企源研发中心）

---

## 📚 文档导航

| 文档 | 说明 |
|------|------|
| [README.md](README.md) | 项目介绍与快速入门（当前文档） |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 贡献指南 |
| [FAQ.md](FAQ.md) | 常见问题解答 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 部署指南 |
| [DISCLAIMER.md](DISCLAIMER.md) | 免责声明 |
| [LICENSE](LICENSE) | MIT 开源许可证 |

---

<p align="center">
  <sub>如果你觉得这个项目有帮助，请 ⭐ Star 支持我们！</sub>
</p>