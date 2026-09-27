# 企业知识库（数据中台）

> FyqyClaw 智能体运行时的「② 数据中台层」落地模块。
> 定位：让 5 个业务数字员工（客服 / 合同 / 报销 / 简历 / 营销）共享同一个企业知识源，
> 企业上传制度 / 产品 / 客户 / 培训 / 合同法务资料，即形成「专属 AI 大脑」。

署名：晋江市飞虹智科技企业管理有限公司 · 飞扬企源研发中心（吴赐虹）

---

## 一、特性

| 能力 | 说明 |
|---|---|
| **五类目录** | 制度 / 产品 / 客户 / 培训 / 合同法务，对应企业数据中台的五类资料 |
| **上传解析** | 文本 → 自动分块（段落优先 + 重叠）→ 分词建索引，零人工整理 |
| **RAG 检索** | BM25 打分，返回**带出处**的命中片段，可解释、可审计 |
| **权限分级** | `public` / `internal` / `confidential` 三级 + 租户隔离，按密级闸门过滤 |
| **抗幻觉** | 查询词命中率闸门 + `grounded` 判定；无资料时明确要求模型「不得编造」 |
| **本地持久化** | JSON 文件落盘，**默认零出境**（不传 `dataDir` 则纯内存） |
| **可插拔** | 以 `Plugin` 形式挂载，注册为运行时服务 + 4 个技能，卸载即回收 |
| **管理面板** | 配套 `KnowledgeConsole` 服务层 + 零依赖 `/kb` 单页，非技术用户也能录入 / 检索资料 |

**为什么不用向量库**：V1 追求「本地零出境 + 零重依赖 + 可审计」。BM25 对制度 / 合同 / 手册这类
关键词密集的企业文本召回已足够，且完全离线、结果可解释。V2 可在 `retriever.ts` 后追加向量召回
做混合检索，**接口不变**。

---

## 二、作为插件挂载（可插拔）

```ts
import { AgentRuntime } from '../agent-runtime/runtime/agent-runtime'
import { createKnowledgeBasePlugin, KnowledgeBase } from './index'

const runtime = new AgentRuntime({
  config: { knowledgeDir: 'D:/fyqy-data/kb', tenantId: 'fyqy' }, // 落盘目录（零出境）
})

await runtime.installPlugin(createKnowledgeBasePlugin()) // 挂载数据中台

const kb = runtime.getService<KnowledgeBase>('knowledgeBase')!
await kb.ingest({ category: '制度', title: '差旅报销制度', content: '……', permission: 'internal' })

const r = kb.retrieve('个人抬头的餐饮发票能报销吗？', { category: '制度', topK: 3 })
console.log(r.grounded, r.hits, r.context)
```

或直接使用开箱预设（已内置知识库 + 5 个业务数字员工）：

```ts
import { createFyqyRuntime } from '../agent-runtime/presets/default-runtime'
const runtime = await createFyqyRuntime({ knowledgeDir: 'D:/fyqy-data/kb' })
```

---

## 三、暴露的技能（可被任意 agent / 平台调用）

| 技能 id | 作用 | 关键入参 |
|---|---|---|
| `kb.ingest` | 知识入库（自动分块） | `category` / `title` / `content` / `permission` |
| `kb.query` | RAG 检索（带出处） | `query` / `category` / `topK` / `minScore` / `minMatchRatio` / `clearance` |
| `kb.list` | 资料清单 | `category?` |
| `kb.stats` | 知识库概览 | — |

技能的调用方式与其它扩展一致（经运行时注册表），因此**网关 / CLI / 第三方平台**均可触达：
`POST /v1/chat/completions` 走智能体，或直接用 `runtime.getExtension('skill', 'kb.query')`。

---

## 四、权限分级模型

```
等级: public(0) < internal(1) < confidential(2)

文档自带 permission 标签；检索时传入调用方 clearance，
仅当 level(doc.permission) <= level(clearance) 时该块才进入候选集。
```

典型用法：面向客户的**客服数字员工**给 `internal` 密级，看不到 `confidential` 的客户合作纪要；
**营销数字员工**给 `public` 密级，只能用公开产品资料。

---

## 五、抗幻觉设计（企业场景红线）

1. **命中率闸门**（`minMatchRatio`，默认 0.2）：一块内容至少覆盖 20% 的查询词才算命中，
   过滤掉仅靠「公司」「怎么」这类高频共用词擦边的噪声命中。
2. **`grounded` 判定**：`retrieve()` 返回 `grounded:false` 表示知识库无相关资料；
   业务数字员工据此在 system 提示中注入「不得编造，如实告知并建议转人工」。
3. **带出处**：命中自带 `category / title / source / score`，回答可追溯到原句。

---

## 六、验证

```bash
npx tsx src/knowledge-base/demo.ts
```

实测覆盖 7 项（全部通过）：

1. 五类目录入库与自动分块
2. RAG 检索（带出处）
3. 权限分级闸门（internal 看不到 confidential）
4. 抗幻觉（无关问题 `grounded=false`）
5. 技能化调用（经运行时注册表执行 `kb.query`）
6. 本地持久化（写入 → 重新加载 → 可检索）
7. 数据中台 → 业务数字员工联动（`agent-invoice` 会话触发 `kb.query` 并命中制度）

---

## 七、文件结构

```
src/knowledge-base/
├── types.ts           # 类型：五类目录 / 权限 / 文档 / 块 / 检索结果
├── parser.ts          # 分块 + 中英文混合分词（纯函数）
├── retriever.ts       # BM25 打分 + 命中率闸门 + 上下文拼装（纯函数）
├── knowledge-base.ts  # 核心类：入库 / 检索 / 清单 / 统计 / 本地持久化
├── plugin.ts          # 可插拔插件：注册服务 + 4 个技能
├── console.ts         # 管理面板服务层（入参校验 + 白话结论 verdict）
├── console-ui.ts      # 零依赖 /kb 单页（录入 / 清单 / 检索测试）
├── index.ts           # 公共导出
└── demo.ts            # 可运行验证（7 项）
```

---

## 八、知识库管理面板（T2.2 · 非技术用户喂资料）

与 Studio（造数字员工）配套：Studio 决定「谁用知识」，面板决定「知识从哪来」。
由 HTTP 网关在 `GET /kb` 直接吐出单页，左侧录入资料（粘贴正文或选本地文本文件）、
中间按目录筛选与管理、右侧当场检索测试「这份资料能不能被查到」。

配套 HTTP 接口（均由 `KnowledgeConsole` 服务层承接，入参在服务层校验）：

| 方法 / 路径 | 作用 |
|---|---|
| `GET  /api/kb/categories` | 五类目录 + 数据范围选项（带白话说明） |
| `GET  /api/kb/stats` | 资料数 / 块数 / 字数 / 分类分布 |
| `GET  /api/kb/docs?category=` | 已入库资料清单（按目录过滤） |
| `POST /api/kb/docs` | 录入资料（自动分块入库） |
| `DELETE /api/kb/docs/:id` | 删除资料 |
| `POST /api/kb/search` | 检索测试（返回 `grounded` 判定 + 人话结论 `verdict`） |

启动即可体验（网关会预灌示例知识并预置客服数字员工）：

```bash
npx tsx src/agent-runtime/studio/serve.ts      # 然后浏览器打开 http://127.0.0.1:8799/kb
```
