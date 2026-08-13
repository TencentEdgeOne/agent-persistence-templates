const zh = {
  "app.wordmark": "claude/resume",
  "app.title": "会话恢复工作台",
  "app.subtitle": "EdgeOne Makers 上的 Claude Agent SDK · 持久化的是 Transcript，不是进程",

  "rail.title": "会话状态",
  "rail.conversation": "会话",
  "rail.sessionId": "session id",
  "rail.binding": "运行时绑定",
  "rail.store": "session store",
  "rail.exists": "transcript",
  "rail.yes": "存在",
  "rail.no": "不存在",
  "rail.none": "—",
  "rail.newConversation": "新会话",
  "rail.refresh": "刷新探针",

  "guide.title": "重启不丢验证",
  "guide.step1": "发一条包含标记信息的消息，让模型复述一遍",
  "guide.step2": "停止 dev 进程（Ctrl-C）",
  "guide.step3": "重新运行 edgeone makers dev 并回到本页",
  "guide.step4": "询问标记内容——Agent 必须从持久化的 Transcript 记起它，而不是靠本页面",

  "chat.title": "对话",
  "chat.placeholder": "说点值得记住的内容…",
  "chat.send": "发送",
  "chat.stop": "停止",
  "chat.empty": "暂无消息——下方记录才是重启后仍然存在的部分",
  "chat.tool": "工具",

  "error.title": "请求失败",
  "common.loading": "处理中…",
  "common.lang": "English",
} as const;

export default zh;
