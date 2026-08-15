# 贡献指南

感谢你考虑为 FyqyClaw 贡献力量！我们欢迎所有形式的贡献，包括但不限于代码提交、Bug 报告、功能建议、文档改进、使用反馈等。

---

## 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境搭建](#开发环境搭建)
- [项目结构](#项目结构)
- [编码规范](#编码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [测试指南](#测试指南)
- [问题反馈](#问题反馈)

---

## 行为准则

本项目遵守 [Contributor Covenant](https://www.contributor-covenant.org/) 行为准则。参与贡献即表示同意遵守该准则。如有不可接受的行为，请通过 [361336873@qq.com](mailto:361336873@qq.com) 联系我们。

### 我们的承诺

- 营造开放、友好的社区环境
- 尊重不同观点和经验
- 接受建设性批评
- 关注对社区最有利的事情

---

## 如何贡献

### 报告 Bug

提交 Bug 报告前，请先搜索 [Issues](https://github.com/wch887292/FyqyClaw/issues) 确认是否已被报告过。

好的 Bug 报告应包含：

- **清晰的标题** — 简要描述问题
- **复现步骤** — 详细描述如何复现
- **期望行为** — 描述你期望的结果
- **实际行为** — 描述实际发生的结果
- **环境信息** — 操作系统、浏览器版本、Node.js 版本等
- **日志或截图** — 如有，请附上错误日志或截图

### 提交功能建议

我们欢迎新功能建议！请在提交前：

1. 搜索 [Issues](https://github.com/wch887292/FyqyClaw/issues) 确认是否已有类似建议
2. 清晰地描述功能需求和使用场景
3. 如果可能，提供实现思路或参考实现

### 改进文档

文档改进包括但不限于：

- 修正拼写或语法错误
- 补充缺失的说明
- 改进表达方式
- 添加使用示例
- 翻译文档

---

## 开发环境搭建

### 前置要求

| 工具 | 版本要求 |
|------|---------|
| Node.js | 18.x 或 20.x LTS |
| npm | 9.x+ |
| Git | 2.x+ |

### 步骤

```bash
# 1. Fork 本仓库
# 点击 GitHub 页面右上角的 Fork 按钮

# 2. 克隆你的 Fork 到本地
git clone https://github.com/你的用户名/FyqyClaw.git
cd FyqyClaw/fyqyclaw-app

# 3. 添加上游仓库
git remote add upstream https://github.com/wch887292/FyqyClaw.git

# 4. 安装依赖
npm install

# 5. 启动开发服务器
npm run dev              # Web 模式
npm run electron:dev     # Electron 桌面模式

# 6. 确保代码编译通过
npx tsc --noEmit
```

---

## 项目结构

```
FyqyClaw/
├── electron/                 # Electron 主进程
│   ├── main.ts              # 主进程入口
│   └── preload.ts           # 预加载脚本
├── src/
│   ├── main/                # 前端应用主代码
│   │   ├── components/      # UI 组件
│   │   │   ├── config/      # 配置面板（模型/MCP/技能/设置）
│   │   │   └── ...
│   │   ├── stores/          # 状态管理 (Zustand + Immer)
│   │   ├── pages/           # 页面
│   │   ├── hooks/           # 自定义 Hooks
│   │   ├── utils/           # 工具函数
│   │   └── styles/          # 全局样式
│   ├── model-adapter/       # AI 模型适配器层
│   ├── orchestrator/        # AI 编排引擎
│   ├── sandbox/             # 沙箱安全执行引擎
│   ├── ide/                 # IDE 核心组件
│   ├── cue-engine/          # CUE 智能编码引擎
│   ├── mcp/                 # MCP 协议管理
│   ├── plugin-system/       # 插件系统
│   └── skills/              # 技能系统
├── build/                   # 构建资源（图标等）
├── release/                 # 构建产物输出目录
├── package.json
└── vite.config.ts
```

---

## 编码规范

### TypeScript

- 代码必须通过 TypeScript 编译检查（`npx tsc --noEmit`）
- 使用 TypeScript 严格模式
- 定义明确的接口和类型，避免 `any`
- 使用 `import type` 导入仅类型需要的模块

### React 组件

- 使用函数组件 + Hooks
- 文件命名使用 PascalCase（如 `AppLayout.tsx`）
- 组件必须包裹 ErrorBoundary
- 状态管理优先使用 Zustand store，避免过度 prop drilling

### 样式

- 使用 CSS Modules 或内联样式
- 避免全局样式污染
- 颜色变量统一在 `src/main/styles/` 中定义

### 命名约定

| 类别 | 命名规则 | 示例 |
|------|---------|------|
| 组件文件 | PascalCase | `AppLayout.tsx` |
| 工具函数 | camelCase | `encryptApiKey.ts` |
| 类型/接口 | PascalCase | `ActiveModel` |
| 常量 | UPPER_CASE | `MAX_RETRY_COUNT` |
| 目录 | kebab-case | `model-adapter/` |

### 安全规范

- **禁止**在代码中硬编码 API Key 或密钥
- **禁止**明文存储敏感信息（使用三重加密）
- Electron API 调用必须通过 `utils/electron-bridge.ts` 封装
- 日志输出必须遮蔽敏感信息

---

## 提交规范

### Commit 信息格式

```
<type>(<scope>): <subject>

<body>
```

**type 类型：**

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响功能） |
| `refactor` | 重构 |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链相关 |
| `ci` | CI 配置变更 |
| `security` | 安全相关 |

**示例：**

```
feat(model-adapter): 添加 DeepSeek 模型适配器

- 实现 DeepSeek Chat Completions API 对接
- 添加 DeepSeek 模型预设配置
- 更新模型选择器 UI
```

### 提交注意事项

- 提交前确保代码通过编译检查
- 保持提交粒度适中，一个提交只做一件事
- 提交信息使用中文或英文，保持一致性

---

## Pull Request 流程

### 分支保护规则

`main`（默认分支）与 `master` 均已开启**严格分支保护**，所有合并必须通过 Pull Request：

- 🚫 禁止 `git push --force` 到受保护分支
- 🚫 禁止删除受保护分支（管理员同样受限）
- ✅ 所有变更必须经 PR 合并，且**至少 1 个审批**才能合入
- ✅ 即使你是仓库管理员，也不能直接 push 到 `main` / `master`

> 因此请勿直接 push 到 `main` / `master`，请基于特性分支发起 PR。

### 基本流程

1. **同步上游仓库**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **创建特性分支**
   ```bash
   git checkout -b feature/你的功能名称
   ```

3. **开发并提交**
   ```bash
   git add <文件>
   git commit -m 'feat: 添加某某功能'
   ```

4. **推送分支**
   ```bash
   git push origin feature/你的功能名称
   ```

5. **创建 Pull Request**
   - 前往 GitHub 仓库页面
   - 点击 Pull Request → New Pull Request
   - 选择你的分支，填写详细描述
   - 关联相关 Issue（如果有）

### PR 检查清单

提交 PR 前，请确认：

- [ ] 代码通过 `npx tsc --noEmit` 编译检查
- [ ] 代码遵循项目编码规范
- [ ] 新增功能包含必要的错误处理
- [ ] 敏感信息已正确加密处理
- [ ] 相关文档已更新
- [ ] Commit 信息符合规范

### 审查流程

1. 维护者会在 3-5 个工作日内审查 PR
2. 可能需要根据反馈进行修改
3. 审查通过后由维护者合并

---

## 测试指南

### 编译检查

```bash
npx tsc --noEmit
```

### 手动测试

由于项目目前处于开发阶段，主要依赖手动测试：

1. 启动开发服务器：`npm run dev`
2. 测试核心功能：
   - 模型配置与连接
   - IDE 模式文件编辑
   - SOLO 模式 AI 对话
   - 终端命令执行
   - 文件搜索功能
3. 检查浏览器控制台无错误日志

### 构建测试

```bash
# 构建前端
npm run build

# 构建 Windows 安装包（仅在 Windows 上）
npm run build:win
```

---

## 问题反馈

### 提交 Issue

- [GitHub Issues](https://github.com/wch887292/FyqyClaw/issues)
- 技术支持邮箱：361336873@qq.com

### 其他联系方式

- **官方网站**: https://klai.top
- **项目负责人**: 吴赐虹（飞扬企源研发中心）

---

## 感谢贡献

所有贡献者都将被记录在项目的 [README.md](README.md) 和 GitHub 贡献者列表中。

再次感谢你为 FyqyClaw 做出的贡献！ 🎉

---

<p align="center">
  <sub>如有疑问，请查阅 [FAQ.md](FAQ.md) 或通过上述方式联系我们</sub>
</p>