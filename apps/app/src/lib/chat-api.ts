import { createChatEngine } from "@sabz-zendegi/api-client/chat-engine";
import { apiBaseUrl, sessionFetch } from "@/lib/api";

const engine = createChatEngine(apiBaseUrl, sessionFetch);
export const loadChat = engine.load;
export const loadOlderChat = engine.older;
export const connectChat = engine.connect;
export const closeChat = engine.close;
export { reconcileChatMessages, chatAccessLabel } from "@sabz-zendegi/api-client/chat-engine";
export type { ChatMessage, ChatConnection, ChatAccess } from "@sabz-zendegi/api-client/chat-engine";
