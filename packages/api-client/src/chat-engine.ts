import type { components } from './schema.generated';

export type ChatMessage = components['schemas']['ChatMessageResponseDto'];
export type ChatConversation = components['schemas']['ChatConversationResponseDto'];
export type ChatState = 'connected' | 'reconnecting' | 'offline' | 'read-only' | 'recovery-failed';
export type ChatAccess = components['schemas']['ChatAccessResponseDto'];
export const maxChatAttachment = 20 * 1024 * 1024;
export const chatMediaExtensions = ".jpg,.jpeg,.png,.mp4";
export const chatDocumentExtensions = ".pdf,.docx";
export type PreviousChat = components['schemas']['PreviousChatDto'];
export type ChatCall = components['schemas']['ChatCallDto'];
type ChatReason = components['schemas']['CreateChatReportDto']['reasonCategory'];
export const chatReportReasons: Record<ChatReason, string> = {
  ABUSE_OR_HARASSMENT: 'توهین یا آزار',
  THREAT_OR_SAFETY: 'تهدید یا نگرانی ایمنی',
  SENSITIVE_DATA_EXPOSURE: 'افشای اطلاعات حساس',
  SPAM_OR_SCAM: 'هرزنامه یا کلاهبرداری',
  MALICIOUS_CONTENT: 'محتوای مخرب',
  OTHER: 'سایر',
};
type History = components['schemas']['ChatHistoryResponseDto'];
type Visibility = components['schemas']['ChatVisibilityReconciliationResponseDto'];
export interface LoadedChat { conversation: ChatConversation; messages: ChatMessage[]; olderCursor: string | null; checkpointCursor: string }
export interface ChatConnection {
  disconnect(): void;
  send(body: string, clientMessageId: string): Promise<ChatMessage>;
}

export function reconcileChatMessages(messages: ChatMessage[], next: ChatMessage): ChatMessage[] {
  return [...messages.filter(message => message.id !== next.id), next]
    .sort((a, b) => BigInt(a.sequence) < BigInt(b.sequence) ? -1 : BigInt(a.sequence) > BigInt(b.sequence) ? 1 : 0);
}

