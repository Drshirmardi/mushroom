import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('appointment-bound chat REST (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture | undefined;
  beforeAll(async () => { app = await createApiApplication(); await app.init(); }, 30_000);
  afterEach(async () => { if (fixture) await destroyChatFixture(fixture); fixture = undefined; });
  afterAll(async () => { await app.close(); });

  it('persists ordered idempotent text and serves it through a server-bound cursor', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    expect(conversation.statusCode).toBe(200);
    const id = conversation.json().id;
    const firstId = 'a1000000-0000-4000-8000-000000000001';
    const sent = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: firstId, body: '  durable message  ' } });
    const replay = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: firstId, body: 'durable message' } });
    const conflict = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: firstId, body: 'changed text' } });
    expect(sent.statusCode).toBe(201); expect(sent.json()).toMatchObject({ sequence: '1', body: 'durable message', senderKind: 'PATIENT' });
    expect(replay.statusCode).toBe(201); expect(replay.json().id).toBe(sent.json().id);
    expect(conflict.statusCode).toBe(409); expect(conflict.json().code).toBe('CHAT_IDEMPOTENCY_CONFLICT');
    const second = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.doctor), payload: { clientMessageId: 'a1000000-0000-4000-8000-000000000002', body: 'doctor reply' } });
    expect(second.json()).toMatchObject({ sequence: '2', senderKind: 'DOCTOR' });
    const history = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages?limit=1`, headers: auth(fixture.tokens.patient) });
    expect(history.statusCode).toBe(200); expect(history.json()).toMatchObject({ items: [{ sequence: '1', body: 'durable message' }], highWaterSequence: '2' });
    const next = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages?cursor=${encodeURIComponent(history.json().nextCursor)}`, headers: auth(fixture.tokens.patient) });
    expect(next.json()).toMatchObject({ items: [{ sequence: '2', body: 'doctor reply' }] });
  });

  it('rejects history and sends for a JWT whose durable session was revoked', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    expect(conversation.statusCode).toBe(200);
    const conversationId = conversation.json().id as string;

    // The active-session control proves the fixture token is usable before the
    // server persists the revocation.
    const before = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${conversationId}/messages`, headers: auth(fixture.tokens.patient) });
    expect(before.statusCode).toBe(200);

    const session = await fixture.prisma.session.findFirstOrThrow({ where: { userId: fixture.users.patient.id }, select: { id: true } });
    const revoked = await app.inject({ method: 'DELETE', url: `/v1/auth/sessions/${session.id}`, headers: auth(fixture.tokens.patient) });
    expect(revoked.statusCode).toBe(204);

    const history = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${conversationId}/messages`, headers: auth(fixture.tokens.patient) });
    const send = await app.inject({
      method: 'POST',
      url: `/v1/chat/conversations/${conversationId}/messages`,
      headers: auth(fixture.tokens.patient),
      payload: { clientMessageId: 'a1000000-0000-4000-8000-000000000003', body: 'must not persist' },
    });

    expect(history.statusCode).toBe(403);
    expect(history.json().code).toBe('CHAT_FORBIDDEN');
    expect(send.statusCode).toBe(403);
    expect(send.json().code).toBe('CHAT_FORBIDDEN');
    expect(await fixture.prisma.chatMessage.count({ where: { conversationId } })).toBe(0);
  });
});
