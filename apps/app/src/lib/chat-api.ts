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
type RealtimeSync = { ok: boolean; code?: string; items?: ChatMessage[]; nextCursor?: string | null };

export function reconcileChatMessages(messages: ChatMessage[], next: ChatMessage) {
  return [...messages.filter((message) => message.id !== next.id), next]
    .sort((left, right) => BigInt(left.sequence) < BigInt(right.sequence) ? -1 : BigInt(left.sequence) > BigInt(right.sequence) ? 1 : 0);
}

export function connectChat(
  accessToken: string,
  conversationId: string,
  lastSequence: () => string,
  onMessage: (message: ChatMessage) => void,
  onState: (state: "connected" | "reconnecting" | "offline" | "read-only") => void,
): Socket {
  const socket = io(`${apiBaseUrl}/chat`, {
    auth: { token: accessToken },
    transports: ["websocket"],
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 30_000,
    randomizationFactor: 0.5,
  });
  let connectionGeneration = 0;
  let visibilityCursor: string | undefined;
  const pendingRestores = new Map<string, RestoreVisibilityEvent>();
  const reconciling = new Set<string>();

  const reconcileRestore = (event: RestoreVisibilityEvent, generation: number) => {
    if (reconciling.has(event.messageId) || !/^\d+$/u.test(event.sequence)) return;
    reconciling.add(event.messageId);
    void (async () => {
      let cursor: string | undefined;
      const maximumPages = (BigInt(event.sequence) + BigInt(HISTORY_PAGE_SIZE - 1)) / BigInt(HISTORY_PAGE_SIZE);
      for (let page = BigInt(0); page < maximumPages; page += BigInt(1)) {
        const history = await withRequestTimeout(apiClient.GET("/v1/chat/conversations/{conversationId}/messages", {
          headers: headers(accessToken),
          params: { path: { conversationId }, query: { cursor, limit: HISTORY_PAGE_SIZE as never } },
        }));
        if (generation !== connectionGeneration || !pendingRestores.has(event.messageId) || !history.data) return;
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
    })().catch(() => undefined).finally(() => {
      reconciling.delete(event.messageId);
      const pending = pendingRestores.get(event.messageId);
      if (pending && generation !== connectionGeneration) reconcileRestore(pending, connectionGeneration);
    });
  };

  const reconcilePendingRestores = () => {
    for (const event of pendingRestores.values()) reconcileRestore(event, connectionGeneration);
  };

  const reconcileVisibility = (generation: number) => void (async () => {
    let cursor = visibilityCursor;
    for (let page = 0; page < 100; page += 1) {
      const result = await withRequestTimeout(apiClient.GET("/v1/chat/conversations/{conversationId}/visibility-reconciliation", { headers: headers(accessToken), params: { path: { conversationId }, query: { cursor, limit: HISTORY_PAGE_SIZE as never } } }));
      if (generation !== connectionGeneration || !result.data) return;
      result.data.items.forEach((item) => onMessage(item.message as ChatMessage));
      if (typeof result.data.checkpointCursor === "string") visibilityCursor = result.data.checkpointCursor;
      if (typeof result.data.nextCursor !== "string") return;
      cursor = result.data.nextCursor;
    }
  })().catch(() => undefined);

  const join = () => socket.emit("conversation:join", { conversationId, lastSequence: lastSequence() }, (sync: RealtimeSync) => {
    if (!sync.ok) { onState("read-only"); return; }
    sync.items?.forEach(onMessage);
    onState("connected");
    reconcilePendingRestores();
    reconcileVisibility(connectionGeneration);
  });
  socket.on("connect", () => { connectionGeneration += 1; join(); });
  socket.on("message:committed", onMessage);
  socket.on("message:visibility-changed", (event: RestoreVisibilityEvent | ChatMessage) => {
    if (event.visibility === "VISIBLE" && "messageId" in event) {
      pendingRestores.set(event.messageId, event);
      reconcileRestore(event, connectionGeneration);
    } else {
      pendingRestores.delete(event.id);
      onMessage(event);
    }
  });
  socket.on("reconnect_attempt", () => onState("reconnecting"));
  socket.on("disconnect", () => { connectionGeneration += 1; onState("offline"); });
  socket.on("connect_error", () => onState("offline"));
  return socket;
}
