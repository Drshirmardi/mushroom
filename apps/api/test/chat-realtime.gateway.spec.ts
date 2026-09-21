import { afterEach, describe, expect, it, vi } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

import { createApiApplication } from '../src/app.factory';
import { ChatService } from '../src/modules/communications/chat/chat.service';
import { ChatRealtimeGateway } from '../src/modules/communications/chat/realtime/chat-realtime.gateway';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

const principal = { userId: '11111111-1111-4111-8111-111111111111', sessionId: '22222222-2222-4222-8222-222222222222', roles: ['PATIENT'] as const, tokenId: '33333333-3333-4333-8333-333333333333', issuedAt: 1, expiresAt: Math.floor(Date.now() / 1000) + 60 };

describe('chat realtime gateway', () => {
  it('accepts only auth-payload authentication and fences backend sync after joining an authorized room', async () => {
    const verify = vi.fn().mockResolvedValue(principal);
    const authorizeRealtimeSubscription = vi.fn().mockResolvedValue(undefined);
    const realtimeSync = vi.fn().mockResolvedValue({ items: [], highWaterSequence: '0', nextCursor: null });
    const gateway = new ChatRealtimeGateway({ verify } as never, { authorizeRealtimeSubscription, realtimeSync } as never, { bind: vi.fn() } as never);
    const disconnect = vi.fn(); const join = vi.fn(); const leave = vi.fn();
    const client = { id: 'socket-1', handshake: { query: {}, auth: { token: 'opaque-token' } }, data: {}, disconnect, join, leave, to: () => ({ emit: vi.fn() }) };
    gateway.server = { sockets: { sockets: new Map() } } as never;
    await gateway.handleConnection(client as never);
    expect(verify).toHaveBeenCalledWith('opaque-token');
    await expect(gateway.join(client as never, { conversationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', lastSequence: '0' })).resolves.toMatchObject({ ok: true });
    expect(authorizeRealtimeSubscription).toHaveBeenCalledWith(principal, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(join).toHaveBeenCalledWith('conversation:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(realtimeSync).toHaveBeenCalledWith(principal, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 0n);
    expect(join.mock.invocationCallOrder[0]).toBeLessThan(realtimeSync.mock.invocationCallOrder[0]);
  });

  it('rejects token-bearing query strings and never joins an arbitrary room', async () => {
    const gateway = new ChatRealtimeGateway({ verify: vi.fn() } as never, { authorizeRealtimeSubscription: vi.fn(), realtimeSync: vi.fn() } as never, { bind: vi.fn() } as never);
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
    const receipt = await new Promise<any>((resolve, reject) => socket!.timeout(5_000).emit('receipt:ack', { conversationId: conversation.json().id, lastDeliveredSequence: '1', lastReadSequence: '1' }, (error: Error | null, value: unknown) => error ? reject(error) : resolve(value)));
    expect(receipt).toMatchObject({ ok: true, lastDeliveredSequence: '1', lastReadSequence: '1' });
    const stale = await new Promise<any>((resolve, reject) => socket!.timeout(5_000).emit('receipt:ack', { conversationId: conversation.json().id, lastDeliveredSequence: '0', lastReadSequence: '0' }, (error: Error | null, value: unknown) => error ? reject(error) : resolve(value)));
    expect(stale).toMatchObject({ ok: true, lastDeliveredSequence: '1', lastReadSequence: '1' });
    const heartbeat = await new Promise<any>((resolve, reject) => socket!.timeout(5_000).emit('presence:heartbeat', { conversationId: conversation.json().id, lastSequence: '1' }, (error: Error | null, value: unknown) => error ? reject(error) : resolve(value)));
    expect(heartbeat).toMatchObject({ ok: true, leaseSeconds: 45 });
  }, 30_000);

  it('reconciles a PostgreSQL commit made exactly after room subscription and before join sync', async () => {
    app = await createApiApplication();
    await app.listen({ host: '127.0.0.1', port: 0 });
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const baseUrl = await app.getUrl();
    socket = io(`${baseUrl}/chat`, { auth: { token: fixture.tokens.patient }, transports: ['websocket'] });
    await new Promise<void>((resolve, reject) => { socket!.once('connect', resolve); socket!.once('connect_error', reject); });
    const realtimeEvents: any[] = [];
    const eventReceived = new Promise<void>((resolve) => socket!.on('message:committed', (message) => { realtimeEvents.push(message); resolve(); }));
    const chat = app.get(ChatService);
    const originalSync = chat.realtimeSync.bind(chat);
    let injected = false;
    const syncSpy = vi.spyOn(chat, 'realtimeSync').mockImplementation(async (...args) => {
      if (!injected) {
        injected = true;
        const committed = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${conversation.json().id}/messages`, headers: auth(fixture!.tokens.doctor), payload: { clientMessageId: 'a1000000-0000-4000-8000-000000000004', body: 'fenced durable message' } });
        expect(committed.statusCode).toBe(201);
      }
      return originalSync(...args);
    });
    const response = await new Promise<any>((resolve, reject) => socket!.timeout(5_000).emit('conversation:join', { conversationId: conversation.json().id, lastSequence: '0' }, (error: Error | null, value: unknown) => error ? reject(error) : resolve(value)));
    await eventReceived;
    syncSpy.mockRestore();
    expect(response).toMatchObject({ ok: true, highWaterSequence: '1', items: [{ sequence: '1', body: 'fenced durable message' }] });
    expect(realtimeEvents).toEqual([expect.objectContaining({ sequence: '1', body: 'fenced durable message' })]);
    const reconciled = [...new Map([...realtimeEvents, ...response.items].map((message) => [message.id, message])).values()]
      .sort((left, right) => Number(BigInt(left.sequence) - BigInt(right.sequence)));
    expect(reconciled).toEqual([expect.objectContaining({ sequence: '1', body: 'fenced durable message' })]);
  }, 30_000);

  afterEach(async () => { socket?.disconnect(); socket = undefined; if (fixture) await destroyChatFixture(fixture); fixture = undefined; await app?.close(); });
});
