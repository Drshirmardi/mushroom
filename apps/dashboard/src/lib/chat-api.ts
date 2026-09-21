import { withRequestTimeout } from "@sabz-zendegi/api-client";
import { io, type Socket } from "socket.io-client";

import { apiBaseUrl, apiClient } from "@/lib/api";

const headers = (accessToken: string) => ({ authorization: `Bearer ${accessToken}` });

export async function loadChat(accessToken: string, appointmentId: string) {
  const conversation = await withRequestTimeout(apiClient.GET("/v1/chat/appointments/{appointmentId}/conversation", { headers: headers(accessToken), params: { path: { appointmentId } } }));
  if (!conversation.data) throw new Error("CHAT_FORBIDDEN");
  const history = await withRequestTimeout(apiClient.GET("/v1/chat/conversations/{conversationId}/messages", { headers: headers(accessToken), params: { path: { conversationId: conversation.data.id } } }));
  if (!history.data) throw new Error("CHAT_UNAVAILABLE");
  return { conversation: conversation.data, messages: history.data.items };
}

export async function sendChat(accessToken: string, conversationId: string, body: string) {
  const result = await withRequestTimeout(apiClient.POST("/v1/chat/conversations/{conversationId}/messages", { headers: headers(accessToken), params: { path: { conversationId } }, body: { clientMessageId: crypto.randomUUID(), body } }));
  if (!result.data) throw new Error("CHAT_SEND_FAILED");
  return result.data;
}

async function refreshConversation(accessToken: string, conversationId: string, onMessage: (message: ChatMessage) => void) {
  const history = await withRequestTimeout(apiClient.GET("/v1/chat/conversations/{conversationId}/messages", { headers: headers(accessToken), params: { path: { conversationId } } }));
  history.data?.items.forEach((message) => onMessage(message as ChatMessage));
}

type RealtimeSync = { ok: boolean; items?: ChatMessage[] };
export type ChatMessage = Awaited<ReturnType<typeof sendChat>>;

export function reconcileChatMessages(messages: ChatMessage[], next: ChatMessage) {
  return [...messages.filter((message) => message.id !== next.id), next]
    .sort((left, right) => BigInt(left.sequence) < BigInt(right.sequence) ? -1 : BigInt(left.sequence) > BigInt(right.sequence) ? 1 : 0);
}

export function connectChat(accessToken: string, conversationId: string, lastSequence: () => string, onMessage: (message: ChatMessage) => void, onState: (state: "connected" | "reconnecting" | "offline" | "read-only") => void): Socket {
  const socket = io(`${apiBaseUrl}/chat`, { auth: { token: accessToken }, transports: ["websocket"], reconnectionDelay: 1_000, reconnectionDelayMax: 30_000, randomizationFactor: 0.5 });
  socket.on("connect", () => socket.emit("conversation:join", { conversationId, lastSequence: lastSequence() }, (sync: RealtimeSync) => { if (!sync.ok) { onState("read-only"); return; } sync.items?.forEach(onMessage); onState("connected"); }));
  socket.on("message:committed", onMessage);
  socket.on("message:visibility-changed", (event: { visibility?: string }) => {
    if (event.visibility === "VISIBLE") void refreshConversation(accessToken, conversationId, onMessage);
    else onMessage(event as ChatMessage);
  });
  socket.on("reconnect_attempt", () => onState("reconnecting"));
  socket.on("disconnect", () => onState("offline"));
  socket.on("connect_error", () => onState("offline"));
  return socket;
}
