export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  streaming?: boolean;
}

export interface SessionStateResponse {
  probeOnly?: boolean;
  conversationId?: string;
  bindingAvailable?: boolean;
  sessionStoreAvailable?: boolean;
  sessionId?: string | null;
  error?: string;
}
