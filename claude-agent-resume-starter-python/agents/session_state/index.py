"""
Claude session binding probe — EdgeOne Makers

File path agents/session_state/index.py maps to POST /session_state.
This route is diagnostic only: use it to verify runtime session binding during
local development. Production chat requests must use POST /chat.
"""

from __future__ import annotations

from typing import Any



def _read_session_id(binding: Any) -> str | None:
    if isinstance(binding, str):
        return binding.strip() or None
    if isinstance(binding, dict):
        value = binding.get("session_id") or binding.get("sessionId") or binding.get("id")
        return str(value).strip() if value else None
    for name in ("session_id", "sessionId", "id"):
        value = getattr(binding, name, None)
        if value:
            return str(value).strip()
    return None


async def handler(context: Any) -> dict:
    """Report runtime binding capabilities for development diagnostics only."""
    body = context.request.body if getattr(context, "request", None) else {}
    body = body if isinstance(body, dict) else {}
    requested_id = (
        getattr(context, "conversation_id", None)
        or body.get("conversation_id")
        or body.get("conversationId")
    )
    conversation_id = str(requested_id or "").strip()
    store = getattr(context, "store", None)
    binding_method = getattr(store, "claude_session_binding", None)
    session_store_method = getattr(store, "claude_session_store", None)

    if not conversation_id:
        return {
            "probeOnly": True,
            "error": "conversation_id is required",
        }

    session_id = None
    error = None
    if callable(binding_method):
        try:
            session_id = _read_session_id(await binding_method(conversation_id))
        except Exception as cause:  # noqa: BLE001
            error = str(cause)

    result = {
        "probeOnly": True,
        "conversationId": conversation_id,
        "bindingAvailable": callable(binding_method),
        "sessionStoreAvailable": callable(session_store_method),
        "sessionId": session_id,
    }
    if error:
        result["error"] = error
    return result
