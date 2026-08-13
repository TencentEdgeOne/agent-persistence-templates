# Agent Persistence Templates（Agent 持久化模板）

**语言：** [English](./README.md) | 简体中文

EdgeOne Makers 上的一组独立 Agent 模板，集中演示**跨进程持久化**：Agent 状态、人工审批（HITL）、会话 transcript 都能在进程重启后存活——因为运行时把它们存在平台 Blob 支撑的 `context.store` 里，而不是进程内存中。

## 模板清单

| 目录 | 框架 | 运行时 | 演示能力 |
|---|---|---|---|
| `openai-agents-hitl-starter-node/` | OpenAI Agents SDK | Node.js / TypeScript | **人工审批 HITL** —— `needsApproval` 工具暂停执行；序列化的 `RunState` 通过 `context.store.state` 持久化，之后在另一次请求里批准/拒绝 |
| `openai-agents-hitl-starter-python/` | OpenAI Agents SDK | Python | 同样的 HITL / `RunState` 流程，Python 运行时 |
| `claude-agent-resume-starter-node/` | Claude Agent SDK | Node.js / TypeScript | **会话恢复** —— `context.store.claudeSessionBinding()` 把任意 conversation ID 映射成稳定的 Claude session UUID；transcript 在进程重启后通过 `resume` 继续 |
| `claude-agent-resume-starter-python/` | Claude Agent SDK | Python | 同样的会话绑定 / 恢复流程，Python 运行时 |

每个目录都是一个完整可部署的模板（agents + cloud-functions + 前端 + `edgeone.json`），详情见各模板的 `README.md`。

## 用到的平台能力

- **`context.store.state`** —— 会话级持久化 KV（`get/set/delete`）；值必须是严格 JSON，按 `conversation_id` 隔离。
- **`context.store.claudeSessionBinding(conversationId)`** / `claude_session_binding()` —— 为任意 conversation ID 提供稳定的 Claude session UUID，跨进程重启持久保留。
- **LangGraph checkpointer / `deleteThread`** —— checkpoint 按 `thread_id = conversation_id` 持久化，`deleteConversation` 时级联清理。
- **`MemoryCorruptError`** —— 损坏的 checkpoint / 会话 JSONL 会抛出明确错误，而不是被静默当作"不存在"。

> ⚠️ 这些能力要求更新的 EdgeOne Makers 运行时 / CLI（2026-08 之后）。如果部署后报 `HITL_STATE_STORE_UNAVAILABLE` 或找不到 `claudeSessionBinding`，先升级 CLI 再部署。

## 环境要求

- Node.js ≥ 18（Node 模板）/ Python 3.10+（Python 模板）
- EdgeOne CLI：`npm i -g @tencent/edgeone`（或 `edgeone`）
- 一个 EdgeOne Makers 账号：[国内站](https://console.cloud.tencent.com/edgeone/pages) | [国际站](https://pages.edgeone.ai)

## 快速开始（任选一个模板）

```bash
cd openai-agents-hitl-starter-node    # 或另外三个之一

npm install                            # Node 模板；Python 模板用 pip install -r agents/requirements.txt
cp .env.example .env                   # 填入 AI_GATEWAY_API_KEY / AI_GATEWAY_BASE_URL
edgeone makers dev
```

打开 `http://localhost:8080/`（Node）——前端会把稳定的 `makers-conversation-id` 存在浏览器存储里。

### 验证跨进程恢复

1. 启动 dev server，发一条消息（HITL：让 AI 发起一个需要审批的动作；Claude：发一条 marker 消息）。
2. 停掉 dev 进程（Ctrl-C）。
3. 重新 `edgeone makers dev`。
4. 继续同一会话：
   - **HITL**：挂起的审批从 `context.store.state` 恢复；批准/拒绝会继续执行。
   - **Claude**：Agent 还记得之前的对话（transcript 通过 `claudeSessionBinding` 恢复），页面也会从 `/history` 恢复历史消息。

## 项目结构

```text
agent-persistence-templates/
├── openai-agents-hitl-starter-node/    # OpenAI Agents HITL（Node）
├── openai-agents-hitl-starter-python/  # OpenAI Agents HITL（Python）
├── claude-agent-resume-starter-node/   # Claude 会话恢复（Node）
├── claude-agent-resume-starter-python/ # Claude 会话恢复（Python）
└── README.md
```

## License

MIT.
