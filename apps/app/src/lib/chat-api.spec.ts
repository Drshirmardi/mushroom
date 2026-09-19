import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post, ioMock, socket } = vi.hoisted(() => {
  const socket = { on: vi.fn(), emit: vi.fn() };
  return { get: vi.fn(), post: vi.fn(), ioMock: vi.fn(() => socket), socket };
});

vi.mock("@sabz-zendegi/api-client", () => ({ withRequestTimeout: (request: Promise<unknown>) => request }));
vi.mock("socket.io-client", () => ({ io: ioMock }));
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test", apiClient: { GET: get, POST: post } }));

import { connectChat, loadChat, sendChat } from "./chat-api";

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
});
