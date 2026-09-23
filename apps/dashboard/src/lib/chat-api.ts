import { withRequestTimeout } from "@sabz-zendegi/api-client";
import { io, type Socket } from "socket.io-client";

import { apiBaseUrl, apiClient } from "@/lib/api";

const headers = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });
const HISTORY_PAGE_SIZE = 100;

type RestoreVisibilityEvent = {
  conversationId: string;
  messageId: string;
  sequence: string;
  visibility: "VISIBLE";
};

export async function loadChat(accessToken: string, appointmentId: string) {
  const conversation = await withRequestTimeout(apiClient.GET("/v1/chat/appointments/{appointmentId}/conversation", { headers: headers(accessToken), params: { path: { appointmentId } } }));
  if (!conversation.data) throw new Error("CHAT_FORBIDDEN");
  let cursor: string | undefined; const messages: ChatMessage[] = [];
  for (let page = 0; page < 100; page += 1) {
    const history = await withRequestTimeout(apiClient.GET("/v1/chat/conversations/{conversationId}/messages", { headers: headers(accessToken), params: { path: { conversationId: conversation.data.id }, query: { cursor, limit: HISTORY_PAGE_SIZE as never } } }));
    if (!history.data) throw new Error("CHAT_UNAVAILABLE");
    messages.push(...history.data.items as ChatMessage[]);
    if (typeof history.data.nextCursor !== "string") return { conversation: conversation.data, messages: messages.reduce(reconcileChatMessages, []) };
    cursor = history.data.nextCursor;
  }
  throw new Error("CHAT_HISTORY_LIMIT");
}

export async function sendChat(accessToken: string, conversationId: string, body: string) {
  const result = await withRequestTimeout(apiClient.POST("/v1/chat/conversations/{conversationId}/messages", { headers: headers(accessToken), params: { path: { conversationId } }, body: { clientMessageId: crypto.randomUUID(), body } }));
  if (!result.data) throw new Error("CHAT_SEND_FAILED");
  return result.data;
}

export type ChatMessage = Awaited<ReturnType<typeof sendChat>>;
type RealtimeSync = { ok: boolean; items?: ChatMessage[]; nextCursor?: string | null; highWaterSequence?: string };
type HistoryPage = { data?: { items: ChatMessage[]; nextCursor?: string | null } };

export function reconcileChatMessages(messages: ChatMessage[], next: ChatMessage) {
  return [...messages.filter((message) => message.id !== next.id), next]
    .sort((left, right) => BigInt(left.sequence) < BigInt(right.sequence) ? -1 : BigInt(left.sequence) > BigInt(right.sequence) ? 1 : 0);
}

