# FyqyClaw Agent Runtime · 可插拔 / 可独立 / 可对接 的智能体核心

> 这是融合开发规划（v2）中「① 底层基座」的落地实现：把现有 `skills / mcp / model-adapter / plugin-system`
> 的散落能力，收敛为一个**传输无关（transport-agnostic）的智能体运行时容器**。
> 它是「企业 AI 一站式平台」的技术底座——业务层的 OA / CRM / 生产 / ERP 全部以「领域数字员工插件」长在其上。

---

## 一、三大特性（已实测）

| 特性 | 含义 | 落地机制 |
|---|---|---|
| **可插拔** | 能力单元可运行时安装 / 卸载 / 热替换 | `ExtensionRegistry` + `Plugin` 生命周期；扩展点：`agent / skill / tool / model-provider / connector / transport` |
| **可独立** | 不依赖 Electron / DOM，可作库嵌入或独立托管 | `AgentRuntime` 纯 TS + Node 内置；宿主：`embed` / `CLI` / `HTTP 网关` |
| **可对接** | 对接任意外部系统、企业平台、第三方 | `Connector` 扩展点（HTTP / WS / MCP / Webhook）+ OpenAI 兼容网关 |

验证：`npx tsx src/agent-runtime/demo.ts` —— 演示了热插拔技能、脱离 UI 跑会话、外部经 OpenAI 网关流式接入，三者全部通过。

---

## 二、目录结构

```
src/agent-runtime/
├── core/types.ts            # 全部扩展点接口 + AgentEvent + RuntimeContext + Plugin
├── core/context.ts          # 日志 / 密钥 / 上下文构造器（纯 Node）
├── runtime/registry.ts       # 类型化扩展注册表（增删查 + 变更事件）
├── runtime/agent-runtime.ts  # 容器：插件生命周期 + 会话 + 事件分发
├── runtime/session.ts        # AgentSession：send() → AsyncIterable<AgentEvent>
├── runtime/loader.ts         # PluginLoader：内存插件 / 磁盘动态 import
├── builtins/                 # 内置扩展（Echo 模型 / HTTP·MCP 连接器 / 知识库·通知技能 / SOLO 智能体）
├── hosts/cli.ts              # 终端独立宿主
├── hosts/gateway.ts          # HTTP 网关（OpenAI 兼容 /v1/chat/completions + /meta 自检）
├── presets/default-runtime.ts# createFyqyRuntime() 开箱即用入口
├── index.ts                  # 公共 API
└── demo.ts                   # 三特性可运行演示
```

---

## 三、快速开始

### 1) 作为库嵌入（可独立）
```ts
import { createFyqyRuntime } from './agent-runtime'

const runtime = await createFyqyRuntime({
  httpEndpoint: 'https://erp.example.com/hook', // 可对接企业平台
  knowledgeBase: { '合伙人': '分权分利分险机制…' }, // ② 数据中台占位
})
const session = runtime.createSession('agent-solo')
for await (const ev of session.send('介绍一下我们的合伙人机制')) {
  if (ev.type === 'agent.message') process.stdout.write(ev.text)
}
```

### 2) 终端独立运行（可独立）
```bash
npx tsx src/agent-runtime/hosts/cli.ts --message "帮我写一份销售周报提纲"
```

### 3) 启动 HTTP 网关（可对接）
```bash
npx tsx -e "import('./src/agent-runtime/hosts/gateway').then(m=>m.startGateway({port:8787}))"
```
```bash
curl http://localhost:8787/meta                                      # 查看已插拔能力
curl -N -X POST http://localhost:8787/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"echo","messages":[{"role":"user","content":"你好"}]}'  # OpenAI 兼容流式
```

---

## 四、如何写插件（可插拔）

一个插件 = 清单 + `activate()`，在激活时把扩展登记进运行时：

```ts
import type { Plugin, Skill } from './agent-runtime'

const mySkill: Skill = {
  kind: 'skill', id: 'skill-crm', name: 'CRM 跟进', version: '1.0.0',
  category: 'business',
  async execute(input, ctx) {
    const crm = ctx.runtime.getExtension('connector', 'connector-http')
    return crm ? await crm.call('upsertLead', input, ctx) : { ok: false, error: 'no crm' }
  },
}

export const crmPlugin: Plugin = {
  manifest: { id: 'biz-crm', name: '业务·CRM', version: '1.0.0', dependencies: ['builtin-connectors'] },
  activate: (api) => api.register(mySkill),
}
```
安装：`new PluginLoader(runtime).load(crmPlugin)` —— 业务层的 OA / 生产 / ERP 数字员工均以这种方式长出。

支持的扩展点：`agent`（编排）/ `skill`（受控能力）/ `tool`（智能体可调函数）/ `model-provider`（模型后端）/ `connector`（对外连接）/ `transport`（事件呈现）。

---

## 五、如何对接外部系统（可对接）

- **Connector 扩展点**：实现 `call(action, payload)` 即可对接 REST / WebSocket / MCP / Webhook / SDK。内置 `HttpConnector`（对接企业平台）、`McpBridgeConnector`（零耦合桥接现有 `src/mcp/manager`）。
- **OpenAI 兼容网关**：`hosts/gateway.ts` 暴露 `/v1/chat/completions`，第三方 / 企业平台**零改造**即可把 FyqyClaw 当模型后端接入。
- **对接现有项目模块**（保持 agent-runtime 纯净、不引 Electron）：
  - `src/skills/manager` → 包装成 `skill` 插件（delegate 注入）
  - `src/mcp/manager` → 通过 `mcpBridge` 配置委托（已内置桥接连接器）
  - `src/model-adapter` → 包装成 `model-provider` 插件（含现有 Anthropic / OpenAI / 多模型路由）

---

## 六、与现有项目的关系（融合开发规划 ① 底层基座）

| 新文档层 | 现状 | 落点 |
|---|---|---|
| ① 底层基座（大模型+智能体） | 已有 orchestrator/model-adapter/sandbox | **本运行时即该层载体**（agent-runtime + 现有沙箱/加密） |
| ② 数据中台（知识库） | 待建 | `skill-knowledge` + 未来向量库连接器 |
| ③④⑤ 业务/ERP | 待建 | 以「领域数字员工插件」按需长出，不重写架构 |

**安全延续**：运行时完全兼容现有「主进程强制沙箱 + API Key 加密 + 零数据出境」，护城河不变。
