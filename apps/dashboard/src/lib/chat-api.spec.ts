import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, ioMock, socket } = vi.hoisted(() => {
  const socket = { on: vi.fn(), emit: vi.fn(), disconnect: vi.fn() };
  return { get: vi.fn(), ioMock: vi.fn(() => socket), socket };
});

vi.mock("@sabz-zendegi/api-client", () => ({ withRequestTimeout: (request: Promise<unknown>) => request }));
vi.mock("socket.io-client", () => ({ io: ioMock }));
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test", apiClient: { GET: get } }));

import { connectChat, reconcileChatMessages, type ChatMessage } from "./chat-api";

describe("dashboard chat realtime adapter", () => {
  beforeEach(() => { get.mockReset(); ioMock.mockClear(); socket.on.mockClear(); socket.emit.mockClear(); socket.disconnect.mockClear(); });

  const completeEmptyJoin = async (states: ReturnType<typeof vi.fn>, sequence = "0") => {
    const connect = socket.on.mock.calls.find(([event]) => event === "connect")?.[1] as () => void;
    connect();
    const join = socket.emit.mock.calls.at(-1)?.[2] as (sync: unknown) => void;
    join({ ok: true, items: [], nextCursor: null, highWaterSequence: sequence });
    await vi.waitFor(() => expect(states).toHaveBeenCalledWith("connected"));
    get.mockReset();
  };

  it("replaces cached visible bodies with tombstones for direct and report-resolution restriction events", async () => {
    const received = vi.fn(); const states = vi.fn();
    connectChat("token", "conversation-1", () => "2", received, states);
    await completeEmptyJoin(states, "2");
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

  it("recovers a reconnect gap larger than 150 messages through bounded authorized REST pages", async () => {
    const cached = Array.from({ length: 50 }, (_, index) => ({ id: `message-${index + 1}`, sequence: String(index + 1), visibility: "VISIBLE", body: "before disconnect" })) as ChatMessage[];
    const syncItems = Array.from({ length: 100 }, (_, index) => ({ id: `message-${index + 51}`, sequence: String(index + 51), visibility: "VISIBLE", body: "socket first page" }));
    const restItems = Array.from({ length: 51 }, (_, index) => ({ id: `message-${index + 151}`, sequence: String(index + 151), visibility: "VISIBLE", body: "postgres recovery" }));
    get.mockResolvedValueOnce({ data: { items: restItems, nextCursor: null } });
    const received = vi.fn((message: ChatMessage) => { cached.splice(0, cached.length, ...reconcileChatMessages(cached, message)); });
    connectChat("token", "conversation-1", () => "50", received, vi.fn());
    const connect = socket.on.mock.calls.find(([event]) => event === "connect")?.[1] as () => void;
    connect();
    const join = socket.emit.mock.calls[0]?.[2] as (sync: unknown) => void;
    join({ ok: true, items: syncItems, nextCursor: "opaque-after-150", highWaterSequence: "201" });
    await vi.waitFor(() => expect(cached).toHaveLength(201));
    expect(cached.map((message) => message.sequence)).toEqual(Array.from({ length: 201 }, (_, index) => String(index + 1)));
    expect(new Set(cached.map((message) => message.id))).toHaveLength(201);
    expect(get).toHaveBeenCalledWith("/v1/chat/conversations/{conversationId}/messages", expect.objectContaining({ params: { path: { conversationId: "conversation-1" }, query: { cursor: "opaque-after-150", limit: 100 } } }));
  });

  it("recovers more than one hundred REST pages through the frozen high-water without gaps or duplicates", async () => {
    const received: ChatMessage[] = []; const states = vi.fn();
    for (let page = 0; page < 101; page += 1) {
      const start = 101 + page * 100;
      get.mockResolvedValueOnce({ data: { items: Array.from({ length: 100 }, (_, index) => ({ id: `message-${start + index}`, sequence: String(start + index), visibility: "VISIBLE", body: "recovered" })), nextCursor: page === 100 ? null : `cursor-${page + 1}` } });
    }
    connectChat("token", "conversation-1", () => { return "0"; }, (message) => { received.push(message); }, states);
    const connect = socket.on.mock.calls.find(([event]) => event === "connect")?.[1] as () => void;
    connect();
    const join = socket.emit.mock.calls[0]?.[2] as (sync: unknown) => void;
    join({ ok: true, items: Array.from({ length: 100 }, (_, index) => ({ id: `message-${index + 1}`, sequence: String(index + 1), visibility: "VISIBLE", body: "socket" })), nextCursor: "cursor-0", highWaterSequence: "10200" });
    await vi.waitFor(() => expect(states).toHaveBeenCalledWith("connected"));
    expect(received.map((message) => message.sequence)).toEqual(Array.from({ length: 10_200 }, (_, index) => String(index + 1)));
    expect(new Set(received.map((message) => message.id))).toHaveLength(10_200);
  });

  it("fails recovery without reporting connected when high-water cannot be reached", async () => {
    const states = vi.fn();
    get.mockResolvedValueOnce({ data: { items: Array.from({ length: 50 }, (_, index) => ({ id: `message-${index + 101}`, sequence: String(index + 101), visibility: "VISIBLE", body: "short page" })), nextCursor: null } });
    connectChat("token", "conversation-1", () => "0", vi.fn(), states);
    const connect = socket.on.mock.calls.find(([event]) => event === "connect")?.[1] as () => void;
    connect();
    const join = socket.emit.mock.calls[0]?.[2] as (sync: unknown) => void;
    join({ ok: true, items: Array.from({ length: 100 }, (_, index) => ({ id: `message-${index + 1}`, sequence: String(index + 1), visibility: "VISIBLE", body: "socket" })), nextCursor: "cursor-0", highWaterSequence: "201" });
    await vi.waitFor(() => expect(states).toHaveBeenCalledWith("recovery-failed"));
    expect(states).not.toHaveBeenCalledWith("connected");
    expect(socket.disconnect).toHaveBeenCalledOnce();
  });

  it("does not apply an in-flight reconnect page after disconnect", async () => {
    let resolveHistory!: (value: unknown) => void;
    get.mockReturnValueOnce(new Promise((resolve) => { resolveHistory = resolve; }));
    const received = vi.fn(); connectChat("token", "conversation-1", () => "50", received, vi.fn());
    const connect = socket.on.mock.calls.find(([event]) => event === "connect")?.[1] as () => void;
    const disconnect = socket.on.mock.calls.find(([event]) => event === "disconnect")?.[1] as () => void;
    connect();
    const join = socket.emit.mock.calls[0]?.[2] as (sync: unknown) => void;
    join({ ok: true, items: Array.from({ length: 100 }, (_, index) => ({ id: `message-${index + 51}`, sequence: String(index + 51), visibility: "VISIBLE", body: "socket first page" })), nextCursor: "opaque-after-150", highWaterSequence: "201" });
    disconnect();
    resolveHistory({ data: { items: [{ id: "message-151", sequence: "151", visibility: "VISIBLE", body: "stale recovery" }], nextCursor: null } });
    await vi.waitFor(() => expect(get).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(received).not.toHaveBeenCalledWith(expect.objectContaining({ body: "stale recovery" }));
  });

  it("cursor-paginates authorized REST history to restore a tombstone beyond the first page", async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ id: `message-${index + 1}`, sequence: String(index + 1), visibility: "VISIBLE", body: "earlier history" }));
    const received = vi.fn(); const states = vi.fn();
    connectChat("token", "conversation-1", () => "1", received, states);
    await completeEmptyJoin(states, "1");
    get
      .mockResolvedValueOnce({ data: { items: firstPage, nextCursor: "opaque-page-100" } })
      .mockResolvedValueOnce({ data: { items: [{ id: "message-101", sequence: "101", visibility: "VISIBLE", body: "dashboard restored" }], nextCursor: null } });
    const visibilityChanged = socket.on.mock.calls.find(([event]) => event === "message:visibility-changed")?.[1] as (event: unknown) => void;
    visibilityChanged({ conversationId: "conversation-1", messageId: "message-101", sequence: "101", visibility: "VISIBLE" });
    await vi.waitFor(() => expect(received).toHaveBeenCalledWith(expect.objectContaining({ id: "message-101", body: "dashboard restored" })));
    expect(get).toHaveBeenNthCalledWith(1, "/v1/chat/conversations/{conversationId}/messages", expect.objectContaining({ headers: { authorization: "Bearer token" }, params: { path: { conversationId: "conversation-1" }, query: { cursor: undefined, limit: 100 } } }));
    expect(get).toHaveBeenNthCalledWith(2, "/v1/chat/conversations/{conversationId}/messages", expect.objectContaining({ params: { path: { conversationId: "conversation-1" }, query: { cursor: "opaque-page-100", limit: 100 } } }));
  });

  it("does not apply a stale restore fetch after a disconnect", async () => {
    let resolveHistory!: (value: unknown) => void;
    const received = vi.fn(); const states = vi.fn();
    connectChat("token", "conversation-1", () => "101", received, states);
    await completeEmptyJoin(states, "101");
    get.mockReturnValueOnce(new Promise((resolve) => { resolveHistory = resolve; }));
    const visibilityChanged = socket.on.mock.calls.find(([event]) => event === "message:visibility-changed")?.[1] as (event: unknown) => void;
    const disconnect = socket.on.mock.calls.find(([event]) => event === "disconnect")?.[1] as () => void;
    visibilityChanged({ conversationId: "conversation-1", messageId: "message-101", sequence: "101", visibility: "VISIBLE" });
    disconnect();
    resolveHistory({ data: { items: [{ id: "message-101", sequence: "101", visibility: "VISIBLE", body: "must not replace tombstone after disconnect" }], nextCursor: null } });
    await vi.waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(received).not.toHaveBeenCalled();
  });

  it("retries a pending restore only after the next successful join", async () => {
    let resolveFirst!: (value: unknown) => void;
    const received = vi.fn(); const states = vi.fn();
    connectChat("token", "conversation-1", () => "101", received, states);
    await completeEmptyJoin(states, "101");
    get.mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }));
    const visibilityChanged = socket.on.mock.calls.find(([event]) => event === "message:visibility-changed")?.[1] as (event: unknown) => void;
    const disconnect = socket.on.mock.calls.find(([event]) => event === "disconnect")?.[1] as () => void;
    visibilityChanged({ conversationId: "conversation-1", messageId: "message-101", sequence: "101", visibility: "VISIBLE" });
    disconnect();
    resolveFirst({ data: { items: [{ id: "message-101", sequence: "101", visibility: "VISIBLE", body: "stale" }], nextCursor: null } });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(received).not.toHaveBeenCalled();
    expect(get).toHaveBeenCalledTimes(1);
    get.mockResolvedValueOnce({ data: { items: [{ id: "message-101", sequence: "101", visibility: "VISIBLE", body: "restored after rejoin" }], nextCursor: null } });
    const connect = socket.on.mock.calls.find(([event]) => event === "connect")?.[1] as () => void;
    connect();
    const join = socket.emit.mock.calls.at(-1)?.[2] as (sync: unknown) => void;
    join({ ok: true, items: [], nextCursor: null, highWaterSequence: "101" });
    await vi.waitFor(() => expect(received).toHaveBeenCalledWith(expect.objectContaining({ body: "restored after rejoin" })));
  });
});
