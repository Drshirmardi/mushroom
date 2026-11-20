import { createChatEngine } from "@sabz-zendegi/api-client/chat-engine";
import { apiBaseUrl, sessionFetch } from "@/lib/api";

export const chatEngine = createChatEngine(apiBaseUrl, sessionFetch);
export const loadChat = chatEngine.load;
export const loadOlderChat = chatEngine.older;
export const connectChat = chatEngine.connect;
export const closeChat = chatEngine.close;
export { reconcileChatMessages, chatAccessLabel } from "@sabz-zendegi/api-client/chat-engine";
export type { ChatMessage, ChatConnection, ChatAccess } from "@sabz-zendegi/api-client/chat-engine";
