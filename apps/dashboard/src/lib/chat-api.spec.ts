import { beforeEach, describe, expect, it, vi } from "vitest";

const { ioMock, socket } = vi.hoisted(() => {
  const socket = { on: vi.fn(), emit: vi.fn() };
  return { ioMock: vi.fn(() => socket), socket };
});

vi.mock("socket.io-client", () => ({ io: ioMock }));
vi.mock("@/lib/api", () => ({ apiBaseUrl: "https://api.example.test", apiClient: {} }));

import { connectChat, reconcileChatMessages, type ChatMessage } from "./chat-api";

describe("dashboard chat realtime adapter", () => {
  beforeEach(() => { ioMock.mockClear(); socket.on.mockClear(); socket.emit.mockClear(); });

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
});
