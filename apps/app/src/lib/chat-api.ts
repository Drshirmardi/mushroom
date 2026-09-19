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

type RealtimeSync = { ok: boolean; code?: string; items?: ChatMessage[] };
export type ChatMessage = Awaited<ReturnType<typeof sendChat>>;

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
  const join = () => socket.emit("conversation:join", { conversationId, lastSequence: lastSequence() }, (sync: RealtimeSync) => {
    if (!sync.ok) { onState("read-only"); return; }
    sync.items?.forEach(onMessage);
    onState("connected");
  });
  socket.on("connect", join);
  socket.on("message:committed", onMessage);
  socket.on("reconnect_attempt", () => onState("reconnecting"));
  socket.on("disconnect", () => onState("offline"));
  socket.on("connect_error", () => onState("offline"));
  return socket;
}