/** Shared patient/dashboard transport. Credentials and drafts never leave memory. */
export function createChatEngine(baseUrl: string, fetchImpl: typeof fetch) {
  async function request<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method, headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
      cache: 'no-store', signal: AbortSignal.timeout(10_000), ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.code ?? `CHAT_REQUEST_${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }
  const history = (token: string, id: string, direction: 'after' | 'before' | 'latest', cursor?: string) =>
    request<History>(token, `/v1/chat/conversations/${encodeURIComponent(id)}/messages?limit=50&direction=${direction}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);

  async function load(token: string, appointmentId: string): Promise<LoadedChat> {
    const conversation = await request<ChatConversation>(token, `/v1/chat/appointments/${encodeURIComponent(appointmentId)}/conversation`);
    const page = await history(token, conversation.id, 'latest');
    return { conversation, messages: page.items, olderCursor: typeof page.nextCursor === 'string' ? page.nextCursor : null, checkpointCursor: page.checkpointCursor };
  }
  async function older(token: string, id: string, cursor: string) {
    return history(token, id, 'before', cursor);
  }

  function connect(token: string, loaded: LoadedChat, onMessage: (message: ChatMessage) => void, onState: (state: ChatState, access?: ChatAccess) => void): ChatConnection {
    const events = new AbortController();
    const path = `/v1/chat/conversations/${loaded.conversation.id}`;
    let checkpoint = loaded.checkpointCursor;
    let visibilityCursor: string | undefined;
    let acknowledged: string | undefined;
    let latest = loaded.messages.at(-1);
    let recovering = false;
    let pending = false;

    async function refresh() {
      if (events.signal.aborted) return;
      if (recovering) { pending = true; return; }
      recovering = true;
      try {
        do {
          pending = false;
          const access = await request<ChatAccess>(token, `${path}/access`);
          let page: History;
          do {
            page = await history(token, loaded.conversation.id, 'after', checkpoint);
            if (events.signal.aborted) return;
            page.items.forEach(onMessage);
            latest = page.items.at(-1) ?? latest;
            checkpoint = page.checkpointCursor;
          } while (page.nextCursor);
          let changes: Visibility;
          do {
            changes = await request<Visibility>(token, `${path}/visibility-reconciliation?limit=100${visibilityCursor ? `&cursor=${encodeURIComponent(visibilityCursor)}` : ''}`);
            if (events.signal.aborted) return;
            changes.items.forEach(item => onMessage(item.message));
            visibilityCursor = changes.checkpointCursor ?? visibilityCursor;
          } while (changes.nextCursor);
          const last = latest;
          if (last && last.id !== acknowledged && access.canSend && document.visibilityState === 'visible') {
            acknowledged = last.id;
            void request<void>(token, `${path}/receipts/${last.id}`, 'POST').catch(() => { acknowledged = undefined; });
          }
          onState(access.canSend ? 'connected' : 'read-only', access);
        } while (pending && !events.signal.aborted);
      } catch {
        if (!events.signal.aborted) onState('recovery-failed');
      } finally { recovering = false; }
    }

    async function stream() {
      try {
        const response = await fetchImpl(`${baseUrl}${path}/events`, {
          headers: { authorization: `Bearer ${token}` }, signal: events.signal, cache: 'no-store',
        });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        try {
          while (!(await reader.read()).done) void refresh();
        } finally { reader.releaseLock(); }
      } catch { /* Periodic reconciliation supports clients with buffered streaming. */ }
    }
    const timer = setInterval(() => void refresh(), 5_000);
    const visible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', visible);
    onState('reconnecting');
    void refresh();
    void stream();
    return {
      send: (body, clientMessageId) => request<ChatMessage>(token, `${path}/messages`, 'POST', { body, clientMessageId }),
      disconnect() { events.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); },
    };
  }

  const close = (token: string, conversationId: string) => request<ChatConversation>(token, `/v1/chat/conversations/${encodeURIComponent(conversationId)}/close`, 'POST');
  async function upload(token: string, conversationId: string, file: File, clientMessageId: string) {
    const form = new FormData();
    form.append('file', file);
    const response = await fetchImpl(`${baseUrl}/v1/chat/conversations/${conversationId}/attachments/${clientMessageId}`, {
      method: 'POST', headers: { authorization: `Bearer ${token}` }, cache: 'no-store', body: form, signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw new Error(`CHAT_REQUEST_${response.status}`);
    return response.json() as Promise<ChatMessage>;
  }
  async function attachmentBlob(token: string, conversationId: string, messageId: string, signal?: AbortSignal) {
    const response = await fetchImpl(`${baseUrl}/v1/chat/conversations/${conversationId}/attachments/${messageId}`, {
      headers: { authorization: `Bearer ${token}` }, cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30_000)]) : AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`CHAT_REQUEST_${response.status}`);
    return response.blob();
  }
  async function download(token: string, conversationId: string, message: ChatMessage) {
    if (!message.attachment) return;
    const url = URL.createObjectURL(await attachmentBlob(token, conversationId, message.id));
    const link = document.createElement('a');
    link.href = url;
    link.download = message.attachment.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
  return {
    load, older, connect, close, upload, download, attachmentBlob,
    previousConversations: (token: string, appointmentId: string, before?: string) =>
      request<components['schemas']['PreviousChatPageDto']>(token, `/v1/chat/appointments/${encodeURIComponent(appointmentId)}/previous-conversations${before ? '?before=' + encodeURIComponent(before) : ''}`),
    archivedMessages: (token: string, conversationId: string) => history(token, conversationId, 'latest'),
    video: (token: string) => request<{ available: boolean }>(token, '/v1/chat/video'),
    incoming: (token: string) => request<{ call: ChatCall | null }>(token, '/v1/chat/calls/incoming'),
    startCall: (token: string, appointmentId: string, mode: ChatCall['mode'] = 'VIDEO') =>
      request<ChatCall>(token, `/v1/chat/appointments/${appointmentId}/calls`, 'POST', { mode }),
    currentCall: (token: string, appointmentId: string) =>
      request<{ call: ChatCall | null }>(token, `/v1/chat/appointments/${appointmentId}/calls/current`),
    historyCall: (token: string, conversationId: string, id: string) =>
      request<ChatCall>(token, `/v1/chat/conversations/${conversationId}/calls/${id}`),
    call: (token: string, id: string) => request<ChatCall>(token, `/v1/chat/calls/${id}`),
    callAction: (token: string, id: string, action: 'answer' | 'decline' | 'end') => request<ChatCall>(token, `/v1/chat/calls/${id}/action`, 'POST', { action }),
    callGrant: (token: string, id: string) => request<{ url: string }>(token, `/v1/chat/calls/${id}/grant`, 'POST'),
    report: (token: string, id: string, reasonCategory: ChatReason) =>
      request(token, `/v1/chat/messages/${id}/reports`, 'POST', { reasonCategory }),
    reports: (token: string, id: string) =>
      request<{ items: { id: string; messageId: string; reasonCategory: ChatReason; decision: object | null }[] }>(token, `/v1/chat/conversations/${id}/reports`),
    moderation: (token: string, id: string, visibility: 'RESTRICTED' | 'VISIBLE', reasonCategory?: ChatReason, safeNote?: string) =>
      request<ChatMessage>(token, `/v1/chat/messages/${id}/visibility`, 'POST', { visibility, reasonCategory, safeNote }),
    restrictedContent: (token: string, id: string) =>
      request<{ body: string }>(token, `/v1/chat/messages/${id}/restricted-content`),
    resolveReport: (token: string, id: string, restriction: boolean) =>
      request(token, `/v1/chat/reports/${id}/resolve`, 'POST', restriction
        ? { resolution: 'UPHELD_POLICY_VIOLATION', action: 'RESTRICT_MESSAGE' }
        : { resolution: 'DISMISSED_NO_VIOLATION', action: 'NO_ADDITIONAL_ACTION' }),
  };
}

export function chatAccessLabel(access: ChatAccess | null | undefined) {
  if (!access || access.canSend) return null;
  if (access.closedAt) return 'این گفتگو توسط پزشک یا کلینیک بسته شده است؛ سابقهٔ پیام‌ها محفوظ است.';
  if (access.readOnlyReason === 'CHAT_BLOCKED') return 'ارسال پیام در این گفتگو محدود شده است.';
  if (access.readOnlyReason === 'CHAT_APPOINTMENT_NOT_ELIGIBLE') return 'پس از تأیید نوبت، گفتگو آماده می‌شود.';
  if (Date.parse(access.opensAt) > Date.now()) return 'گفتگو ۱۵ دقیقه پیش از شروع نوبت آماده می‌شود: ' + new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(access.opensAt));
  return 'این نوبت برای ارسال پیام فعال نیست؛ وضعیت نوبت را بررسی کنید.';
}
