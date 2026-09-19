import { afterEach, describe, expect, it, vi } from 'vitest';

import { ChatRealtimeGateway } from '../src/modules/communications/chat/realtime/chat-realtime.gateway';

const principal = { userId: '11111111-1111-4111-8111-111111111111', sessionId: '22222222-2222-4222-8222-222222222222', roles: ['PATIENT'] as const, tokenId: '33333333-3333-4333-8333-333333333333', issuedAt: 1, expiresAt: Math.floor(Date.now() / 1000) + 3_600 };
const conversationId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('chat presence lease', () => {
  afterEach(() => vi.useRealTimers());

  it('renews only after backend eligibility and expires after 45 seconds', async () => {
    vi.useFakeTimers();
    const emit = vi.fn();
    const realtimeSync = vi.fn().mockResolvedValue({ items: [], highWaterSequence: '0', nextCursor: null });
    const gateway = new ChatRealtimeGateway({ verify: vi.fn().mockResolvedValue(principal) } as never, { realtimeSync } as never, { bind: vi.fn() } as never);
    const client = { id: 'socket-1', handshake: { query: {}, auth: { token: 'opaque-token' } }, data: {}, disconnect: vi.fn(), join: vi.fn(), to: () => ({ emit }) };
    gateway.server = { sockets: { sockets: new Map() } } as never;
    await gateway.handleConnection(client as never);
    await expect(gateway.join(client as never, { conversationId, lastSequence: '0' })).resolves.toMatchObject({ ok: true });
    expect(emit).toHaveBeenCalledWith('presence:updated', { userId: principal.userId, state: 'ONLINE' });
    await vi.advanceTimersByTimeAsync(45_000);
    expect(emit).toHaveBeenCalledWith('presence:updated', { userId: principal.userId, state: 'OFFLINE' });
    expect(realtimeSync).toHaveBeenCalledWith(principal, conversationId, 0n);
  });

  it('fails closed when the current server-side eligibility check fails', async () => {
    const emit = vi.fn();
    const gateway = new ChatRealtimeGateway({ verify: vi.fn() } as never, { realtimeSync: vi.fn().mockRejectedValue(new Error('closed')) } as never, { bind: vi.fn() } as never);
    const client = { id: 'socket-2', data: { chatPrincipal: principal }, to: () => ({ emit }) };
    await expect(gateway.heartbeat(client as never, { conversationId, lastSequence: '0' })).resolves.toEqual({ ok: false, code: 'CHAT_FORBIDDEN' });
    expect(emit).not.toHaveBeenCalled();
  });
});
