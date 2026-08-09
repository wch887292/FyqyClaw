# FyqyClaw 部署指南

> 版本: 1.0.0-dev | 最后更新: 2026 年 8 月

---

## 目录

- [环境要求](#环境要求)
- [开发环境部署](#开发环境部署)
- [生产环境部署](#生产环境部署)
- [Electron 桌面应用部署](#electron-桌面应用部署)
- [Docker 部署](#docker-部署)
- [配置说明](#配置说明)
- [运维指南](#运维指南)
- [常见问题](#常见问题)

---

## 环境要求

### 硬件配置

| 配置项 | 最低要求 | 推荐配置 |
|--------|---------|---------|
| CPU | 4 核 | 8 核及以上 |
| 内存 | 8 GB | 16 GB 及以上 |
| 磁盘 | 50 GB 空闲 | 高速 SSD，100 GB+ |
| 网络 | 宽带连接 | 低延迟宽带 |

### 系统环境

| 平台 | 版本要求 | 支持状态 |
|------|---------|---------|
| **Windows** | Windows 10 22H2+ / Windows 11 | ✅ 完全支持 |
| **macOS** | macOS 12 Monterey+ | ✅ 完全支持 |
| **Linux** | Ubuntu 20.04+, 或其他现代发行版 | ✅ 完全支持 |
| **WSL** | WSL 2 (Ubuntu 22.04+) | ✅ 支持 |

### 依赖软件

| 软件 | 版本要求 | 用途 |
|------|---------|------|
| Node.js | 18.x 或 20.x LTS | 运行时环境 |
| npm | 9.x 或 10.x | 包管理 |
| Git | 2.30+ | 版本管理 |

---

## 开发环境部署

### 1. 克隆仓库

```bash
git clone https://github.com/fyqy/FyqyClaw.git
cd FyqyClaw/fyqyclaw-app
```

### 2. 安装依赖

```bash
npm install
```

### 3. 启动开发服务器

#### Web 模式（浏览器预览）

```bash
npm run dev
```

启动后访问 `http://localhost:5173`（端口可能因配置而异）。

#### Electron 桌面模式

```bash
npm run electron:dev
```

### 4. 构建

```bash
# TypeScript 类型检查
npx tsc --noEmit

# 构建生产版本
npm run build
```

### 5. 预览构建结果

```bash
npm run preview
```

---

## 生产环境部署

### 构建安装包

#### Windows

```bash
npm run electron:build
```

构建产物位于 `dist/` 目录：
- `FyqyClaw Setup x.x.x.exe` — Windows 安装包
- `FyqyClaw x.x.x.msi` — Windows MSI 安装包

#### macOS

```bash
# 构建 DMG
npm run electron:build -- --mac

# 构建适用于 Apple Silicon 和 Intel
npm run electron:build -- --mac --universal
```

构建产物：
- `FyqyClaw-x.x.x.dmg` — macOS 安装包
- `FyqyClaw-x.x.x-mac.zip` — macOS 手动更新包

#### Linux

```bash
# 构建 AppImage
npm run electron:build -- --linux

# 构建 Snap 包
npm run electron:build -- --linux snap
```

构建产物：
- `FyqyClaw-x.x.x.AppImage` — 通用 Linux 可执行文件
- `FyqyClaw_x.x.x_amd64.snap` — Snap 包
- `FyqyClaw_x.x.x_amd64.deb` — Debian/Ubuntu 安装包

### 安装步骤

#### Windows

1. 双击运行 `FyqyClaw Setup x.x.x.exe`
2. 按照安装向导完成安装
3. 从开始菜单或桌面快捷方式启动

#### macOS

1. 打开 `FyqyClaw-x.x.x.dmg`
2. 将 FyqyClaw 拖入 Applications 文件夹
3. 首次启动时，如果提示未验证开发者，请前往 **系统设置 → 隐私与安全性** 允许运行

#### Linux

```bash
# AppImage
chmod +x FyqyClaw-x.x.x.AppImage
./FyqyClaw-x.x.x.AppImage

# Debian/Ubuntu
sudo dpkg -i FyqyClaw_x.x.x_amd64.deb
fyqyclaw
```

---

## Docker 部署

### 使用预构建镜像

```bash
# 拉取镜像
docker pull fyqy/fyqyclaw:latest

# 运行容器
docker run -d \
  --name fyqyclaw \
  -p 3000:3000 \
  -v /path/to/workspace:/workspace \
  fyqy/fyqyclaw:latest
```

### 自行构建镜像

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

```bash
docker build -t fyqyclaw:latest .
docker run -d -p 3000:3000 fyqyclaw:latest
```

---

## 配置说明

### 基本配置

应用启动后，通过设置面板进行配置，主要包括：

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| AI 模型 | 选择模型提供商和具体模型 | GPT-4o |
| API Key | 模型访问密钥（三重加密存储） | 无 |
| Temperature | 模型生成温度参数 | 0.7 |
| 隐私模式 | 开启后代码不上传训练 | 开启 |
| 沙箱模式 | 隔离执行 AI 生成命令 | 开启 |
| 工作区路径 | 本地项目目录 | 用户选择 |

### 环境变量

| 变量名 | 说明 | 可选值 |
|--------|------|--------|
| `VITE_APP_PORT` | 开发服务器端口 | 5173（默认） |
| `VITE_APP_TITLE` | 应用标题 | FyqyClaw |
| `VITE_API_BASE_URL` | API 基础地址 | http://localhost:3000 |

---

## 运维指南

### 日志管理

应用日志输出位置：

- **Web 模式**: 浏览器开发者工具 Console
- **Electron 模式**: 可通过 `--log-level` 参数控制日志级别

```bash
# 启动时指定日志级别
fyqyclaw --log-level=debug
```

### 数据备份

```bash
# 备份配置文件
cp -r ~/.fyqyclaw ~/.fyqyclaw.backup.$(date +%Y%m%d)

# 备份工作区
tar -czf workspace-backup-$(date +%Y%m%d).tar.gz /path/to/workspace
```

### 常见故障排查

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 应用无法启动 | 端口被占用 | 检查端口占用，或修改配置端口 |
| AI 调用失败 | API Key 无效或过期 | 重新配置 API Key |
| 沙箱执行错误 | 权限不足 | 检查沙箱策略配置 |
| 编辑器无法加载 | 内存不足 | 关闭其他应用，增加内存 |
| 更新失败 | 网络问题 | 手动下载安装包更新 |

### 版本更新

```bash
# 查看当前版本
npm run version

# 在线更新（Electron 模式）
# 应用内自动检测更新，按提示操作即可

# 手动更新
# 从 Releases 页面下载最新版本安装包
```

---

## 常见问题

### Q: 如何切换 AI 模型？

打开 **模型配置** 面板（快捷键 `Ctrl+Alt+M`），选择目标模型提供商和具体模型，输入 API Key 即可。

### Q: 如何确保代码安全？

FyqyClaw 默认开启隐私模式和沙箱执行。所有代码和 AI 对话数据仅存储在本地，不会上传到任何服务器。API Key 经过三重加密存储，即使管理员也无法查看明文。

### Q: 支持哪些 AI 模型？

内置支持 OpenAI、Anthropic、DeepSeek、智谱 AI、通义千问、Google Gemini 等主流模型，同时支持自定义兼容 OpenAI 接口的任意模型端点。

### Q: 如何从源码构建？

参考 [开发环境部署](#开发环境部署) 章节，按步骤执行即可。

### Q: 如何贡献代码？

请参考 [CONTRIBUTING.md](CONTRIBUTING.md) 和 [README.md](README.md) 中的贡献指南。

---

## 相关资源

- [项目主页](https://github.com/fyqy/FyqyClaw)
- [问题反馈](https://github.com/fyqy/FyqyClaw/issues)
- [发布日志](https://github.com/fyqy/FyqyClaw/releases)
- [开发文档](https://github.com/fyqy/FyqyClaw/wiki)

---

<p align="center">
  © 2026 晋江市飞虹智科技企业管理有限公司 · Apache License 2.0
</p>