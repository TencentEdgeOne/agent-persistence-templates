/**
 * Backend API — EdgeOne Makers, Claude resume demo.
 * The page uses three routes:
 *   POST /chat          — SSE chat stream (text_delta / tool_called / done / error)
 *   POST /session_state — dev probe: does this conversation have a persisted session?
 *   POST /stop          — abort an active run
 */

import type { SessionStateResponse } from './types';

export interface StreamCallbacks {
  onTextDelta: (delta: string) => void;
  onToolCalled: (toolName: string) => void;
  onDone: () => void;
  onError: (err: Error) => void;
}

export function sendChatStream(
  message: string,
  conversationId: string,
  callbacks: StreamCallbacks,
): AbortController {
  const ctrl = new AbortController();

  (async () => {
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'makers-conversation-id': conversationId,
        },
        body: JSON.stringify({ message }),
        signal: ctrl.signal,
      });

      if (!res.ok) {
        callbacks.onError(new Error(`HTTP ${res.status}: ${await res.text().catch(() => '')}`));
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        callbacks.onError(new Error('ReadableStream not supported'));
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let doneReceived = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (!part.trim()) continue;
          dispatchSse(part, callbacks, () => { doneReceived = true; });
        }
      }
      if (!doneReceived) callbacks.onDone();
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
    }
  })();

  return ctrl;
}

function dispatchSse(part: string, cb: StreamCallbacks, markDone: () => void): void {
  let eventType = '';
  let data = '';
  for (const line of part.split('\n')) {
    if (line.startsWith('event: ')) eventType = line.slice(7);
    else if (line.startsWith('data: ')) data = line.slice(6);
  }
  if (!eventType || !data) return;
  try {
    const parsed = JSON.parse(data);
    if (eventType === 'text_delta') cb.onTextDelta(parsed.delta ?? '');
    else if (eventType === 'tool_called' && parsed.tool) cb.onToolCalled(parsed.tool);
    else if (eventType === 'error') cb.onError(new Error(parsed.message || 'agent error'));
    else if (eventType === 'done') { markDone(); cb.onDone(); }
  } catch {
    // ignore unparseable frames
  }
}

export async function fetchSessionState(conversationId: string): Promise<SessionStateResponse> {
  const res = await fetch('/session_state', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'makers-conversation-id': conversationId,
    },
    body: JSON.stringify({}),
  });
  return (await res.json()) as SessionStateResponse;
}

export interface HistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

/** Restore the chat window from persisted conversation history after a page refresh. */
export async function fetchHistory(
  conversationId: string,
): Promise<{ conversation_id: string; messages: HistoryMessage[] }> {
  const res = await fetch('/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'makers-conversation-id': conversationId,
    },
    body: JSON.stringify({ conversation_id: conversationId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as { conversation_id: string; messages: HistoryMessage[] };
}

export async function stopAgent(conversationId: string): Promise<void> {
  try {
    await fetch('/stop', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'makers-conversation-id': conversationId,
      },
      body: JSON.stringify({ conversation_id: conversationId }),
    });
  } catch {
    // best-effort stop
  }
}
