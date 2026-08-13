# Claude Resume/Transcript Starter (Python)

A standalone EdgeOne Makers template for Claude Agent SDK (Python) chat with durable transcript storage and resume across agent process restarts. This is the Resume/Transcript variant of the Claude Python starter; the canonical `claude-agent-starter-python` directory is not modified.

**Framework:** Claude Agent SDK · **Category:** Resume/Transcript · **Language:** Python

[![Deploy to EdgeOne Makers](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/makers/new?template=claude-agent-resume-starter-python&from=within&fromAgent=1&agentLang=python)

## Overview

This template demonstrates the complete Claude session lifecycle:

- **SSE streaming chat** — token-by-token `text_delta` events and `tool_called` events for EdgeOne sandbox tools.
- **Runtime-backed session binding** — `context.store.claude_session_binding(conversation_id)` maps any Conversation ID to a stable Claude session ID on updated runtimes. The ID is passed into `ClaudeAgentOptions` as `session_id` for a new transcript or `resume` for an existing transcript.
- **Resume after process restart** — the same Conversation resumes its Claude transcript after an agent process is replaced or restarted, provided the runtime `SessionStore` is available.
- **SessionStore persistence and cleanup** — `context.store.claude_session_store()` stores Claude transcript entries. The runtime owns SessionStore lifecycle; the app mirrors user and assistant messages with `store.append_message()` for history and replay, while clear-history and delete-conversation clean up the app-level mirror and conversation metadata.
- **Explicit legacy fallback** — runtimes without `claude_session_binding()` retain the older UUID-only mapping. Arbitrary Conversation IDs require the updated runtime binding API.
- **Probe route** — `POST /session_state` reports binding capabilities for testing only. It is diagnostic, not a production session-management API; production chat uses `POST /chat`.

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

`agents/_model.py` also reads `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL`, and `ANTHROPIC_CUSTOM_HEADERS` for direct Anthropic API access. Gateway variables take precedence when both are present. Set `AI_GATEWAY_SMALL_MODEL` (or `ANTHROPIC_SMALL_FAST_MODEL`) to override the SDK's small internal model.

## Local Development

Prerequisites: Node.js ≥ 18, Python ≥ 3.10, and the EdgeOne CLI (`npm i -g edgeone`).

```bash
npm install
pip install -r agents/requirements.txt
cp .env.example .env       # then fill in AI_GATEWAY_API_KEY / AI_GATEWAY_BASE_URL
edgeone makers dev
```

Local agent metrics and traces are exposed at `http://localhost:8080/agent-metrics`.

To verify runtime mapping for an arbitrary Conversation ID, send a request to the probe route while the local agent is running:

```bash
curl -X POST http://localhost:8080/session_state \
  -H 'Content-Type: application/json' \
  -d '{"conversation_id":"demo-after-restart"}'
```

The probe is diagnostic only. Do not use its response as a production session-management API.

## Project Structure

```text
claude-agent-resume-starter-python/
├── agents/                          # Stateful EdgeOne Makers Agent Functions (Python)
│   ├── chat/index.py               # POST /chat — streaming chat and transcript resume
│   ├── session_state/index.py      # POST /session_state — test/probe route only
│   ├── stop/index.py               # POST /stop — abort active agent run
│   ├── _model.py                   # Model and gateway environment config (private)
│   ├── _logger.py                  # Logger utility (private)
│   ├── config.json                 # Route config
│   └── requirements.txt            # Python agent dependencies
├── cloud-functions/                 # Stateless history/list/cleanup functions
│   ├── history/index.py            # POST /history — load conversation messages
│   ├── conversations/index.py      # POST /conversations — list conversations
│   ├── clear-history/index.py      # POST /clear-history — clear mirrored messages
│   └── delete-conversation/index.py # POST /delete-conversation — delete conversation and cleanup
├── src/                             # React + Vite + TypeScript frontend
│   ├── App.tsx                     # Conversation ID and SSE stream orchestration
│   ├── api.ts                      # Chat, stop, history, and cleanup wrappers
│   └── components/                 # Chat UI components
├── package.json                     # Frontend dependencies and build scripts
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
