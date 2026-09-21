import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, ioMock, socket } = vi.hoisted(() => {
  const socket = { on: vi.fn(), emit: vi.fn() };
  return { get: vi.fn(), post: vi.fn(), ioMock: vi.fn(() => socket), socket };
});

vi.mock("@sabz-zendegi/api-client", () => ({ withRequestTimeout: (request: Promise<unknown>) => request }));
vi.mock("socket.io-client", () => ({ io: ioMock }));
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test", apiClient: { GET: get, POST: post } }));

import { connectChat, loadChat, reconcileChatMessages, sendChat } from "./chat-api";

describe("chat API adapter", () => {
  beforeEach(() => { get.mockReset(); post.mockReset(); ioMock.mockClear(); socket.on.mockClear(); socket.emit.mockClear(); });

  it("uses generated REST operations with bearer authentication and client idempotency", async () => {
    get.mockResolvedValueOnce({ data: { id: "conversation-1" } }).mockResolvedValueOnce({ data: { items: [] } });
    post.mockResolvedValueOnce({ data: { id: "message-1", sequence: "1" } });
    await loadChat("token", "appointment-1"); await sendChat("token", "conversation-1", "سلام");
    expect(get.mock.calls.map(([path]) => path)).toEqual(["/v1/chat/appointments/{appointmentId}/conversation", "/v1/chat/conversations/{conversationId}/messages"]);
    expect(post.mock.calls[0][0]).toBe("/v1/chat/conversations/{conversationId}/messages");
    expect(post.mock.calls[0][1]).toMatchObject({ headers: { authorization: "Bearer token" }, body: { body: "سلام", clientMessageId: expect.any(String) } });
  });

  it("keeps tokens in Socket.IO auth and reconnects with the latest applied sequence", () => {
    const states = vi.fn(); const message = vi.fn(); let sequence = "4";
    connectChat("token", "conversation-1", () => sequence, message, states);
    expect(ioMock).toHaveBeenCalledWith("https://api.example.test/chat", expect.objectContaining({ auth: { token: "token" }, transports: ["websocket"], reconnectionDelay: 1_000, reconnectionDelayMax: 30_000 }));
    const connect = socket.on.mock.calls.find(([event]) => event === "connect")?.[1] as () => void;
    connect(); sequence = "8"; connect();
    expect(socket.emit).toHaveBeenNthCalledWith(1, "conversation:join", expect.objectContaining({ lastSequence: "4" }), expect.any(Function));
    expect(socket.emit).toHaveBeenNthCalledWith(2, "conversation:join", expect.objectContaining({ lastSequence: "8" }), expect.any(Function));
  });

  it("reconciles an early realtime event with its duplicated join backlog by id and sequence", () => {
    const early = { id: "message-1", sequence: "2", body: "arrived early" } as Awaited<ReturnType<typeof sendChat>>;
    const older = { id: "message-0", sequence: "1", body: "older" } as Awaited<ReturnType<typeof sendChat>>;
    const afterEvent = reconcileChatMessages([], early);
    const afterBacklog = reconcileChatMessages(afterEvent, early);
    expect(reconcileChatMessages(afterBacklog, older).map((message) => message.id)).toEqual(["message-0", "message-1"]);
    expect(afterBacklog).toHaveLength(1);
  });

  it("replaces cached visible bodies with tombstones for direct and report-resolution restriction events", () => {
    const received = vi.fn();
    connectChat("token", "conversation-1", () => "2", received, vi.fn());
    const visibilityChanged = socket.on.mock.calls.find(([event]) => event === "message:visibility-changed")?.[1] as (message: Awaited<ReturnType<typeof sendChat>>) => void;
    const visible = { id: "message-1", sequence: "1", body: "direct source body", visibility: "VISIBLE" } as Awaited<ReturnType<typeof sendChat>>;
    const directTombstone = { id: "message-1", sequence: "1", visibility: "RESTRICTED", restrictedReasonCategory: "ABUSE_OR_HARASSMENT", tombstone: "Conversation content has been restricted under policy." } as Awaited<ReturnType<typeof sendChat>>;
    const resolutionTombstone = { id: "message-2", sequence: "2", visibility: "RESTRICTED", restrictedReasonCategory: "SPAM_OR_SCAM", tombstone: "Conversation content has been restricted under policy." } as Awaited<ReturnType<typeof sendChat>>;
    visibilityChanged(directTombstone); visibilityChanged(resolutionTombstone);
    expect(received).toHaveBeenNthCalledWith(1, directTombstone);
    expect(received).toHaveBeenNthCalledWith(2, resolutionTombstone);
    const reconciled = reconcileChatMessages(reconcileChatMessages([visible], directTombstone), resolutionTombstone);
    expect(reconciled).toEqual([directTombstone, resolutionTombstone]);
    expect(reconciled[0].body).toBeUndefined();
    expect(JSON.stringify(reconciled)).not.toContain("direct source body");
  });

  it("cursor-paginates authorized REST history to replace a tombstone beyond the first page", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `message-${index + 1}`, sequence: String(index + 1), visibility: "VISIBLE", body: "earlier history" }));
    const received = vi.fn(); get
      .mockResolvedValueOnce({ data: { items: firstPage, nextCursor: "opaque-page-100" } })
      .mockResolvedValueOnce({ data: { items: [{ id: "message-101", sequence: "101", visibility: "VISIBLE", body: "restored from history" }], nextCursor: null } });
    connectChat("token", "conversation-1", () => "1", received, vi.fn());
    const visibilityChanged = socket.on.mock.calls.find(([event]) => event === "message:visibility-changed")?.[1] as (event: unknown) => void;
    visibilityChanged({ conversationId: "conversation-1", messageId: "message-101", sequence: "101", visibility: "VISIBLE" });
    await vi.waitFor(() => expect(received).toHaveBeenCalledWith(expect.objectContaining({ id: "message-101", body: "restored from history" })));
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
