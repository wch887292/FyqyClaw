# FyqyClaw FAQ (English)

> Version: 1.0.0-dev | Last updated: August 2026

---

## Table of Contents

- [Basics](#basics)
- [Installation & Deployment](#installation--deployment)
- [AI Model Configuration](#ai-model-configuration)
- [Development Modes](#development-modes)
- [Security & Privacy](#security--privacy)
- [Feature Usage](#feature-usage)
- [Troubleshooting](#troubleshooting)
- [Contribution & Community](#contribution--community)

---

## Basics

### Q: What is FyqyClaw?

FyqyClaw (Feiyang Qiyuan AI) is a full-lifecycle development tool that deeply integrates large-model AI capabilities. It supports **traditional IDE precision control** and **fully-autonomous AI Agent development** in two modes, covering the complete engineering chain: requirement breakdown, coding, project comprehension, debugging, code review, and change management.

### Q: How is FyqyClaw different from Cursor, Windsurf, Trae, and other AI editors?

| Aspect | FyqyClaw | Cursor / Windsurf / Trae |
|--------|---------|--------------------------|
| **Dev mode** | IDE + SOLO dual mode, switchable anytime | AI-assist centric, no standalone Agent mode |
| **AI autonomy** | SOLO mode: AI plans, codes, tests, reviews autonomously | Step-by-step instruction interaction |
| **MCP protocol** | Native support, extensible toolchain | Partial / plugin required |
| **Security** | Privacy mode + sandbox execution + triple-encrypted API Key | Basic encryption |
| **Open source** | ✅ Apache-2.0 open source | ❌ Closed commercial product |
| **Local deployment** | ✅ Fully local | Partially cloud-dependent |

### Q: Is FyqyClaw free?

Yes. FyqyClaw is fully open-source and free under the **Apache License 2.0 (Apache-2.0)**. You may freely use, modify, and distribute it, subject to Apache-2.0 terms (including retaining copyright & license notices and marking modifications). Note that API usage fees for the AI models are borne by the user.

### Q: Which platforms are supported?

| Platform | Support |
|------|---------|
| Windows 10+ | ✅ Full support |
| macOS 12+ | ✅ Full support |
| Linux (Ubuntu 20.04+) | ✅ Full support |
| WSL 2 | ✅ Supported |

### Q: What does "FyqyClaw" mean?

"Fyqy" is the pinyin abbreviation of "Feiyang Qiyuan" (飞扬企源). "Claw" implies precisely grabbing code and catching problems like a claw. Together it means "Feiyang Qiyuan's AI development weapon."

---

## Installation & Deployment

### Q: How do I install FyqyClaw?

**Option 1: Download the installer**
Download the installer for your platform from [Releases](https://github.com/wch887292/FyqyClaw/releases) and install directly.

**Option 2: Build from source**
```bash
git clone https://github.com/wch887292/FyqyClaw.git
cd FyqyClaw/fyqyclaw-app
npm install
npm run dev          # Web mode
npm run electron:dev # Desktop mode
```

### Q: Permission error when installing dependencies?

- **Windows**: run PowerShell or CMD as Administrator
- **macOS/Linux**: prefix the command with `sudo` (e.g. `sudo npm install`)
- If using `nvm`, ensure Node.js is 18.x or 20.x LTS

### Q: Blank page or failure to load after launch?

1. Confirm port `5173` (or the configured port) is not occupied
2. Clear browser cache, or open in incognito mode
3. Check the console for error logs
4. Try reinstalling dependencies: `rm -rf node_modules && npm install`

### Q: How do I build an executable installer?

```bash
# Windows
npm run electron:build

# macOS
npm run electron:build -- --mac

# Linux
npm run electron:build -- --linux
```

---

## AI Model Configuration

### Q: Which AI models does FyqyClaw support?

Built-in providers:
- **OpenAI** — GPT-4o, GPT-4o-mini, GPT-4-turbo, O1 series
- **Anthropic** — Claude Sonnet 4, Claude 3.5 Sonnet, Claude Opus 4
- **DeepSeek** — DeepSeek V3, DeepSeek R1, DeepSeek Coder
- **Zhipu AI** — GLM-4-Plus, GLM-4-Air, GLM-4-Flash
- **Qwen (Tongyi)** — Qwen Plus, Qwen Turbo, Qwen Max, Qwen 2.5 Coder
- **Google Gemini** — Gemini 2.5 Pro, Gemini 2.0 Flash
- **SiliconFlow** — various hosted open-source models
- **Custom model** — any OpenAI-compatible endpoint

### Q: How do I configure the API Key?

1. Open the **Model Configuration** panel (shortcut `Ctrl+Alt+M` or via the menu bar)
2. Select the model provider and specific model
3. Enter the API Key
4. Click **Save Configuration**

> **Security note**: The API Key is triple-encrypted and stored in local memory; it must be re-entered after a page refresh. See [Security & Privacy](#security--privacy).

### Q: Where is the API Key stored? Is it safe?

The API Key is triple-encrypted and stored in application state (memory):
- **Layer 1**: browser fingerprint + session salt derived key for AES-SUB permutation encryption
- **Layer 2**: time-based salt XOR obfuscation
- **Layer 3**: Base64 + custom character shuffle

The ciphertext is bound to the current browser session; even an administrator cannot view the plaintext. After the session ends (app closed), the key is cleared automatically.

### Q: Do you support custom model endpoints?

Yes. In the model config panel, select the **Custom Model** tab and fill in:
- Provider name
- API endpoint (must be OpenAI Chat Completions compatible)
- Model ID
- API Key (optional)

### Q: How do I test whether the model connection works?

In the model config panel, after entering the API Key, click the **Test Connection** button; the system sends a test message and shows the result.

### Q: Why does the AI call return an error?

Common causes:
1. **Invalid or expired API Key** — check and update it
2. **Network issue** — verify access to the model API endpoint
3. **Service unavailable** — some providers may have outages
4. **Request timeout** — lower Temperature or reduce Max Tokens in config
5. **Insufficient balance** — check the provider account balance

---

## Development Modes

### Q: What's the difference between IDE mode and SOLO mode?

| Feature | IDE Mode | SOLO Mode |
|------|---------|-----------|
| **Lead** | Developer | AI Agent |
| **Best for** | Precise coding, debugging, small changes | New project scaffolding, large refactors, batch features |
| **Coding** | Manual + CUE smart assist | AI auto-generates code |
| **Code review** | AI-assisted review | AI auto-review + human confirmation |
| **Control granularity** | Line-level | Task-level |
| **Switching** | One-click anytime | One-click anytime |

### Q: How do I switch development modes?

Click the **mode-switch button** in the top menu bar (or use shortcut `Ctrl+Shift+M`) to toggle between IDE and SOLO modes.

### Q: What can the AI do in SOLO mode?

In SOLO mode, the AI Agent can autonomously:
1. **Requirement breakdown** — analyze needs, split into executable task lists
2. **Tech selection** — recommend tech & frameworks per project traits
3. **Code generation** — auto-generate complete project or module code
4. **Automated testing** — generate and run test cases
5. **Error fixing** — auto-attempt fixes upon discovering errors
6. **Code review** — security & quality review of generated code
7. **Change summary** — generate change digest and commit messages

### Q: Is the code generated in SOLO mode safe?

All code generated in SOLO mode runs by default in a **sandbox environment**, which:
- Blocks high-risk system operations (e.g. deleting system files)
- Restricts file access to the workspace directory only
- Monitors command execution behavior (auto-terminates anomalies)
- Logs all execution for traceability

It is recommended to perform a manual review after the sandbox validation passes.

---

## Security & Privacy

### Q: Will my code be uploaded for model training?

**By default, no.** FyqyClaw enables **Privacy Mode** by default, in which:
- All code, conversation content, and generated results are stored locally
- Data is not uploaded for model training
- Only necessary request content is sent to the AI model API

You can view the privacy-mode status in **Settings → System Settings**.

### Q: What is sandbox execution? How do I enable it?

Sandbox execution is FyqyClaw's secure execution environment for isolating AI-generated commands. Enabled by default, it provides:
- **Policy control**: define allow/deny command lists
- **Activity monitoring**: real-time monitoring of command behavior
- **Anomaly interception**: auto-terminate high-risk operations
- **Logging**: complete execution trace

### Q: Will the API Key leak?

FyqyClaw protects the API Key with a triple-encryption mechanism:
1. The key is bound to the browser fingerprint; leaked data cannot be decrypted in another environment
2. The session salt is randomly generated on each launch; historical ciphertext cannot be decrypted in a new session
3. Plaintext exists only in temporary in-memory variables and never enters persistent storage

Additionally, logs auto-mask the API Key, showing only the `sk-****...****ab12` format.

### Q: Does FyqyClaw collect user data?

The open-source edition of FyqyClaw **collects no user data**. All data is processed locally; no network registration or login is required (except for AI model API calls).

---

## Feature Usage

### Q: How do I use the code editor?

FyqyClaw integrates Monaco Editor (the same editor as VS Code), supporting:
- **Syntax highlighting** — mainstream programming languages
- **IntelliSense** — code auto-completion and suggestions
- **Code formatting** — shortcut `Ctrl+Shift+F`
- **Auto-save** — auto-saves 3 seconds after you stop typing
- **Manual save** — shortcut `Ctrl+S`
- **Multi-tab** — edit multiple files with drag-to-reorder

### Q: How do I use the terminal?

The **Terminal** tab in the bottom panel provides full terminal functionality:
- Multi-tab terminal support
- Command history
- Synced with the workspace directory
- Can interact with AI (AI can execute terminal commands)

### Q: How do I search code?

The **Search** panel in the sidebar supports:
- **File search**: quickly locate by file name
- **Content search**: search text across all files
- **Regex search**: regular-expression support
- **Case matching**: configurable
- **Whole-word matching**: configurable

### Q: How do I use Git features?

The **Git** panel in the sidebar provides:
- View file change status
- Stage / unstage modifications
- Commit code and generate commit messages
- View commit history
- Branch management

### Q: How do I install and use skills?

In **Settings → Skill Management**:
1. Browse the available skill list
2. Click **Install** to install a skill
3. Installed skills take effect automatically in AI conversations

Currently supported skills include: code review, document generation, test generation, commit-message generation, etc.

### Q: What is MCP? How do I use it?

MCP (Model Context Protocol) is a communication protocol between AI models and external tools. Through MCP, AI can:
- Read and write files
- Execute Git operations
- Query databases
- Call web APIs
- Use custom tools

Configure and manage MCP services in **Settings → MCP Servers**.

### Q: What are the shortcuts?

| Shortcut | Function |
|--------|------|
| `Ctrl+Shift+M` | Switch IDE/SOLO mode |
| `Ctrl+Alt+M` | Open model config panel |
| `Ctrl+Shift+P` | Open command palette |
| `Ctrl+S` | Save current file |
| `Ctrl+Shift+F` | Format code |
| `Ctrl+Shift+E` | Toggle sidebar visibility |
| `Ctrl+`` ` | Toggle terminal panel |
| `Ctrl+Shift+X` | Open extensions panel |

---

## Troubleshooting

### Q: App stuck on the loading screen after launch?

1. Try clearing the browser cache or app data
2. Check whether another app occupies the same port
3. Look for error logs in the terminal
4. Try `npm run dev` (Web mode) to isolate the issue

### Q: AI replies are very slow?

Possible causes and fixes:
1. **Network latency** — check connection quality to the model API
2. **High model load** — switch to a lighter model (e.g. GPT-4o-mini)
3. **Overly long requests** — reduce context or use shorter prompts
4. **Temperature too high** — lowering it improves response speed
5. **Insufficient local resources** — close other CPU/memory-heavy apps

### Q: Sandbox says "command intercepted"?

The sandbox blocked a high-risk operation per its security policy. You can:
1. View the sandbox policy config in **Settings → System Settings**
2. Confirm whether the command really needs to run
3. To temporarily disable the sandbox (not recommended), toggle it off in settings

### Q: Editor can't save a file?

1. Check whether the file is locked by another program
2. Check write permissions on the containing directory
3. If using the Electron desktop edition, check for sufficient disk space
4. Look for error logs in the console

### Q: How do I view logs?

- **Web mode**: browser DevTools → Console panel
- **Electron mode**: launch with `--log-level=debug`
- Log prefix `[SOLO]` indicates SOLO-mode logs; `[Config-*]` indicates config-related logs

### Q: How do I reset all configuration?

Delete the app config directory (back up important data first):

- **Windows**: `%APPDATA%/FyqyClaw`
- **macOS**: `~/Library/Application Support/FyqyClaw`
- **Linux**: `~/.config/FyqyClaw`

---

## Contribution & Community

### Q: How do I contribute code?

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Submit a Pull Request

### Q: How do I report a bug or suggest a feature?

- **GitHub Issues**: [https://github.com/wch887292/FyqyClaw/issues](https://github.com/wch887292/FyqyClaw/issues)
- **Technical support email**: 361336873@qq.com

When filing an issue, please provide:
- Problem description and reproduction steps
- OS and version info
- Relevant logs or screenshots

### Q: How do I contact the maintainers?

- **Official site**: https://klai.top
- **Technical support email**: 361336873@qq.com
- **Project lead**: Wu Cihong (Feiyang Qiyuan R&D Center)

### Q: What open-source license does the project use?

FyqyClaw is open-sourced under the **Apache License 2.0 (Apache-2.0)**. You may freely use, modify, and distribute the software, subject to Apache-2.0 terms, including retaining the original copyright and license notices and clearly marking modified files.

### Q: How do I get the latest updates?

1. **GitHub Releases**: watch the [Releases](https://github.com/wch887292/FyqyClaw/releases) page
2. **Star the repo**: click Star at the top-right of the GitHub repo to follow updates
3. **Watch the repo**: click Watch at the top-right and select "Releases only"

---

<p align="center">
  <sub>If you find this project helpful, please ⭐ Star to support us!</sub>
</p>
