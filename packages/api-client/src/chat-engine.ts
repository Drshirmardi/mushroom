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
  renew(): void;
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

  function watchEvents(path: string, getToken: () => string, onData: (data: unknown) => void, onHealth: (healthy: boolean) => void) {
    let stopped = false;
    let attempt: AbortController | undefined;
    let retry: ReturnType<typeof setTimeout>;
    let delay = 1000;

    async function run() {
      const current = new AbortController();
      attempt = current;
      let healthy = false;
      let watchdog = setTimeout(() => current.abort(), 25_000);
      try {
        const response = await fetchImpl(`${baseUrl}${path}`, {
          headers: { authorization: `Bearer ${getToken()}` }, signal: current.signal, cache: 'no-store',
        });
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let pending = '';
        let data: string[] = [];
        try {
          while (!current.signal.aborted) {
            const result = await reader.read();
            if (result.done || current.signal.aborted) break;
            if (!result.value.length) continue;
            clearTimeout(watchdog);
            watchdog = setTimeout(() => current.abort(), 25_000);
            if (!healthy) {
              healthy = true;
              delay = 1000;
              onHealth(true);
            }
            pending += decoder.decode(result.value, { stream: true });
            let newline: number;
            while ((newline = pending.indexOf('\n')) >= 0) {
              const line = pending.slice(0, newline).replace(/\r$/, '');
              pending = pending.slice(newline + 1);
              if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
              if (line || !data.length) continue;
              const payload = data.join('\n');
              data = [];
              try { onData(JSON.parse(payload)); } catch { /* Ignore malformed events. */ }
            }
          }
        } finally {
          void reader.cancel().catch(() => {});
          reader.releaseLock();
        }
      } catch { /* Reconciliation continues while the stream reconnects. */ }
      finally {
        clearTimeout(watchdog);
        if (!stopped && attempt === current) {
          onHealth(false);
          retry = setTimeout(() => void run(), delay);
          delay = Math.min(delay * 2, 30_000);
        }
      }
    }

    void run();
    return {
      renew() { clearTimeout(retry); attempt?.abort(); void run(); },
      disconnect() { stopped = true; clearTimeout(retry); attempt?.abort(); },
    };
  }

  function connect(credential: string | (() => string), loaded: LoadedChat, onMessage: (message: ChatMessage) => void, onState: (state: ChatState, access?: ChatAccess) => void): ChatConnection {
    const getToken = typeof credential === 'string' ? () => credential : credential;
    const path = `/v1/chat/conversations/${loaded.conversation.id}`;
    let checkpoint = loaded.checkpointCursor;
    let visibilityCursor: string | undefined;
    let acknowledged: string | undefined;
    let latest = loaded.messages.at(-1);
    let recovering = false;
    let pending = false;
    let stopped = false;
    let healthy = false;
    let stream: ReturnType<typeof watchEvents> | undefined;
    let timer: ReturnType<typeof setTimeout>;
    const visible = () => !stopped && document.visibilityState === 'visible';
    const offline = () => navigator.onLine === false;

    function schedule() {
      clearTimeout(timer);
      if (visible()) timer = setTimeout(() => void refresh(), healthy ? 45_000 : 5000);
    }

    async function refresh() {
      if (!visible()) return;
      if (offline()) { onState('offline'); return; }
      if (recovering) { pending = true; return; }
      recovering = true;
      clearTimeout(timer);
      try {
        do {
          pending = false;
          let needMessages = true;
          let needVisibility = true;
          let access: ChatAccess;
          do {
            const query = new URLSearchParams({ messages: checkpoint });
            if (visibilityCursor) query.set('visibility', visibilityCursor);
            if (!needMessages) query.set('skip', 'messages');
            if (!needVisibility) query.set('skip', 'visibility');
            const sync = await request<components['schemas']['ChatSyncResponseDto']>(getToken(), `${path}/sync?${query}`);
            if (!visible()) return;
            access = sync.access;
            if (sync.messages) {
              sync.messages.items.forEach(onMessage);
              latest = sync.messages.items.at(-1) ?? latest;
              checkpoint = sync.messages.checkpointCursor;
            }
            if (sync.visibility) {
              sync.visibility.items.forEach(item => onMessage(item.message));
              visibilityCursor = sync.visibility.checkpointCursor ?? visibilityCursor;
            }
            needMessages = Boolean(sync.messages?.nextCursor);
            needVisibility = Boolean(sync.visibility?.nextCursor);
          } while (needMessages || needVisibility);
          if (latest && latest.id !== acknowledged && access.canSend) {
            acknowledged = latest.id;
            void request<void>(getToken(), `${path}/receipts/${latest.id}`, 'POST').catch(() => { acknowledged = undefined; });
          }
          onState(access.canSend ? 'connected' : 'read-only', access);
        } while (pending && visible());
      } catch {
        if (visible()) onState(offline() ? 'offline' : 'recovery-failed');
      } finally { recovering = false; schedule(); }
    }

    function onVisibility() {
      stream?.disconnect();
      stream = undefined;
      healthy = false;
      clearTimeout(timer);
      if (!visible()) return;
      if (offline()) { onState('offline'); return; }
      schedule();
      stream = watchEvents(path + '/events', getToken, data => {
        if ((data as { changed?: boolean } | null)?.changed === true) void refresh();
      }, next => {
        if (healthy === next) return;
        healthy = next;
        if (next) void refresh();
        else { onState(offline() ? 'offline' : 'reconnecting'); schedule(); }
      });
    }
    document.addEventListener('visibilitychange', onVisibility);
    if (typeof window !== 'undefined') {
      window.addEventListener('online', onVisibility);
      window.addEventListener('offline', onVisibility);
    }
    onState('reconnecting');
    onVisibility();
    return {
      send: (body, clientMessageId) => request<ChatMessage>(getToken(), `${path}/messages`, 'POST', { body, clientMessageId }),
      renew() {
        healthy = false;
        stream?.renew();
        schedule();
      },
      disconnect() {
        stopped = true;
        stream?.disconnect();
        clearTimeout(timer);
        document.removeEventListener('visibilitychange', onVisibility);
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', onVisibility);
          window.removeEventListener('offline', onVisibility);
        }
      },
    };
  }

  const streamedCalls = new Map<string, ChatCall>();

  function watchIncoming(getToken: () => string, sessionKey: string, onCall: (call: ChatCall | null) => void) {
    const path = '/v1/chat/calls/incoming';
    const stop = new AbortController();
    const channel = typeof BroadcastChannel === 'function' && navigator.locks
      ? new BroadcastChannel(`mushroom-incoming:${sessionKey}`) : undefined;
    const tabId = crypto.randomUUID();
    const visibleTabs = new Map<string, number>();
    let stream: ReturnType<typeof watchEvents> | undefined;
    let presenceId: string | undefined;
    let sentVisibility: boolean | undefined;
    let ringExpiry: ReturnType<typeof setTimeout>;
    let healthy = false;
    let timer: ReturnType<typeof setTimeout>;
    let latest: ChatCall | null | undefined;
    let polling = false;
    let streamToken: string | undefined;
    function trackCall(call: ChatCall | null) {
      if (streamToken) streamedCalls.delete(streamToken);
      streamToken = getToken();
      if (call) streamedCalls.set(streamToken, call);
    }
    const visible = () => document.visibilityState === 'visible';

    function updatePresence() {
      if (!presenceId || stop.signal.aborted) return;
      const now = Date.now();
      for (const [id, until] of visibleTabs) if (until <= now) visibleTabs.delete(id);
      const value = visible() || visibleTabs.size > 0;
      if (sentVisibility === value) return;
      sentVisibility = value;
      void request(getToken(), path + '/presence', 'POST', { id: presenceId, visible: value }).catch(() => {
        if (sentVisibility === value) sentVisibility = undefined;
      });
    }

    function receive(call: ChatCall | null) {
      const previous = latest;
      latest = call;
      trackCall(healthy ? call : null);
      clearTimeout(ringExpiry);
      if (call) {
        publishCall(getToken(), call);
        if (call.status === 'RINGING') ringExpiry = setTimeout(() => {
          void readCall(getToken(), call.id, `/v1/chat/calls/${call.id}`).then(next => {
            if (!stop.signal.aborted && latest === call && next.status !== 'RINGING') receive(next.status === 'ACTIVE' ? next : null);
          }).catch(() => {});
        }, Math.max(0, Date.parse(call.ringsUntil) - Date.now()) + 100);
      } else if (previous) {
        void readCall(getToken(), previous.id, `/v1/chat/calls/${previous.id}`, true).catch(() => {});
      }
      onCall(call);
      channel?.postMessage({ type: 'call', call, healthy });
    }

    function scheduleFallback() {
      clearTimeout(timer);
      if (!healthy && !stop.signal.aborted && stream && (visible() || visibleTabs.size || latest?.status === 'ACTIVE')) {
        timer = setTimeout(() => void poll(), 5000);
      }
    }

    async function poll() {
      if (healthy || polling || stop.signal.aborted || !stream) return;
      polling = true;
      try {
        const result = await request<{ call: ChatCall | null }>(getToken(), path + (visible() || visibleTabs.size ? "" : "?presence=false"));
        if (!healthy && !stop.signal.aborted) receive(result.call);
      } catch { /* Retry while the browser is available. */ }
      finally { polling = false; scheduleFallback(); }
    }

    function visibilityChanged() {
      channel?.postMessage({ type: 'visibility', tabId, visible: visible() });
      updatePresence();
      if (!healthy && (visible() || visibleTabs.size)) void poll();
      else scheduleFallback();
    }

    function lead() {
      stream = watchEvents(path + '/events', getToken, data => {
        const event = data as { presenceId?: string; call?: ChatCall | null };
        if (event?.presenceId) {
          presenceId = event.presenceId;
          sentVisibility = undefined;
          updatePresence();
        }
        if (event?.call !== undefined) receive(event.call);
      }, next => {
        if (healthy === next) return;
        healthy = next;
        if (!next) {
          presenceId = undefined;
          trackCall(null);
          channel?.postMessage({ type: 'unhealthy' });
        }
        scheduleFallback();
      });
      channel?.postMessage({ type: 'visibility-request' });
      scheduleFallback();
    }

    if (channel) {
      channel.onmessage = ({ data }) => {
        if (data.type === 'visibility-request') visibilityChanged();
        if (data.type === 'visibility' && stream) {
          if (data.visible) visibleTabs.set(data.tabId, Date.now() + 30_000);
          else visibleTabs.delete(data.tabId);
          updatePresence();
          scheduleFallback();
        }
        if (data.type === 'snapshot-request' && stream && latest !== undefined) channel.postMessage({ type: 'call', call: latest, healthy });
        if (data.type === 'unhealthy' && !stream) trackCall(null);
        if (data.type === 'call' && !stream) {
          trackCall(data.healthy ? data.call : null);
          if (data.call) publishCall(getToken(), data.call);
          else if (latest) void readCall(getToken(), latest.id, `/v1/chat/calls/${latest.id}`, true).catch(() => {});
          latest = data.call;
          onCall(data.call);
        }
      };
      channel.postMessage({ type: 'snapshot-request' });
      void navigator.locks.request(`mushroom-incoming:${sessionKey}`, { signal: stop.signal }, async () => {
        if (stop.signal.aborted) return;
        lead();
        await new Promise<void>(resolve => stop.signal.addEventListener('abort', () => resolve(), { once: true }));
      }).catch(() => {});
    } else {
      lead();
    }
    const announce = setInterval(() => {
      if (stream) updatePresence();
      else if (visible()) channel?.postMessage({ type: 'visibility', tabId, visible: true });
    }, 10_000);
    function releasePresence() {
      const id = presenceId;
      presenceId = undefined;
      if (!id) return;
      void fetchImpl(`${baseUrl}${path}/presence`, {
        method: 'POST', keepalive: true,
        headers: { authorization: `Bearer ${getToken()}`, 'content-type': 'application/json' },
        body: JSON.stringify({ id, visible: false, closed: true }),
      }).catch(() => {});
    }
    function restoreStream() {
      stream?.renew();
      visibilityChanged();
    }
    window.addEventListener('pagehide', releasePresence);
    window.addEventListener('pageshow', restoreStream);
    document.addEventListener('visibilitychange', visibilityChanged);
    channel?.postMessage({ type: 'visibility', tabId, visible: visible() });
    return {
      renew() { stream?.renew(); },
      disconnect() {
        channel?.postMessage({ type: 'visibility', tabId, visible: false });
        releasePresence();
        stop.abort();
        stream?.disconnect();
        clearInterval(announce);
        clearTimeout(ringExpiry);
        clearTimeout(timer);
        channel?.close();
        document.removeEventListener('visibilitychange', visibilityChanged);
        window.removeEventListener('pagehide', releasePresence);
        window.removeEventListener('pageshow', restoreStream);
      },
    };
  }

  const callSnapshots = new Map<string, { call: ChatCall; time: number }>();
  const callRequests = new Map<string, Promise<ChatCall>>();
  const callListeners = new Map<string, Set<(call: ChatCall) => void>>();
  const callKey = (token: string, id: string) => token + ':' + id;

  function publishCall(token: string, call: ChatCall) {
    const key = callKey(token, call.id);
    const previous = callSnapshots.get(key)?.call;
    if (previous?.endedAt && !call.endedAt) return previous;
    if (previous?.connectedAt && call.status === 'ACTIVE' && !call.connectedAt) return previous;
    callSnapshots.delete(key);
    callSnapshots.set(key, { call, time: Date.now() });
    if (callSnapshots.size > 128) callSnapshots.delete(callSnapshots.keys().next().value!);
    callListeners.get(key)?.forEach(listener => listener(call));
    return call;
  }

  function readCall(token: string, id: string, path: string, fresh = false) {
    const key = callKey(token, id);
    const snapshot = callSnapshots.get(key);
    if (!fresh && snapshot && Date.now() - snapshot.time < 2500) return Promise.resolve(snapshot.call);
    const existing = callRequests.get(key);
    if (existing) return existing;
    const pending = request<ChatCall>(token, path).then(call => publishCall(token, call)).finally(() => callRequests.delete(key));
    callRequests.set(key, pending);
    return pending;
  }

  function watchCall(token: string, conversationId: string, id: string, listener: (call: ChatCall) => void) {
    const key = callKey(token, id);
    const subscribers = callListeners.get(key) ?? new Set();
    let listening = true;
    let timer: ReturnType<typeof setTimeout>;
    function update(call: ChatCall) {
      if (!listening) return;
      listener(call);
      clearTimeout(timer);
      if (call.status === 'ACTIVE' || call.status === 'RINGING') timer = setTimeout(refresh, 6000);
    }
    function refresh() {
      // Incoming SSE owns updates while a patient's call is in progress.
      if (streamedCalls.get(token)?.id === id) {
        timer = setTimeout(refresh, 6000);
        return;
      }
      void readCall(token, id, `/v1/chat/conversations/${conversationId}/calls/${id}`).then(update).catch(error => {
        if (listening && !['CHAT_FORBIDDEN', 'CHAT_REQUEST_403', 'CHAT_REQUEST_404'].includes(error.message)) timer = setTimeout(refresh, 6000);
      });
    }
    subscribers.add(update);
    callListeners.set(key, subscribers);
    const current = streamedCalls.get(token);
    if (current?.id === id) update(current);
    else refresh();
    return () => {
      listening = false;
      clearTimeout(timer);
      subscribers.delete(update);
      if (!subscribers.size) callListeners.delete(key);
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
    watchIncoming,
    incoming: (token: string) => request<{ call: ChatCall | null }>(token, '/v1/chat/calls/incoming'),
    startCall: (token: string, appointmentId: string, mode: ChatCall['mode'] = 'VIDEO') =>
      request<ChatCall>(token, `/v1/chat/appointments/${appointmentId}/calls`, 'POST', { mode }),
    currentCall: (token: string, appointmentId: string) =>
      request<{ call: ChatCall | null }>(token, `/v1/chat/appointments/${appointmentId}/calls/current`),
    watchCall,
    historyCall: (token: string, conversationId: string, id: string) =>
      request<ChatCall>(token, `/v1/chat/conversations/${conversationId}/calls/${id}`),
    call: (token: string, id: string) => readCall(token, id, `/v1/chat/calls/${id}`, true),
    callAction: (token: string, id: string, action: 'answer' | 'decline' | 'end') => request<ChatCall>(token, `/v1/chat/calls/${id}/action`, 'POST', { action }).then(call => publishCall(token, call)),
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
