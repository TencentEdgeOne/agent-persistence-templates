# Claude Resume/Transcript Starter

A standalone EdgeOne Makers template for Claude Agent SDK chat with durable transcript storage and resume across agent process restarts. This directory is the Resume/Transcript variant of the Claude starter; the canonical `claude-agent-starter-node` template is not modified.

**Framework:** Claude Agent SDK · **Category:** Resume/Transcript · **Language:** TypeScript

[![Deploy to EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/makers/new?template=claude-agent-resume-starter-node&from=within&fromAgent=1&agentLang=typescript)

## Overview

This template demonstrates the complete Claude session lifecycle:

- **SSE streaming chat** — token-by-token `text_delta` events and `tool_called` events for EdgeOne sandbox tools.
- **Runtime-backed session binding** — `context.store.claudeSessionBinding(conversationId)` maps any Conversation ID to a stable Claude session ID on updated runtimes. The returned ID is passed to Claude Agent SDK `getSessionInfo` and `resume`/`sessionId` options.
- **Resume after process restart** — the same Conversation resumes its Claude transcript even when the agent process is replaced or restarted, provided the runtime SessionStore is available.
- **SessionStore persistence and cleanup** — Claude transcript data lives in the runtime SessionStore; the regular message mirror in `store.appendMessage()` supports history, clear, and delete flows. The runtime owns SessionStore lifecycle, while the app-level cleanup APIs remove mirrored messages and conversation metadata when a conversation is no longer needed.
- **Explicit legacy fallback** — runtimes without `claudeSessionBinding` retain the older UUID-only mapping. Arbitrary Conversation IDs require the updated runtime binding API.
- **Probe route** — `POST /session_state` reports binding capabilities for testing only. It is not a production session API; production chat uses `POST /chat`.

The frontend keeps the same Conversation ID in browser storage, so refreshing the page or restarting the agent process can continue the same transcript. Conversation IDs may be arbitrary strings when using an updated EdgeOne Makers runtime.

## The page

The frontend is a purpose-built session-resume workbench, not a generic chat starter:

- **Session state rail** — shows the active Conversation ID, the runtime-bound Claude session ID, whether the runtime binding and SessionStore are available, and a refresh button that calls the `/session_state` probe.
- **Restart-proof guide** — a fixed four-step checklist for the real test: send a marker message, stop the dev process, restart it, and verify the agent remembers the marker from the persisted transcript.
- **Minimal chat stream** — the center pane is a plain message log with a composer; `POST /chat` still streams over SSE.

The transcript lives in the runtime SessionStore — the page holds no copy of it, so what you see after a restart is genuinely reloaded state.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AI_GATEWAY_API_KEY` | Yes | Model gateway API key. Use your Makers Models API Key, or any OpenAI-compatible provider key. |
| `AI_GATEWAY_BASE_URL` | Yes | Gateway base URL. For Makers Models, use `https://ai-gateway.edgeone.link/v1`. |
| `AI_GATEWAY_MODEL` | No | Model ID. Defaults to `@makers/deepseek-v4-flash` (a free built-in model). |
| `WSA_API_KEY` | No | Tencent Cloud Web Search API key. Required only if you use the web-search tool. |

This template follows the OpenAI-compatible standard — point these at Makers Models or any compatible provider.

### Provider fallbacks

`agents/_model.ts` also reads `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, and `ANTHROPIC_CUSTOM_HEADERS` for direct Anthropic API access. Gateway variables take precedence when both are present. Set `CLAUDE_MODEL` (or `AI_GATEWAY_MODEL`) to override the default model, and `ANTHROPIC_SMALL_FAST_MODEL` (or `AI_GATEWAY_SMALL_MODEL`) to override the SDK's small internal model.

## Local Development

Prerequisites: Node.js ≥ 18 and the EdgeOne CLI (`npm i -g edgeone`).

```bash
npm install
cp .env.example .env       # then fill in AI_GATEWAY_API_KEY / AI_GATEWAY_BASE_URL
edgeone makers dev
```

Local agent metrics and traces are exposed at `http://localhost:8080/agent-metrics`.

To verify the runtime mapping for an arbitrary Conversation ID, send a request to the probe route while the local agent is running:

```bash
curl -X POST http://localhost:8080/session_state \
  -H 'Content-Type: application/json' \
  -d '{"conversation_id":"demo-after-restart"}'
```

The probe is diagnostic only. Do not use its response as a production session-management API.

## Project Structure

```text
claude-agent-resume-starter-node/
├── agents/                          # Stateful EdgeOne Makers Agent Functions (Node/TS)
│   ├── chat/index.ts               # POST /chat — streaming chat and transcript resume
│   ├── session_state/index.ts      # POST /session_state — test/probe route only
│   ├── stop/index.ts               # POST /stop — abort active agent run
│   ├── _model.ts                   # Model and gateway environment config (private)
│   └── _logger.ts                  # Logger utility (private)
├── cloud-functions/                 # Stateless history/list/cleanup functions
│   ├── history/index.ts            # POST /history — load conversation messages
│   ├── conversations/index.ts      # POST /conversations — list conversations
│   ├── clear-history/index.ts      # POST /clear-history — clear one conversation
│   └── delete-conversation/index.ts # POST /delete-conversation — delete conversation and cleanup
├── src/                             # React + Vite + TypeScript frontend
│   ├── App.tsx                     # Conversation ID and SSE stream orchestration
│   ├── api.ts                      # Chat, stop, history, and cleanup wrappers
│   └── components/                 # Chat UI components
├── package.json                     # Dependencies and build/typecheck scripts
├── edgeone.json                     # EdgeOne deployment and agent runtime config
└── tsconfig.json
```

Files prefixed with `_` are private modules and are not exposed as public routes.

## Resources

- [EdgeOne Makers Agents — Documentation](https://pages.edgeone.ai/document/agents)
- [EdgeOne Makers — Quick Start](https://pages.edgeone.ai/document/agents-quick-start)
- [Makers Models](https://pages.edgeone.ai/document/models)

## License

MIT.
