import type { components } from './schema.generated';
import type { Agent, Stanzas } from 'stanza';

export type ChatMessage = components['schemas']['ChatMessageResponseDto'];
export type ChatConversation = components['schemas']['ChatConversationResponseDto'];
export type ChatState = 'connected' | 'reconnecting' | 'offline' | 'read-only' | 'recovery-failed';
export type ChatSession = components['schemas']['EjabberdSessionDto'];
export type ChatAccess = components['schemas']['ChatAccessResponseDto'];
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
    if (!response.ok) throw new Error(`CHAT_REQUEST_${response.status}`);
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
    let stopped = false;
    let client: Agent | undefined;
    let session: ChatSession | undefined;
    let ready = false;
    let generation = 0;
    let retries = 0;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let renewTimer: ReturnType<typeof setTimeout> | undefined;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let checkpoint = loaded.checkpointCursor;
    let visibilityCursor: string | undefined;
    let recovery: Promise<void> | undefined;
    let recoveryAgain = false;
    const cache = new Map(loaded.messages.map(message => [message.id, message]));
    const pending = new Map<string, { resolve: (message: ChatMessage) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }>();
    const publish = (message: ChatMessage) => { if (!stopped) { cache.set(message.id, message); onMessage(message); } };

    const recover = (): Promise<void> => {
      if (recovery) { recoveryAgain = true; return recovery; }
      recovery = (async () => {
        do {
          recoveryAgain = false;
          // Advance only through returned server cursors, never a live-event sequence.
          let page: History;
          do {
            page = await history(token, loaded.conversation.id, 'after', checkpoint);
            if (stopped) return;
            page.items.forEach(publish);
            checkpoint = page.checkpointCursor;
          } while (page.nextCursor && !stopped);
          let changes: Visibility;
          do {
            changes = await request<Visibility>(token, `/v1/chat/conversations/${loaded.conversation.id}/visibility-reconciliation?limit=100${visibilityCursor ? `&cursor=${encodeURIComponent(visibilityCursor)}` : ''}`);
            if (stopped) return;
            changes.items.forEach(item => publish(item.message));
            visibilityCursor = typeof changes.checkpointCursor === 'string' ? changes.checkpointCursor : visibilityCursor;
          } while (changes.nextCursor && !stopped);
        } while (recoveryAgain && !stopped);
      })().finally(() => { recovery = undefined; });
      return recovery;
    };

    const failPending = () => {
      for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('CHAT_CONNECTION_LOST')); }
      pending.clear();
    };
    const schedule = () => {
      if (stopped || retryTimer) return;
      ready = false; failPending(); onState('offline');
      retryTimer = setTimeout(() => { retryTimer = undefined; void start(); }, Math.min(30_000, 1000 * 2 ** Math.min(retries++, 5)));
    };
    type NativeMessage = Stanzas.ReceivedMessage & {
      sabzId?: string; sabzSequence?: string; sabzSender?: string; sabzCreated?: string; sabzVisibility?: string;
      sabzEvent?: string; sabzEventId?: string; sabzEventVisibility?: string;
    };

    async function start() {
      if (stopped) return;
      const current = ++generation;
      ready = false; failPending(); onState('reconnecting');
      clearTimeout(renewTimer);
      const previous = client; client = undefined;
      void Promise.resolve(previous?.disconnect()).catch(() => undefined);
      try {
        const next = await request<ChatSession>(token, `/v1/chat/appointments/${loaded.conversation.appointmentId}/session`, 'POST');
        if (stopped || current !== generation) return;
        if (next.transport !== 'ejabberd' || next.conversationId !== loaded.conversation.id) throw new Error('CHAT_SESSION_INVALID');
        session = next;
        // Read-only conversations use retained REST history and need no room join.
        if (!next.canSend) {
          await recover();
          if (stopped || current !== generation) return;
          retries = 0; onState('read-only', next);
          renewTimer = setTimeout(() => void start(), Math.max(1000, Date.parse(next.expiresAt) - Date.now() - 15_000));
          return;
        }
        const { createClient, JXT } = await import('stanza');
        if (stopped || current !== generation) return;
        const xmpp = createClient({
          jid: next.jid, password: next.token, resource: next.resource,
          transports: { websocket: next.websocketUrl, bosh: false }, transportPreferenceOrder: ['websocket'],
          autoReconnect: false, allowResumption: false, timeout: 10,
          sendReceipts: false, chatMarkers: false,
        });
        // Native JWT auth verifies the password; OAuth mechanisms use a different token backend.
        xmpp.sasl.disable('X-OAUTH2');
        xmpp.sasl.disable('OAUTHBEARER');
        client = xmpp;
        renewTimer = setTimeout(() => { if (!stopped && current === generation && !ready) schedule(); }, 15_000);
        const ns = 'urn:sabz:chat:1';
        xmpp.stanzas.define(JXT.extendMessage({
          sabzId: JXT.childAttribute(ns, 'sabz', 'id'), sabzSequence: JXT.childAttribute(ns, 'sabz', 'sequence'),
          sabzSender: JXT.childAttribute(ns, 'sabz', 'sender-kind'), sabzCreated: JXT.childAttribute(ns, 'sabz', 'created-at'),
          sabzVisibility: JXT.childAttribute(ns, 'sabz', 'visibility'),
          sabzEvent: JXT.childAttribute(ns, 'sabz-event', 'type'), sabzEventId: JXT.childAttribute(ns, 'sabz-event', 'message-id'),
          sabzEventVisibility: JXT.childAttribute(ns, 'sabz-event', 'visibility'),
        }));
        const live = () => !stopped && current === generation && client === xmpp;
        xmpp.on('message', (incoming) => {
          if (!live() || (incoming.from ?? '').split('/')[0] !== next.roomJid) return;
          const message = incoming as NativeMessage;
          if (!message.id) return;
          if (message.type === 'error') {
            const item = pending.get(message.id);
            if (item) { clearTimeout(item.timer); pending.delete(message.id); item.reject(new Error('CHAT_SEND_REJECTED')); }
            return;
          }
          if (message.sabzEvent === 'visibility') {
            const cached = cache.get(message.sabzEventId ?? '');
            if (cached && message.sabzEventVisibility === 'RESTRICTED') publish({ ...cached, visibility: 'RESTRICTED', body: undefined, tombstone: 'محتوای این پیام محدود شده است.' });
            void recover().catch(() => { if (live()) onState('recovery-failed'); });
            return;
          }
          if (!message.sabzId || message.id !== message.sabzId || !/^\d+$/u.test(message.sabzSequence ?? '') ||
            !['PATIENT', 'DOCTOR', 'CLINIC_OPERATOR'].includes(message.sabzSender ?? '') ||
            !['VISIBLE', 'RESTRICTED'].includes(message.sabzVisibility ?? '') || !Number.isFinite(Date.parse(message.sabzCreated ?? '')) || typeof message.body !== 'string') return;
          const canonical: ChatMessage = {
            id: message.id, sequence: message.sabzSequence!, senderKind: message.sabzSender as ChatMessage['senderKind'],
            createdAt: message.sabzCreated!, visibility: message.sabzVisibility as ChatMessage['visibility'],
            ...(message.sabzVisibility === 'VISIBLE' ? { body: message.body } : { tombstone: message.body }),
          };
          publish(canonical);
          const item = pending.get(message.originId ?? '');
          if (item) { clearTimeout(item.timer); pending.delete(message.originId!); item.resolve(canonical); }
          void recover().catch(() => { if (live()) onState('recovery-failed'); });
        });
        xmpp.on('disconnected', () => { if (live()) schedule(); });
        xmpp.on('auth:failed', () => { if (live()) schedule(); });
        xmpp.on('session:started', () => void (async () => {
          await Promise.race([xmpp.joinRoom(next.roomJid, next.jid.split('@')[0]!), new Promise<never>((_, reject) => setTimeout(() => reject(new Error('CHAT_JOIN_TIMEOUT')), 10_000))]);
          await recover();
          if (!live()) return;
          ready = true; retries = 0; onState('connected', next);
          clearTimeout(renewTimer);
          renewTimer = setTimeout(() => void start(), Math.max(1000, Date.parse(next.expiresAt) - Date.now() - 15_000));
        })().catch(() => { if (live()) schedule(); }));
        await xmpp.connect();
      } catch { if (!stopped && current === generation) schedule(); }
    }
    const visible = () => { if (!stopped && document.visibilityState === 'visible') { void recover().catch(() => onState('recovery-failed')); if (!ready && !retryTimer) void start(); } };
    document.addEventListener('visibilitychange', visible);
    let polling = false;
    pollTimer = setInterval(() => {
      if (stopped || polling || document.visibilityState !== 'visible') return;
      polling = true;
      const current = generation;
      void Promise.all([recover(), request<ChatAccess>(token, `/v1/chat/conversations/${loaded.conversation.id}/access`)]).then(([, access]) => {
        if (stopped || current !== generation) return;
        if (!access.canSend) {
          ready = false; failPending();
          const previous = client; client = undefined;
          void Promise.resolve(previous?.disconnect()).catch(() => undefined);
          onState('read-only', access);
        } else if (!ready && !retryTimer) void start();
        else if (ready) onState('connected', access);
      }).catch(() => { if (!stopped && current === generation) onState('recovery-failed'); }).finally(() => { polling = false; });
    }, 15_000);
    void start();
    return {
      send(body, clientMessageId) {
        if (!ready || !client || !session?.canSend || Date.parse(session.expiresAt) <= Date.now()) return Promise.reject(new Error('CHAT_NOT_CONNECTED'));
        if (pending.has(clientMessageId)) return Promise.reject(new Error('CHAT_SEND_PENDING'));
        return new Promise<ChatMessage>((resolve, reject) => {
          const timer = setTimeout(() => { pending.delete(clientMessageId); reject(new Error('CHAT_SEND_UNCONFIRMED')); }, 10_000);
          pending.set(clientMessageId, { resolve, reject, timer });
          try { client!.sendMessage({ to: session!.roomJid, type: 'groupchat', id: clientMessageId, originId: clientMessageId, body }); }
          catch { clearTimeout(timer); pending.delete(clientMessageId); reject(new Error('CHAT_SEND_FAILED')); }
        });
      },
      disconnect() {
        stopped = true; generation++; ready = false;
        clearTimeout(retryTimer); clearTimeout(renewTimer); clearInterval(pollTimer);
        document.removeEventListener('visibilitychange', visible); failPending();
        void Promise.resolve(client?.disconnect()).catch(() => undefined); client = undefined; session = undefined; cache.clear();
      },
    };
  }
  const close = (token: string, conversationId: string) => request<ChatConversation>(token, `/v1/chat/conversations/${encodeURIComponent(conversationId)}/close`, 'POST');
  return { load, older, connect, close };
}

export function chatAccessLabel(access: ChatAccess | null | undefined) {
  if (!access || access.canSend) return null;
  if (access.closedAt) return 'این گفتگو توسط پزشک یا کلینیک بسته شده است؛ سابقهٔ پیام‌ها محفوظ است.';
  if (access.readOnlyReason === 'CHAT_BLOCKED') return 'ارسال پیام در این گفتگو محدود شده است.';
  if (access.readOnlyReason === 'CHAT_APPOINTMENT_NOT_ELIGIBLE') return 'پس از تأیید نوبت، گفتگو آماده می‌شود.';
  if (Date.parse(access.opensAt) > Date.now()) return 'گفتگو ۱۵ دقیقه پیش از شروع نوبت آماده می‌شود: ' + new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(access.opensAt));
  return 'این نوبت برای ارسال پیام فعال نیست؛ وضعیت نوبت را بررسی کنید.';
}
