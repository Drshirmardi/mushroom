import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { io, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

const emit = <T>(socket: Socket, event: string, value: object) => new Promise<T>((resolve, reject) => socket.timeout(5_000).emit(event, value, (error: Error | null, response: T) => error ? reject(error) : resolve(response)));
const connect = (url: string, token: string) => new Promise<Socket>((resolve, reject) => { const socket = io(`${url}/chat`, { auth: { token }, transports: ['websocket'], reconnection: false }); socket.once('connect', () => resolve(socket)); socket.once('connect_error', reject); });

describe('chat reconnect recovery (PostgreSQL and Socket.IO integration)', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture | undefined;
  let socket: Socket | undefined;

  afterEach(async () => { socket?.disconnect(); socket = undefined; if (fixture) await destroyChatFixture(fixture); fixture = undefined; await app?.close(); });

  it('recovers the committed sequence after a new authenticated connection without durable duplicates or restricted bodies', async () => {
    app = await createApiApplication(); await app.listen({ host: '127.0.0.1', port: 0 });
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const id = conversation.json().id as string;
    const first = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: 'a9100000-0000-4000-8000-000000000001', body: 'recovery one' } });
    expect(first.statusCode).toBe(201);
    const restricted = await app.inject({ method: 'POST', url: `/v1/chat/messages/${first.json().id}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'RESTRICTED', reasonCategory: 'ABUSE_OR_HARASSMENT', safeNote: 'reviewed' } });
    expect(restricted.statusCode).toBe(201);
    socket = await connect(await app.getUrl(), fixture.tokens.doctor);
    const sync = await emit<{ ok: boolean; items: Array<{ id: string; sequence: string; body?: string; visibility: string; tombstone?: string }> }>(socket, 'conversation:join', { conversationId: id, lastSequence: '0' });
    expect(sync).toMatchObject({ ok: true, items: [{ id: first.json().id, sequence: '1', visibility: 'RESTRICTED', tombstone: expect.any(String) }] });
    expect(sync.items[0]?.body).toBeUndefined();
    expect(JSON.stringify(sync)).not.toContain('recovery one');
    socket.disconnect();
    socket = await connect(await app.getUrl(), fixture.tokens.doctor);
    const recovered = await emit<{ ok: boolean; items: Array<{ id: string; sequence: string }> }>(socket, 'conversation:join', { conversationId: id, lastSequence: '1' });
    expect(recovered).toMatchObject({ ok: true, items: [] });
    const second = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: 'a9100000-0000-4000-8000-000000000002', body: 'recovery two' } });
    const afterGap = await emit<{ ok: boolean; items: Array<{ id: string; sequence: string }> }>(socket, 'conversation:sync', { conversationId: id, lastSequence: '1' });
    expect(second.statusCode).toBe(201);
    expect(afterGap).toMatchObject({ ok: true, items: [{ id: second.json().id, sequence: '2' }] });
  }, 30_000);
});
