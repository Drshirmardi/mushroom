import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, ioMock, socket } = vi.hoisted(() => {
  const socket = { on: vi.fn(), emit: vi.fn() };
  return { get: vi.fn(), ioMock: vi.fn(() => socket), socket };
});

vi.mock("@sabz-zendegi/api-client", () => ({ withRequestTimeout: (request: Promise<unknown>) => request }));
vi.mock("socket.io-client", () => ({ io: ioMock }));
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test", apiClient: { GET: get } }));

import { connectChat, reconcileChatMessages, type ChatMessage } from "./chat-api";

describe("dashboard chat realtime adapter", () => {
  beforeEach(() => { get.mockReset(); ioMock.mockClear(); socket.on.mockClear(); socket.emit.mockClear(); });

  it("replaces cached visible bodies with tombstones for direct and report-resolution restriction events", () => {
    const received = vi.fn();
    connectChat("token", "conversation-1", () => "2", received, vi.fn());
    const visibilityChanged = socket.on.mock.calls.find(([event]) => event === "message:visibility-changed")?.[1] as (message: ChatMessage) => void;
    const visible = { id: "message-1", sequence: "1", body: "dashboard direct source body", visibility: "VISIBLE" } as ChatMessage;
    const directTombstone = { id: "message-1", sequence: "1", visibility: "RESTRICTED", restrictedReasonCategory: "ABUSE_OR_HARASSMENT", tombstone: "Conversation content has been restricted under policy." } as ChatMessage;
    const resolutionTombstone = { id: "message-2", sequence: "2", visibility: "RESTRICTED", restrictedReasonCategory: "SPAM_OR_SCAM", tombstone: "Conversation content has been restricted under policy." } as ChatMessage;
    visibilityChanged(directTombstone); visibilityChanged(resolutionTombstone);
    expect(received).toHaveBeenNthCalledWith(1, directTombstone);
    expect(received).toHaveBeenNthCalledWith(2, resolutionTombstone);
    const reconciled = reconcileChatMessages(reconcileChatMessages([visible], directTombstone), resolutionTombstone);
    expect(reconciled).toEqual([directTombstone, resolutionTombstone]);
    expect(reconciled[0].body).toBeUndefined();
    expect(JSON.stringify(reconciled)).not.toContain("dashboard direct source body");
  });

  it("cursor-paginates authorized REST history to restore a tombstone beyond the first page", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `message-${index + 1}`, sequence: String(index + 1), visibility: "VISIBLE", body: "earlier history" }));
    const received = vi.fn(); get
      .mockResolvedValueOnce({ data: { items: firstPage, nextCursor: "opaque-page-100" } })
      .mockResolvedValueOnce({ data: { items: [{ id: "message-101", sequence: "101", visibility: "VISIBLE", body: "dashboard restored" }], nextCursor: null } });
    connectChat("token", "conversation-1", () => "1", received, vi.fn());
    const visibilityChanged = socket.on.mock.calls.find(([event]) => event === "message:visibility-changed")?.[1] as (event: unknown) => void;
    visibilityChanged({ conversationId: "conversation-1", messageId: "message-101", sequence: "101", visibility: "VISIBLE" });
    await vi.waitFor(() => expect(received).toHaveBeenCalledWith(expect.objectContaining({ id: "message-101", body: "dashboard restored" })));
    expect(get).toHaveBeenNthCalledWith(1, "/v1/chat/conversations/{conversationId}/messages", expect.objectContaining({ headers: { authorization: "Bearer token" }, params: { path: { conversationId: "conversation-1" }, query: { cursor: undefined, limit: 100 } } }));
    expect(get).toHaveBeenNthCalledWith(2, "/v1/chat/conversations/{conversationId}/messages", expect.objectContaining({ params: { path: { conversationId: "conversation-1" }, query: { cursor: "opaque-page-100", limit: 100 } } }));
  });

  it("does not apply a stale restore fetch after a disconnect", async () => {
    let resolveHistory!: (value: unknown) => void;
    get.mockReturnValueOnce(new Promise((resolve) => { resolveHistory = resolve; }));
    const received = vi.fn(); connectChat("token", "conversation-1", () => "101", received, vi.fn());
    const visibilityChanged = socket.on.mock.calls.find(([event]) => event === "message:visibility-changed")?.[1] as (event: unknown) => void;
    const disconnect = socket.on.mock.calls.find(([event]) => event === "disconnect")?.[1] as () => void;
    visibilityChanged({ conversationId: "conversation-1", messageId: "message-101", sequence: "101", visibility: "VISIBLE" });
    disconnect();
    resolveHistory({ data: { items: [{ id: "message-101", sequence: "101", visibility: "VISIBLE", body: "must not replace tombstone after disconnect" }], nextCursor: null } });
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(received).not.toHaveBeenCalled();
  });
});
