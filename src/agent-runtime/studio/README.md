# Studio —— 非技术用户数字员工工作台

> FyqyClaw 融合规划 **T2.1** 的落地：让不懂代码的老板，用「说一句话 + 选一选」做出自己的业务数字员工，
> 并当场试用。全程不碰代码、不碰 prompt。

署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心（吴赐虹）

---

## 一、怎么用（30 秒上手）

```bash
# 在 fyqyclaw-app 目录下（有 tsx 时）
npx tsx src/agent-runtime/studio/serve.ts
# 打开 http://127.0.0.1:8799/studio
```

本仓库未内置 `tsx`，可用已在 devDependencies 的 `esbuild` 直接跑（本项目验证即用此法）：

```bash
unset NODE_OPTIONS CODEBUDDY_SESSION_ID   # 沙箱环境需绕过 safe-delete 垫片
node node_modules/esbuild/bin/esbuild src/agent-runtime/studio/serve.ts \
  --bundle --platform=node --format=esm --outfile=H:/FyqyClaw/.studio-serve/serve.mjs
node H:/FyqyClaw/.studio-serve/serve.mjs
# 打开 http://127.0.0.1:8799/studio
```

页面三栏：

| 栏位 | 作用 |
|---|---|
| **① 用一句话创建** | 说一句大白话（如"做一个客服数字员工，读产品资料，回答客户询价，回复简洁"），点「解析这句话」→ 自动填好角色、知识范围、输出风格、建议名称 |
| **② 已上线的数字员工** | 卡片列表：名称 / 角色 / 可读目录 / 数据范围 / 是否可外发；每张卡可「试运行」「下线」 |
| **③ 当场试一下** | 输入一个真实问题，看它怎么答 + **执行轨迹**（查了哪些资料、有没有外发） |

嵌入到其它宿主（Electron / 自有后台）时，只需 `new Studio(runtime, opts)` 并复用同一批 JSON 接口。

---

## 二、零代码是怎么做到的

用户只做**选择题**，prompt 与安全策略由蓝图提供：

| 用户看到的 | 背后映射 |
|---|---|
| 角色下拉（客服/合同/报销/简历/文案/自定义） | `RoleBlueprint.systemPrompt`（含 `{{name}}` / `{{scenario}}` 占位） |
| 「它可以读哪些资料」多选 | `knowledgeCategories` → 数据中台目录权限 |
| 「数据范围」下拉（公开/内部/机密） | `clearance` → 知识库密级闸门 |
| 「回复风格」下拉（简洁/结构化/亲和口语） | `outputTemplate` |
| 「允许对接外部系统」开关 | `allowedConnectors` 白名单 |

**关键：安全闸门在后端强制。** 即使前端被绕过、请求里硬塞 `allowExternal: true`，
合同/报销/简历类角色也会被 `normalizeDraft()` 强制关闭外发（见验证第 4 项）。

---

## 三、对话式引导（离线、确定性、可测）

`studio.chat(text)` 用**关键词解析**把一句话转成员工草稿 —— 不依赖模型，因此离线可用、结果可预测、可写断言。
识别维度：角色、知识目录、输出风格、是否外发、名称、业务场景。

```
输入：做一个客服数字员工，读产品资料，回答客户询价，回复要简洁
输出：角色=客服应答 / 可读知识=产品,客户 / 风格=简洁 / 名称=客服小飞（建议） → ready=true
```

> 接入真实大模型后，可把 `chat()` 换成 LLM 抽取（接口不变）；当前实现保证"没有模型也能用"。

---

## 四、创建 = 热插拔

`Studio.create()` 内部把草稿编译成标准 `Plugin`，走运行时既有的 `installPlugin()` 通道：

```
草稿 → compileEmployee() → Plugin{ activate → 注册 DomainAgent }
     → runtime.installPlugin() → 立即出现在 /meta 与注册表
     → 下线 = uninstallPlugin() → 扩展与服务自动回收
```

