import { afterEach, describe, expect, it, vi } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

import { createApiApplication } from '../src/app.factory';
import { ChatRealtimeGateway } from '../src/modules/communications/chat/realtime/chat-realtime.gateway';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

const principal = { userId: '11111111-1111-4111-8111-111111111111', sessionId: '22222222-2222-4222-8222-222222222222', roles: ['PATIENT'] as const, tokenId: '33333333-3333-4333-8333-333333333333', issuedAt: 1, expiresAt: Math.floor(Date.now() / 1000) + 60 };

describe('chat realtime gateway', () => {
  it('accepts only auth-payload authentication and uses backend sync before joining a room', async () => {
    const verify = vi.fn().mockResolvedValue(principal);
    const realtimeSync = vi.fn().mockResolvedValue({ items: [], highWaterSequence: '0', nextCursor: null });
    const gateway = new ChatRealtimeGateway({ verify } as never, { realtimeSync } as never, { bind: vi.fn() } as never);
    const disconnect = vi.fn(); const join = vi.fn();
    const client = { id: 'socket-1', handshake: { query: {}, auth: { token: 'opaque-token' } }, data: {}, disconnect, join };
    gateway.server = { sockets: { sockets: new Map() } } as never;
    await gateway.handleConnection(client as never);
    expect(verify).toHaveBeenCalledWith('opaque-token');
    await expect(gateway.join(client as never, { conversationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', lastSequence: '0' })).resolves.toMatchObject({ ok: true });
    expect(realtimeSync).toHaveBeenCalled(); expect(join).toHaveBeenCalledWith('conversation:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  });

  it('rejects token-bearing query strings and never joins an arbitrary room', async () => {
    const gateway = new ChatRealtimeGateway({ verify: vi.fn() } as never, { realtimeSync: vi.fn() } as never, { bind: vi.fn() } as never);
    const disconnect = vi.fn();
    await gateway.handleConnection({ id: 'socket-2', handshake: { query: { token: 'leak' }, auth: {} }, data: {}, disconnect } as never);
    expect(disconnect).toHaveBeenCalledWith(true);
  });
});

describe('chat realtime Socket.IO integration', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture | undefined;
  let socket: Socket | undefined;

  it('authenticates from handshake auth and joins only after PostgreSQL-backed sync', async () => {
    app = await createApiApplication();
    await app.listen({ host: '127.0.0.1', port: 0 });
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const baseUrl = await app.getUrl();
    socket = io(`${baseUrl}/chat`, { auth: { token: fixture.tokens.patient }, transports: ['websocket'] });
    await new Promise<void>((resolve, reject) => { socket!.once('connect', () => resolve()); socket!.once('connect_error', reject); });
    const response = await new Promise<any>((resolve, reject) => socket!.timeout(5_000).emit('conversation:join', { conversationId: conversation.json().id, lastSequence: '0' }, (error: Error | null, value: unknown) => error ? reject(error) : resolve(value)));
    expect(response).toMatchObject({ ok: true, items: [], highWaterSequence: '0' });
    const committed = new Promise<any>((resolve) => socket!.once('message:committed', resolve));
    const sent = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${conversation.json().id}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: 'a1000000-0000-4000-8000-000000000003', body: 'realtime durable message' } });
    expect(sent.statusCode).toBe(201);
    await expect(committed).resolves.toMatchObject({ id: sent.json().id, sequence: '1', body: 'realtime durable message' });
  }, 30_000);

  afterEach(async () => { socket?.disconnect(); socket = undefined; if (fixture) await destroyChatFixture(fixture); fixture = undefined; await app?.close(); });
});
