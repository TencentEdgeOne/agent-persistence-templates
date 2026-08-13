/**
 * Claude session binding probe — EdgeOne Makers
 * ===============================================
 *
 * File path agents/session_state/index.ts maps to POST /session_state.
 * This route exists only to verify runtime session binding during development;
 * production chat requests should use agents/chat instead.
 */

function readSessionId(binding: unknown): string | null {
  if (typeof binding === 'string') return binding.trim() || null;
  if (!binding || typeof binding !== 'object') return null;

  const value = (binding as Record<string, unknown>).sessionId
    ?? (binding as Record<string, unknown>).session_id
    ?? (binding as Record<string, unknown>).id;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function onRequest(context: any): Promise<Response> {
  const body = context.request?.body ?? {};
  const requestedId = context.conversation_id
    ?? body.conversation_id
    ?? body.conversationId;
  const conversationId = typeof requestedId === 'string' ? requestedId.trim() : '';
  const store = context.store ?? context.agent?.store;
  const bindingAvailable = typeof store?.claudeSessionBinding === 'function';
  const sessionStoreAvailable = typeof store?.claudeSessionStore === 'function';

  if (!conversationId) {
    return new Response(JSON.stringify({
      probeOnly: true,
      error: 'conversation_id is required',
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    });
  }

  let sessionId: string | null = null;
  let error: string | undefined;
  if (bindingAvailable) {
    try {
      sessionId = readSessionId(await store.claudeSessionBinding(conversationId));
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  return new Response(JSON.stringify({
    probeOnly: true,
    conversationId,
    bindingAvailable,
    sessionStoreAvailable,
    sessionId,
    ...(error ? { error } : {}),
  }), {
    status: error ? 500 : 200,
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
  });
}
