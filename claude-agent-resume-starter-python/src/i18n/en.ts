const en = {
  "app.wordmark": "claude/resume",
  "app.title": "Session resume workbench",
  "app.subtitle": "Claude Agent SDK on EdgeOne Makers · transcript persists, not the process",

  "rail.title": "session state",
  "rail.conversation": "conversation",
  "rail.sessionId": "session id",
  "rail.binding": "runtime binding",
  "rail.store": "session store",
  "rail.exists": "transcript",
  "rail.yes": "yes",
  "rail.no": "no",
  "rail.none": "—",
  "rail.newConversation": "new conversation",
  "rail.refresh": "refresh probe",

  "guide.title": "restart-proof test",
  "guide.step1": "send a message with a marker the model repeats back",
  "guide.step2": "stop the dev process (Ctrl-C)",
  "guide.step3": "restart edgeone makers dev and come back",
  "guide.step4": "ask about the marker — the agent must remember it from the persisted transcript, not this page",

  "chat.title": "conversation",
  "chat.placeholder": "say something worth remembering…",
  "chat.send": "send",
  "chat.stop": "stop",
  "chat.empty": "no messages yet — the transcript below is what survives a restart",
  "chat.tool": "tool",

  "error.title": "request failed",
  "common.loading": "working…",
  "common.lang": "中文",
} as const;

export default en;
