import { afterEach, describe, expect, it, vi } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { NestFastifyApplication } from '@nestjs/platform-fastify';

import { createApiApplication } from '../src/app.factory';
import { AccessTokenService } from '../src/common/auth/access-token.service';
import { ChatService } from '../src/modules/communications/chat/chat.service';
import { ChatRealtimeGateway } from '../src/modules/communications/chat/realtime/chat-realtime.gateway';
import { ChatRealtimePublisher } from '../src/modules/communications/chat/realtime/chat-realtime.publisher';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

const principal = { userId: '11111111-1111-4111-8111-111111111111', sessionId: '22222222-2222-4222-8222-222222222222', roles: ['PATIENT'] as const, tokenId: '33333333-3333-4333-8333-333333333333', issuedAt: 1, expiresAt: Math.floor(Date.now() / 1000) + 60 };

describe('chat realtime gateway', () => {
  it('accepts only auth-payload authentication and fences backend sync after joining an authorized room', async () => {
    const verify = vi.fn().mockResolvedValue(principal);
    const authorizeRealtimeSubscription = vi.fn().mockResolvedValue(undefined);
    const realtimeSync = vi.fn().mockResolvedValue({ items: [], highWaterSequence: '0', nextCursor: null });
    const gateway = new ChatRealtimeGateway({ verify } as never, { authorizeRealtimeSubscription, realtimeSync } as never, { bind: vi.fn() } as never, { register: vi.fn(), unregister: vi.fn() } as never, { session: { findFirst: vi.fn().mockResolvedValue({ id: principal.sessionId }) } } as never);
    const disconnect = vi.fn(); const join = vi.fn(); const leave = vi.fn();
    const client = { id: 'socket-1', handshake: { query: {}, auth: { token: 'opaque-token' } }, data: {}, disconnect, join, leave, to: () => ({ emit: vi.fn() }) };
    let authenticate: ((client: typeof client, next: (error?: Error) => void) => void) | undefined;
    gateway.afterInit({ use: vi.fn((middleware) => { authenticate = middleware; }) } as never);
    await new Promise<void>((resolve, reject) => authenticate!(client, (error) => error ? reject(error) : resolve()));
    gateway.handleConnection(client as never);
    expect(verify).toHaveBeenCalledWith('opaque-token');
    await expect(gateway.join(client as never, { conversationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', lastSequence: '0' })).resolves.toMatchObject({ ok: true });
    expect(authorizeRealtimeSubscription).toHaveBeenCalledWith(principal, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(join).toHaveBeenCalledWith('conversation:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(realtimeSync).toHaveBeenCalledWith(principal, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 0n);
    expect(join.mock.invocationCallOrder[0]).toBeLessThan(realtimeSync.mock.invocationCallOrder[0]);
  });

  it('rejects token-bearing query strings and never joins an arbitrary room', async () => {
    const gateway = new ChatRealtimeGateway({ verify: vi.fn() } as never, { authorizeRealtimeSubscription: vi.fn(), realtimeSync: vi.fn() } as never, { bind: vi.fn() } as never, { unregister: vi.fn() } as never, { session: { findFirst: vi.fn() } } as never);
    const disconnect = vi.fn();
    let authenticate: ((client: { id: string; handshake: { query: Record<string, string>; auth: Record<string, never> }; data: Record<string, never>; disconnect: ReturnType<typeof vi.fn> }, next: (error?: Error) => void) => void) | undefined;
    gateway.afterInit({ use: vi.fn((middleware) => { authenticate = middleware; }) } as never);
    const next = vi.fn();
    authenticate!({ id: 'socket-2', handshake: { query: { token: 'leak' }, auth: {} }, data: {}, disconnect } as never, next);
    await vi.waitFor(() => expect(next).toHaveBeenCalledWith(expect.any(Error)));
    expect(disconnect).not.toHaveBeenCalled();
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
    const validPrincipal = await app.get(AccessTokenService).verify(fixture.tokens.patient);
    await expect(fixture.prisma.session.findFirst({ where: { id: validPrincipal.sessionId, userId: validPrincipal.userId, revokedAt: null, expiresAt: { gt: new Date() } } })).resolves.toMatchObject({ id: validPrincipal.sessionId });
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

  it('delivers a body-free post-commit tombstone to joined participants for direct and report-resolution restriction', async () => {
    app = await createApiApplication();
    await app.listen({ host: '127.0.0.1', port: 0 });
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const conversationId = conversation.json().id;
    socket = io(`${await app.getUrl()}/chat`, { auth: { token: fixture.tokens.patient }, transports: ['websocket'] });
    await new Promise<void>((resolve, reject) => { socket!.once('connect', resolve); socket!.once('connect_error', reject); });
    const joined = await new Promise<any>((resolve, reject) => socket!.timeout(5_000).emit('conversation:join', { conversationId, lastSequence: '0' }, (error: Error | null, value: unknown) => error ? reject(error) : resolve(value)));
    expect(joined).toMatchObject({ ok: true });

    const expectTombstone = (messageId: string, sequence: string, sourceBody: string) => new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('visibility update was not delivered')), 5_000);
      socket!.once('message:visibility-changed', (event) => {
        clearTimeout(timeout);
        try {
          expect(event).toMatchObject({ id: messageId, sequence, visibility: 'RESTRICTED', tombstone: expect.any(String) });
          expect(event.body).toBeUndefined();
          expect(event.preview).toBeUndefined();
          expect(JSON.stringify(event)).not.toContain(sourceBody);
          resolve();
        } catch (error) { reject(error); }
      });
    });

    await fixture.prisma.chatMessage.createMany({ data: Array.from({ length: 100 }, (_, index) => ({
      clinicId: fixture!.clinic.id, conversationId, sequence: BigInt(index + 1), senderUserId: fixture!.users.admin.id,
      senderKind: 'CLINIC_OPERATOR', clientMessageId: `realtime-pagination-seed-${index + 1}`, requestPayloadHash: 'b'.repeat(64), body: `realtime pagination seed ${index + 1}`,
    })) });

    const directMessage = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${conversationId}/messages`, headers: auth(fixture.tokens.doctor), payload: { clientMessageId: 'a1000000-0000-4000-8000-000000000005', body: 'connected direct source body' } });
    expect(directMessage.statusCode).toBe(201);
    const directEvent = expectTombstone(directMessage.json().id, '101', 'connected direct source body');
    const direct = await app.inject({ method: 'POST', url: `/v1/chat/messages/${directMessage.json().id}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'RESTRICTED', reasonCategory: 'ABUSE_OR_HARASSMENT', safeNote: 'reviewed' } });
    expect(direct.statusCode).toBe(201);
    await directEvent;
    const restoreEvent = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('restore visibility update was not delivered')), 5_000);
      socket!.once('message:visibility-changed', (event) => {
        clearTimeout(timeout);
        try {
          expect(event).toEqual({ conversationId, messageId: directMessage.json().id, sequence: '101', visibility: 'VISIBLE' });
          expect(event.body).toBeUndefined(); expect(event.preview).toBeUndefined();
          resolve();
        } catch (error) { reject(error); }
      });
    });
    const restored = await app.inject({ method: 'POST', url: `/v1/chat/messages/${directMessage.json().id}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'VISIBLE', safeNote: 'restored' } });
    expect(restored.statusCode).toBe(201);
    await restoreEvent;

    const resolvedMessage = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${conversationId}/messages`, headers: auth(fixture.tokens.doctor), payload: { clientMessageId: 'a1000000-0000-4000-8000-000000000006', body: 'connected resolution source body' } });
    expect(resolvedMessage.statusCode).toBe(201);
    const report = await app.inject({ method: 'POST', url: `/v1/chat/messages/${resolvedMessage.json().id}/reports`, headers: auth(fixture.tokens.patient), payload: { reasonCategory: 'ABUSE_OR_HARASSMENT', requestImmediateBlock: false } });
    expect(report.statusCode).toBe(201);
    const resolutionEvent = expectTombstone(resolvedMessage.json().id, '102', 'connected resolution source body');
    const resolved = await app.inject({ method: 'POST', url: `/v1/chat/reports/${report.json().id}/resolve`, headers: auth(fixture.tokens.admin), payload: { resolution: 'UPHELD_POLICY_VIOLATION', action: 'RESTRICT_MESSAGE', safeNote: 'reviewed' } });
    expect(resolved.statusCode).toBe(200);
    await resolutionEvent;
  }, 30_000);

  it.each([
    ['one revoked session', async (app: NestFastifyApplication, sessionId: string, token: string) => app.inject({ method: 'DELETE', url: `/v1/auth/sessions/${sessionId}`, headers: auth(token) })],
    ['all revoked user sessions', async (app: NestFastifyApplication, _sessionId: string, token: string) => app.inject({ method: 'POST', url: '/v1/auth/logout-all', headers: auth(token) })],
  ])('disconnects %s before later room fan-out without another client event', async (_label, revoke) => {
    app = await createApiApplication();
    await app.listen({ host: '127.0.0.1', port: 0 });
    fixture = await createChatFixture(app);
    const principal = await app.get(AccessTokenService).verify(fixture.tokens.patient);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const conversationId = conversation.json().id as string;
    socket = io(`${await app.getUrl()}/chat`, { auth: { token: fixture.tokens.patient }, transports: ['websocket'] });
    await new Promise<void>((resolve, reject) => { socket!.once('connect', resolve); socket!.once('connect_error', reject); });
    const joined = await new Promise<any>((resolve, reject) => socket!.timeout(5_000).emit('conversation:join', { conversationId, lastSequence: '0' }, (error: Error | null, value: unknown) => error ? reject(error) : resolve(value)));
    expect(joined).toMatchObject({ ok: true });
    const received: unknown[] = [];
    socket.on('message:committed', (event) => received.push(event));
    const disconnected = new Promise<void>((resolve) => socket!.once('disconnect', () => resolve()));
    const revoked = await revoke(app, principal.sessionId, fixture.tokens.patient);
    expect(revoked.statusCode).toBe(204);
    await disconnected;
    const published = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${conversationId}/messages`, headers: auth(fixture.tokens.doctor), payload: { clientMessageId: 'a1000000-0000-4000-8000-000000000007', body: 'must not reach revoked socket' } });
    expect(published.statusCode).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(received).toEqual([]);
  }, 30_000);

  it('rejects a fresh Socket.IO handshake and buffered join for a JWT whose PostgreSQL session was revoked', async () => {
    app = await createApiApplication();
    await app.listen({ host: '127.0.0.1', port: 0 });
    fixture = await createChatFixture(app);
    const principal = await app.get(AccessTokenService).verify(fixture.tokens.patient);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const conversationId = conversation.json().id as string;
    const baseUrl = await app.getUrl();

    socket = io(`${baseUrl}/chat`, { auth: { token: fixture.tokens.patient }, transports: ['websocket'], reconnection: false });
    await new Promise<void>((resolve, reject) => { socket!.once('connect', resolve); socket!.once('connect_error', reject); });
    const joined = await new Promise<any>((resolve, reject) => socket!.timeout(5_000).emit('conversation:join', { conversationId, lastSequence: '0' }, (error: Error | null, value: unknown) => error ? reject(error) : resolve(value)));
    expect(joined).toMatchObject({ ok: true });

    const disconnected = new Promise<void>((resolve) => socket!.once('disconnect', resolve));
    const revoked = await app.inject({ method: 'DELETE', url: `/v1/auth/sessions/${principal.sessionId}`, headers: auth(fixture.tokens.patient) });
    expect(revoked.statusCode).toBe(204);
    await disconnected;

    const rejected = io(`${baseUrl}/chat`, { auth: { token: fixture.tokens.patient }, transports: ['websocket'], reconnection: false, autoConnect: false });
    const rejectedFanout: unknown[] = [];
    rejected.on('message:committed', (event) => rejectedFanout.push(event));
    const rejectedDisconnect = new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('revoked JWT Socket.IO handshake was not disconnected')), 5_000);
      rejected.once('disconnect', () => { clearTimeout(timeout); resolve(); });
      rejected.once('connect_error', () => { clearTimeout(timeout); resolve(); });
    });
    const rejectedJoin = new Promise<{ error: Error | null; value: unknown }>((resolve) => rejected.timeout(1_000).emit('conversation:join', { conversationId, lastSequence: '0' }, (error: Error | null, value: unknown) => resolve({ error, value })));
    rejected.connect();
    await rejectedDisconnect;
    expect(rejected.connected).toBe(false);
    await expect(rejectedJoin).resolves.not.toEqual(expect.objectContaining({ value: expect.objectContaining({ ok: true }) }));

    const published = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${conversationId}/messages`, headers: auth(fixture.tokens.doctor), payload: { clientMessageId: 'a1000000-0000-4000-8000-000000000009', body: 'must not reach a reconnected revoked JWT' } });
    expect(published.statusCode).toBe(201);
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(rejectedFanout).toEqual([]);
    rejected.disconnect();
  }, 30_000);

  it('recovers a committed missed visibility signal through PostgreSQL after reconnect', async () => {
    app = await createApiApplication();
    await app.listen({ host: '127.0.0.1', port: 0 });
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const conversationId = conversation.json().id as string;
    const message = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${conversationId}/messages`, headers: auth(fixture.tokens.doctor), payload: { clientMessageId: 'a1000000-0000-4000-8000-000000000008', body: 'disconnect-before-publish body' } });
    socket = io(`${await app.getUrl()}/chat`, { auth: { token: fixture.tokens.patient }, transports: ['websocket'] });
    await new Promise<void>((resolve, reject) => { socket!.once('connect', resolve); socket!.once('connect_error', reject); });
    await new Promise<any>((resolve, reject) => socket!.timeout(5_000).emit('conversation:join', { conversationId, lastSequence: '1' }, (error: Error | null, value: unknown) => error ? reject(error) : resolve(value)));
    const publisher = app.get(ChatRealtimePublisher);
    const original = publisher.messageVisibilityChanged.bind(publisher);
    const disconnected = new Promise<void>((resolve) => socket!.once('disconnect', () => resolve()));
    const publish = vi.spyOn(publisher, 'messageVisibilityChanged').mockImplementation((room, event) => { socket?.disconnect(); original(room, event); });
    const restricted = await app.inject({ method: 'POST', url: `/v1/chat/messages/${message.json().id}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'RESTRICTED', reasonCategory: 'SPAM_OR_SCAM', safeNote: 'reviewed' } });
    expect(restricted.statusCode).toBe(201);
    await disconnected;
    publish.mockRestore();
    socket = io(`${await app.getUrl()}/chat`, { auth: { token: fixture.tokens.patient }, transports: ['websocket'] });
    await new Promise<void>((resolve, reject) => { socket!.once('connect', resolve); socket!.once('connect_error', reject); });
    const rejoined = await new Promise<any>((resolve, reject) => socket!.timeout(5_000).emit('conversation:join', { conversationId, lastSequence: '1' }, (error: Error | null, value: unknown) => error ? reject(error) : resolve(value)));
    expect(rejoined).toMatchObject({ ok: true, items: [] });
    const recovered = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${conversationId}/visibility-reconciliation`, headers: auth(fixture.tokens.patient) });
    expect(recovered.statusCode).toBe(200);
    expect(recovered.json()).toMatchObject({ items: [expect.objectContaining({ message: expect.objectContaining({ id: message.json().id, visibility: 'RESTRICTED', tombstone: expect.any(String) }) })] });
    expect(JSON.stringify(recovered.json())).not.toContain('disconnect-before-publish body');
  }, 30_000);

  afterEach(async () => { socket?.disconnect(); socket = undefined; if (fixture) await destroyChatFixture(fixture); fixture = undefined; await app?.close(); });
});