export function connectChat(accessToken: string, conversationId: string, lastSequence: () => string, onMessage: (message: ChatMessage) => void, onState: (state: "connected" | "reconnecting" | "offline" | "read-only" | "recovery-failed") => void): Socket {
  const socket = io(`${apiBaseUrl}/chat`, { auth: { token: accessToken }, transports: ["websocket"], reconnectionDelay: 1_000, reconnectionDelayMax: 30_000, randomizationFactor: 0.5 });
  let connectionGeneration = 0;
  let joinedGeneration: number | undefined;
  let joiningGeneration: number | undefined;
  let failedGeneration: number | undefined;
  let visibilityCursor: string | undefined;
  const pendingRestores = new Map<string, RestoreVisibilityEvent>();
  const pendingMessages = new Map<string, ChatMessage>();
  const pendingVisibilityEvents = new Map<string, RestoreVisibilityEvent | ChatMessage>();
  const reconciling = new Set<string>();

  const recoverJoinGap = async (sync: RealtimeSync, generation: number): Promise<ChatMessage[]> => {
    if (typeof sync.highWaterSequence !== "string" || !/^\d+$/u.test(sync.highWaterSequence)) throw new Error("CHAT_RECOVERY_HIGH_WATER_INVALID");
    const priorRaw = lastSequence();
    if (!/^\d+$/u.test(priorRaw)) throw new Error("CHAT_RECOVERY_SEQUENCE_INVALID");
    const highWater = BigInt(sync.highWaterSequence);
    let recoveredThrough = BigInt(priorRaw);
    const backlog = sync.items ?? [];
    for (const message of backlog) {
      if (!/^\d+$/u.test(message.sequence) || BigInt(message.sequence) !== recoveredThrough + BigInt(1) || recoveredThrough >= highWater) throw new Error("CHAT_RECOVERY_HIGH_WATER_UNREACHABLE");
      recoveredThrough += BigInt(1);
    }
    if (recoveredThrough === highWater) {
      if (typeof sync.nextCursor === "string") throw new Error("CHAT_RECOVERY_CURSOR_UNEXPECTED");
      return [];
    }
    if (!backlog.length || typeof sync.nextCursor !== "string") throw new Error("CHAT_RECOVERY_HIGH_WATER_UNREACHABLE");
    let cursor: string | undefined = sync.nextCursor;
    const seenCursors = new Set<string>();
    const recovered: ChatMessage[] = [];
    const pageBudget = (highWater - recoveredThrough + BigInt(HISTORY_PAGE_SIZE - 1)) / BigInt(HISTORY_PAGE_SIZE);
    for (let page = BigInt(0); page < pageBudget; page += BigInt(1)) {
      if (generation !== connectionGeneration || !cursor) throw new Error("CHAT_RECOVERY_CANCELLED");
      if (seenCursors.has(cursor)) throw new Error("CHAT_RECOVERY_CURSOR_STALLED");
      seenCursors.add(cursor);
      const history: HistoryPage = await withRequestTimeout(apiClient.GET("/v1/chat/conversations/{conversationId}/messages", {
        headers: headers(accessToken),
        params: { path: { conversationId }, query: { cursor, limit: HISTORY_PAGE_SIZE as never } },
      })) as HistoryPage;
      if (generation !== connectionGeneration || !history.data) throw new Error("CHAT_RECOVERY_CANCELLED");
      if (!history.data.items.length) throw new Error("CHAT_RECOVERY_PAGE_EMPTY");
      for (const message of history.data.items) {
        if (!/^\d+$/u.test(message.sequence) || BigInt(message.sequence) !== recoveredThrough + BigInt(1)) throw new Error("CHAT_RECOVERY_HIGH_WATER_UNREACHABLE");
        if (recoveredThrough >= highWater) break;
        recovered.push(message as ChatMessage);
        recoveredThrough = BigInt(message.sequence);
      }
      if (recoveredThrough === highWater) {
        return recovered;
      }
      if (typeof history.data.nextCursor !== "string") throw new Error("CHAT_RECOVERY_HIGH_WATER_UNREACHABLE");
      cursor = history.data.nextCursor;
    }
    throw new Error("CHAT_RECOVERY_HIGH_WATER_UNREACHABLE");
  };

  const reconcileRestore = (event: RestoreVisibilityEvent, generation: number) => {
    if (joinedGeneration !== generation || reconciling.has(event.messageId) || !/^\d+$/u.test(event.sequence)) return;
    reconciling.add(event.messageId);
    void (async () => {
      let cursor: string | undefined;
      const maximumPages = (BigInt(event.sequence) + BigInt(HISTORY_PAGE_SIZE - 1)) / BigInt(HISTORY_PAGE_SIZE);
      for (let page = BigInt(0); page < maximumPages; page += BigInt(1)) {
        const history = await withRequestTimeout(apiClient.GET("/v1/chat/conversations/{conversationId}/messages", {
          headers: headers(accessToken),
          params: { path: { conversationId }, query: { cursor, limit: HISTORY_PAGE_SIZE as never } },
        }));
        if (generation !== connectionGeneration || joinedGeneration !== generation || !pendingRestores.has(event.messageId) || !history.data) return;
        const restored = history.data.items.find((message) => message.id === event.messageId && message.sequence === event.sequence);
        if (restored) {
          onMessage(restored as ChatMessage);
          pendingRestores.delete(event.messageId);
          return;
        }
        const nextCursor: unknown = history.data.nextCursor;
        if (typeof nextCursor !== "string") return;
        cursor = nextCursor;
      }
    })().catch(() => undefined).finally(() => { reconciling.delete(event.messageId); });
  };

  const reconcilePendingRestores = (generation: number) => {
    if (joinedGeneration !== generation) return;
    for (const event of pendingRestores.values()) reconcileRestore(event, generation);
  };

  const reconcileVisibility = (generation: number) => void (async () => {
    let cursor = visibilityCursor;
    for (let page = 0; page < 100; page += 1) {
      const result = await withRequestTimeout(apiClient.GET("/v1/chat/conversations/{conversationId}/visibility-reconciliation", { headers: headers(accessToken), params: { path: { conversationId }, query: { cursor, limit: HISTORY_PAGE_SIZE as never } } }));
      if (generation !== connectionGeneration || joinedGeneration !== generation || !result.data) return;
      result.data.items.forEach((item) => onMessage(item.message as ChatMessage));
      if (typeof result.data.checkpointCursor === "string") visibilityCursor = result.data.checkpointCursor;
      if (typeof result.data.nextCursor !== "string") return;
      cursor = result.data.nextCursor;
    }
  })().catch(() => undefined);

  const applyVisibility = (event: RestoreVisibilityEvent | ChatMessage, generation: number) => {
    if (joinedGeneration !== generation) return;
    if (event.visibility === "VISIBLE" && "messageId" in event) { pendingRestores.set(event.messageId, event); reconcileRestore(event, generation); }
    else { pendingRestores.delete(event.id); onMessage(event); }
  };

  const join = (generation: number) => socket.emit("conversation:join", { conversationId, lastSequence: lastSequence() }, (sync: RealtimeSync) => void (async () => {
    if (generation !== connectionGeneration) return;
    if (!sync.ok) { joiningGeneration = undefined; onState("read-only"); return; }
    try {
      const recovered = await recoverJoinGap(sync, generation);
      if (generation !== connectionGeneration) return;
      joinedGeneration = generation;
      joiningGeneration = undefined;
      sync.items?.forEach(onMessage);
      recovered.forEach(onMessage);
      for (const message of pendingMessages.values()) onMessage(message);
      pendingMessages.clear();
      for (const event of pendingVisibilityEvents.values()) applyVisibility(event, generation);
      pendingVisibilityEvents.clear();
      onState("connected");
      reconcilePendingRestores(generation);
      reconcileVisibility(generation);
    } catch {
      if (generation !== connectionGeneration) return;
      failedGeneration = generation;
      joinedGeneration = undefined;
      joiningGeneration = undefined;
      onState("recovery-failed");
      socket.disconnect();
    }
  })());
  socket.on("connect", () => { connectionGeneration += 1; joinedGeneration = undefined; joiningGeneration = connectionGeneration; failedGeneration = undefined; join(connectionGeneration); });
  socket.on("message:committed", (message: ChatMessage) => {
    if (joinedGeneration === connectionGeneration) onMessage(message);
    else if (joiningGeneration === connectionGeneration) pendingMessages.set(message.id, message);
  });
  socket.on("message:visibility-changed", (event: RestoreVisibilityEvent | ChatMessage) => {
    if (joinedGeneration === connectionGeneration) applyVisibility(event, connectionGeneration);
    else if (joiningGeneration === connectionGeneration) pendingVisibilityEvents.set("messageId" in event ? event.messageId : event.id, event);
  });
  socket.on("reconnect_attempt", () => onState("reconnecting"));
  socket.on("disconnect", () => { const failed = failedGeneration === connectionGeneration; connectionGeneration += 1; joinedGeneration = undefined; joiningGeneration = undefined; if (!failed) onState("offline"); });
  socket.on("connect_error", () => onState("offline"));
  return socket;
}
