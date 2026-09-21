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

  it("refreshes the restored message from authorized REST history rather than the body-free event", async () => {
    const received = vi.fn(); get.mockResolvedValue({ data: { items: [{ id: "message-1", sequence: "1", visibility: "VISIBLE", body: "dashboard restored" }] } });
    connectChat("token", "conversation-1", () => "1", received, vi.fn());
    const visibilityChanged = socket.on.mock.calls.find(([event]) => event === "message:visibility-changed")?.[1] as (event: unknown) => void;
    visibilityChanged({ conversationId: "conversation-1", messageId: "message-1", sequence: "1", visibility: "VISIBLE" });
    await vi.waitFor(() => expect(received).toHaveBeenCalledWith(expect.objectContaining({ body: "dashboard restored" })));
  });
});
