import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchHistory, fetchSessionState, sendChatStream, stopAgent } from './api';
import type { ChatMessage, SessionStateResponse } from './types';
import { I18nProvider, useT } from './i18n';

const CONVERSATION_ID_STORAGE_KEY = 'eo_resume_conversation_id';

function getOrCreateConversationId(): string {
  const cached = localStorage.getItem(CONVERSATION_ID_STORAGE_KEY);
  if (cached) return cached;
  const id = crypto.randomUUID();
  localStorage.setItem(CONVERSATION_ID_STORAGE_KEY, id);
  return id;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AppInner() {
  const { t, toggle } = useT();
  const [conversationId, setConversationId] = useState(getOrCreateConversationId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [toolNote, setToolNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionState, setSessionState] = useState<SessionStateResponse | null>(null);
  const [probeLoading, setProbeLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const refreshProbe = useCallback(async (cid: string) => {
    setProbeLoading(true);
    try {
      const state = await fetchSessionState(cid);
      setSessionState(state);
    } catch {
      setSessionState(null);
    } finally {
      setProbeLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshProbe(conversationId);
  }, [conversationId, refreshProbe]);

  // Restore persisted messages from /history on mount and when switching conversations.
  useEffect(() => {
    let cancelled = false;
    setHistoryLoading(true);
    setMessages([]);
    void fetchHistory(conversationId)
      .then(({ messages: history }) => {
        if (cancelled) return;
        setMessages(history.map(m => ({ id: m.id, role: m.role, content: m.content })));
      })
      .catch(() => {
        // No history available — keep the empty state.
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => { cancelled = true; };
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text || loading || historyLoading) return;
    setInput('');
    setError(null);
    setLoading(true);

    const userMsg: ChatMessage = { id: makeId('u'), role: 'user', content: text };
    const botMsg: ChatMessage = { id: makeId('a'), role: 'assistant', content: '', streaming: true };
    setMessages(prev => [...prev, userMsg, botMsg]);

    abortRef.current = sendChatStream(text, conversationId, {
      onTextDelta: delta => {
        setMessages(prev => prev.map(m => (m.id === botMsg.id ? { ...m, content: m.content + delta } : m)));
      },
      onToolCalled: tool => setToolNote(tool),
      onDone: () => {
        setLoading(false);
        setToolNote(null);
        setMessages(prev => prev.map(m => (m.id === botMsg.id ? { ...m, streaming: false } : m)));
        void refreshProbe(conversationId);
      },
      onError: err => {
        setLoading(false);
        setToolNote(null);
        setMessages(prev => prev.map(m => (m.id === botMsg.id ? { ...m, streaming: false } : m)));
        setError(err.message);
      },
    });
  }, [conversationId, input, loading, historyLoading, refreshProbe]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    void stopAgent(conversationId);
    setMessages(prev => prev.map(m => (m.streaming ? { ...m, streaming: false } : m)));
  }, [conversationId]);

  const handleNewConversation = useCallback(() => {
    if (loading) return;
    const id = crypto.randomUUID();
    localStorage.setItem(CONVERSATION_ID_STORAGE_KEY, id);
    setConversationId(id);
    setMessages([]);
    setError(null);
    setSessionState(null);
  }, [loading]);

  const yes = t('rail.yes');
  const no = t('rail.no');
  const none = t('rail.none');

  return (
    <div className="shell">
      <header className="topbar">
        <span className="wordmark">claude<span className="sep">/</span>resume</span>
        <div className="titleblock">
          <h1>{t('app.title')}</h1>
          <p>{t('app.subtitle')}</p>
        </div>
        <div className="topbar-right">
          <button type="button" className="link-btn" onClick={toggle}>
            {t('common.lang')}
          </button>
        </div>
      </header>

      <main className="workbench">
        <aside className="rail">
          <div className="rail-title">{t('rail.title')}</div>

          <div className="rail-card">
            <div className="rail-row">
              <span className="rail-key">{t('rail.conversation')}</span>
              <span className="rail-value">{conversationId}</span>
            </div>
            <div className="rail-row">
              <span className="rail-key">{t('rail.sessionId')}</span>
              <span className="rail-value">{sessionState?.sessionId ?? none}</span>
            </div>
            <div className="rail-row">
              <span className="rail-key">{t('rail.binding')}</span>
              <span className={`rail-value ${sessionState?.bindingAvailable ? 'is-good' : ''}`}>
                {sessionState ? (sessionState.bindingAvailable ? yes : no) : none}
              </span>
            </div>
            <div className="rail-row">
              <span className="rail-key">{t('rail.store')}</span>
              <span className={`rail-value ${sessionState?.sessionStoreAvailable ? 'is-good' : ''}`}>
                {sessionState ? (sessionState.sessionStoreAvailable ? yes : no) : none}
              </span>
            </div>
            <div className="rail-actions">
              <button type="button" onClick={() => void refreshProbe(conversationId)} disabled={probeLoading}>
                {probeLoading ? t('common.loading') : t('rail.refresh')}
              </button>
              <button type="button" onClick={handleNewConversation} disabled={loading}>
                {t('rail.newConversation')}
              </button>
            </div>
          </div>

          <div className="guide">
            <div className="guide-title">{t('guide.title')}</div>
            {[1, 2, 3, 4].map(n => (
              <div className="guide-step" key={n}>
                <span className="num">0{n}</span>
                <span>{t(`guide.step${n}` as never)}</span>
              </div>
            ))}
          </div>
        </aside>

        <section className="stream">
          <div className="stream-title">{t('chat.title')}</div>

          <div className="messages" ref={scrollRef}>
            {messages.length === 0 && <div className="empty">{t('chat.empty')}</div>}
            {messages.map(msg => (
              <div className="msg" key={msg.id}>
                <span className={`msg-role${msg.role === 'user' ? ' is-user' : ''}`}>
                  {msg.role === 'user' ? 'you' : 'agent'}
                </span>
                <div className={`msg-body${msg.role === 'user' ? '' : ' markdown'}${msg.streaming ? ' streaming' : ''}`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content || ''}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {toolNote && <span className="tool-chip">{t('chat.tool')}: {toolNote}</span>}
          </div>

          {error && (
            <div className="error-strip" role="alert">
              <strong>{t('error.title')}</strong> — {error}
            </div>
          )}

          <div className="composer">
            <input
              type="text"
              value={input}
              placeholder={t('chat.placeholder')}
              disabled={loading}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
            />
            {loading ? (
              <button type="button" className="stop-btn" onClick={handleStop}>
                {t('chat.stop')}
              </button>
            ) : (
              <button type="button" className="send-btn" onClick={handleSend} disabled={!input.trim()}>
                {t('chat.send')}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppInner />
    </I18nProvider>
  );
}
