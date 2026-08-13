# OpenAI Agents HITL Starter

一个可独立使用的 EdgeOne Makers 模板，基于 OpenAI Agents SDK（TypeScript）演示人工介入（Human-in-the-loop）：持久化 `RunState`、审批工具调用，并集成 React 前端面板。

**Framework：** OpenAI Agents SDK · **Category：** Human in the loop · **Language：** TypeScript

[![Deploy to EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?template=openai-agents-hitl-starter-node)

## 模板能力

- **持久化审批** —— 工具需要审批时，`POST /hitl` 将序列化后的 `RunState` 保存到 `context.store.state`。
- **批准或拒绝** —— 使用 `RunState.fromString` 恢复同一次运行并继续执行；运行完成后删除保存的状态。
- **状态仅保存在服务端** —— 浏览器只发送消息或审批决定，不会收到序列化运行状态。
- **集成 HITL 面板** —— 前端展示待审批的工具调用、输出和可操作的错误信息。
- **普通聊天仍可用** —— `POST /chat` 保留原有 SSE 流式聊天能力。

示例中的 `send_email` 工具始终需要人工审批。它是安全的演示动作，可替换成你的真实副作用操作。

## 路由

| 路由 | 方法 | 用途 |
|---|---|---|
| `/chat` | POST | 普通 SSE 流式聊天，带会话记忆和示例工具。 |
| `/hitl` | POST | 启动 Agent 请求或恢复待审批的运行。 |
| `/stop` | POST | 停止普通聊天运行。 |
| `/history` | POST | 读取普通聊天历史。 |

调用 HITL 时必须携带 `makers-conversation-id` 请求头。启动请求示例：`{ "message": "给 alice@example.com 发邮件" }`。需要审批时，响应只包含工具名和参数摘要，不包含序列化状态。继续运行时发送 `{ "action": "approve", "approvalIndex": 0 }` 或 `{ "action": "reject", "approvalIndex": 0 }`。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `AI_GATEWAY_API_KEY` | 是 | 模型网关 API Key，例如 Makers Models API Key。 |
| `AI_GATEWAY_BASE_URL` | 是 | OpenAI 兼容网关地址，例如 `https://ai-gateway.edgeone.link/v1`。 |
| `AI_GATEWAY_MODEL` | 否 | 模型 ID，默认 `@makers/deepseek-v4-flash`。 |

## 本地开发

前置依赖：Node.js ≥ 18，已安装 EdgeOne CLI（`npm i -g edgeone`）。

```bash
npm install
cp .env.example .env
edgeone makers dev
```

打开前端并选择 **HITL** 面板。Agent 本地指标和追踪信息位于 `http://localhost:8080/agent-metrics`。

## 项目结构

```text
openai-agents-hitl-starter-node/
├── agents/
│   ├── chat/index.ts       # POST /chat —— 普通流式聊天
│   ├── hitl/index.ts       # POST /hitl —— 审批与 RunState 持久化
│   ├── stop/index.ts       # POST /stop
│   ├── _sse.ts             # SSE 工具
│   └── _tools.ts           # 普通聊天工具
├── cloud-functions/        # 无状态的历史/会话函数
├── src/
│   ├── App.tsx             # 聊天应用与 HITL 面板集成
│   ├── api.ts              # /chat 与 /hitl 请求封装
│   └── components/HitlPanel.tsx
├── package.json
└── edgeone.json
```

## 资源

- [EdgeOne Makers Agents 文档](https://pages.edgeone.ai/document/agents)
- [OpenAI Agents SDK 人工介入指南](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/)
- [Makers Models](https://pages.edgeone.ai/document/models)

## License

MIT.