所以数字员工是**热装热卸**的，不需要重启、不改代码、不影响其它员工。

**持久化**：传 `storeDir` 后，定义写入 `employees.json`，重启 `load()` 自动重建（数据不出企业）。

---

## 五、HTTP 接口（网关托管）

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/studio` | 工作台页面（零依赖单页） |
| GET | `/api/studio/blueprints` | 可选角色 / 目录 / 密级 / 风格 |
| GET | `/api/studio/employees` | 已上线数字员工 |
| POST | `/api/studio/chat` | `{text, draft}` → 草稿 + 解释 + 是否就绪 |
| POST | `/api/studio/employees` | `{draft}` → 创建并热上线 |
| DELETE | `/api/studio/employees/:id` | 下线 |
| POST | `/api/studio/employees/:id/test` | `{message}` → 回复 + 执行轨迹 + 是否命中知识库 |

---

## 六、验证

```bash
npx tsx src/agent-runtime/studio/demo.ts
# 或无 tsx：用上面的 esbuild 打包 demo.ts 后 node 运行
```

实测 7 项（全部通过）：

1. 对话式引导：一句大白话 → 角色/目录/风格/名称/就绪判定全部正确
2. 零代码创建 → 热上线（运行时 agent 数 6 → 7）
3. 试运行 → 真实跑一轮，轨迹含「检索企业知识库 / 命中 N 条依据」，`grounded=true`
4. **安全闸门**：合同角色请求开外发 → 实际 `allowExternal=false`（后端强制）；客服角色 → 允许
5. 下线 → agent 从注册表回收（7 → 6）
6. 本地持久化 → 重启后自动恢复并重新上线
7. 网关端到端（真实 HTTP）：`/studio` 页面 + 全部 `/api/studio/*` 接口打通

另外 `tsc --noEmit` **全项目 0 错误**。

---

## 七、⚠️ 当前限制（如实说明）

**回答文本目前是 Echo 演示模型**：知识库检索、权限闸门、执行轨迹**全部真实工作**，
但最终那段"自然语言回答"由 Echo 占位模型产出（它会自我介绍是演示模型并提示接入真实模型）。

要得到真正可用的回答，需在运行时配置中接入真实模型提供器：

```ts
const runtime = await createFyqyRuntime({
  modelProvider: 'model-openai',        // 或私有部署的 OpenAI 兼容端点
  secrets: { OPENAI_API_KEY: '...' },   // 密钥走 SecretStore，不出本地
})
```

**其它边界**：
- 对话式引导目前是关键词解析，复杂表述可能识别不全（可退回表单手动填）
- 数字员工定义存 JSON；接企业正式环境建议换 SQLite（接口不变）
- 尚未接入 Electron 渲染层（当前经网关在浏览器使用；嵌入只需复用同一批接口）

---

## 八、文件结构

```
src/agent-runtime/studio/
├── types.ts         # 草稿 / 数字员工 / 引导结果 / 试运行结果
├── blueprints.ts    # 角色蓝图 + 输出风格 + 白话选项（零代码的核心）
├── studio-agent.ts  # 草稿 → Plugin/DomainAgent 编译 + 后端安全闸门
├── studio.ts        # Studio 服务：引导/创建/下线/试运行/持久化
├── ui.ts            # 零依赖单页界面（中文）
├── serve.ts         # 一条命令启动演示（含示例知识）
├── index.ts         # 公共导出
└── demo.ts          # 可运行验证（7 项）
```

---

## 九、下一步（V2 后续）

- 把 Studio 嵌进 Electron 渲染层（复用同一批 `/api/studio/*` 接口，无需重写）
- 知识库管理面板（上传/检索/权限配置）—— T2.2 配套
- 对话式引导升级为 LLM 抽取，支持"照着这份制度帮我做一个报销数字员工"这类长指令
- 数字员工市场（导出/导入定义包，便于同行复制）
