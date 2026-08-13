# Agent Persistence Templates

**Language:** English | [简体中文](./README_zh-CN.md)

Standalone EdgeOne Makers agent templates demonstrating **cross-process persistence**: agent state, human-in-the-loop approvals, and session transcripts survive process restarts because the runtime stores them in the platform's Blob-backed `context.store`, not in process memory.

## Templates

| Directory | Framework | Runtime | Capability demonstrated |
|---|---|---|---|
| `openai-agents-hitl-starter-node/` | OpenAI Agents SDK | Node.js / TypeScript | **HITL approval** — `needsApproval` tool pauses a run; the serialized `RunState` is persisted via `context.store.state`, then approved/rejected from a later request |
| `openai-agents-hitl-starter-python/` | OpenAI Agents SDK | Python | Same HITL / `RunState` flow, Python runtime |
| `claude-agent-resume-starter-node/` | Claude Agent SDK | Node.js / TypeScript | **Session resume** — `context.store.claudeSessionBinding()` maps any conversation ID to a stable Claude session UUID; the transcript survives a process restart and resumes via `resume` |
| `claude-agent-resume-starter-python/` | Claude Agent SDK | Python | Same session binding / resume flow, Python runtime |

Each directory is a complete deployable template (agents + cloud-functions + frontend + `edgeone.json`). See each template's `README.md` for details.

## Platform capabilities used

- **`context.store.state`** — conversation-scoped persistent KV (`get/set/delete`); values are strict JSON, isolated per `conversation_id`.
- **`context.store.claudeSessionBinding(conversationId)`** / `claude_session_binding()` — stable Claude session UUID for arbitrary conversation IDs, persisted across process restarts.
- **LangGraph checkpointer / `deleteThread`** — checkpoint persistence keyed by `thread_id = conversation_id`, with cascade cleanup on `deleteConversation`.
- **`MemoryCorruptError`** — corrupt checkpoint / session JSONL surfaces as an explicit error instead of being silently treated as missing.

> ⚠️ These capabilities require an updated EdgeOne Makers runtime/CLI (post-2026-08). If a deployed template reports `HITL_STATE_STORE_UNAVAILABLE` or missing `claudeSessionBinding`, upgrade the CLI before deploying.

## Requirements

- Node.js ≥ 18 (Node templates) / Python 3.10+ (Python templates)
- EdgeOne CLI: `npm i -g @tencent/edgeone` (or `edgeone`)
- An EdgeOne Makers account: [China site](https://console.cloud.tencent.com/edgeone/pages) | [Global site](https://pages.edgeone.ai)

## Quick start (any template)

```bash
cd openai-agents-hitl-starter-node    # or any of the four

npm install                            # Node templates; Python: pip install -r agents/requirements.txt
cp .env.example .env                   # fill AI_GATEWAY_API_KEY / AI_GATEWAY_BASE_URL
edgeone makers dev
```

Open `http://localhost:8080/` (Node) — the frontend keeps a stable `makers-conversation-id` in browser storage.

### Verify persistence across a process restart

1. Start the dev server and send a message (HITL: request an action that needs approval; Claude: send a marker message).
2. Stop the dev process (Ctrl-C).
3. Restart `edgeone makers dev`.
4. Continue the same conversation:
   - **HITL**: the pending approval is restored from `context.store.state`; approve/reject resumes the run.
   - **Claude**: the agent still remembers the conversation (transcript resumed via `claudeSessionBinding`), and the page reloads history from `/history`.

## Project structure

```text
agent-persistence-templates/
├── openai-agents-hitl-starter-node/    # OpenAI Agents HITL (Node)
├── openai-agents-hitl-starter-python/  # OpenAI Agents HITL (Python)
├── claude-agent-resume-starter-node/   # Claude session resume (Node)
├── claude-agent-resume-starter-python/ # Claude session resume (Python)
├── README.md                           # English
└── README_zh-CN.md                     # 中文
```

## License

MIT.
