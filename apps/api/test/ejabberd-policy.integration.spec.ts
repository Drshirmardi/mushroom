import { Logger } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { randomUUID, createPublicKey, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApiApplication } from '../src/app.factory';
import { EjabberdConfig } from '../src/modules/communications/chat/ejabberd/ejabberd.config';
import type { EjabberdSessionDto } from '../src/modules/communications/chat/ejabberd/ejabberd.dto';
import { auth, createChatFixture, destroyChatFixture, openTestEngineSession, sendEngineMessage, type ChatFixture } from './chat-test-support';

describe('ejabberd private policy and durable authorization (PostgreSQL)', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture;
  let id: string;
  const policy = (session: EjabberdSessionDto, action: string, extra: Record<string, unknown> = {}) => app.inject({
    method: 'POST', url: '/v1/chat/ejabberd/policy',
    headers: { 'x-chat-policy-key': app.get(EjabberdConfig).policySecret },
    payload: { action, actorJid: `${session.jid}/sabz`, roomJid: session.roomJid, ...extra },
  });
  beforeAll(async () => { Logger.overrideLogger(false); app = await createApiApplication(); await app.init(); }, 30_000);
  beforeEach(async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    expect(conversation.statusCode).toBe(200);
    id = conversation.json().id;
  });
  afterEach(async () => { await destroyChatFixture(fixture); });
  afterAll(async () => { await app.close(); });

  it('requires the private policy secret and leaves the removed public send endpoint unavailable', async () => {
    const legacy = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: randomUUID(), body: 'must not persist' } });
    expect(legacy.statusCode).toBe(404);
    for (const headers of [{}, { 'x-chat-policy-key': 'incorrect' }]) {
      const response = await app.inject({ method: 'POST', url: '/v1/chat/ejabberd/policy', headers, payload: { action: 'SESSION', actorJid: 'unknown' } });
      expect(response.statusCode).toBe(401);
    }
    expect(await fixture.prisma.chatMessage.count({ where: { conversationId: id } })).toBe(0);
  });

  it('issues signed, distinct credentials and fences a lease evicted by the connection limit', async () => {
    const sessions: EjabberdSessionDto[] = [];
    for (let index = 0; index < 4; index++) {
      const response = await openTestEngineSession(app, fixture.tokens.patient, id);
      expect(response.statusCode).toBe(201);
      expect(response.headers['cache-control']).toBe('no-store');
      sessions.push(response.json<EjabberdSessionDto>());
    }
    expect(new Set(sessions.map(session => session.jid)).size).toBe(4);
    const last = sessions[3]!;
    const [header, payload, signature] = last.token.split('.');
    const key = createPublicKey(readFileSync(process.env.EJABBERD_JWT_PRIVATE_KEY_FILE!));
    expect(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), key, Buffer.from(signature!, 'base64url'))).toBe(true);
    expect(JSON.parse(Buffer.from(payload!, 'base64url').toString())).toMatchObject({ jid: last.jid });
    expect(Date.parse(last.expiresAt) - Date.now()).toBeLessThanOrEqual(300_000);
    expect((await policy(sessions[0]!, 'SESSION')).statusCode).toBe(403);
    expect((await policy(last, 'SESSION')).statusCode).toBe(200);
  });

  it('rechecks moderation and durable session revocation at native delivery and SEND', async () => {
    const sent = await sendEngineMessage(app, fixture.tokens.doctor, id, { clientMessageId: randomUUID(), body: 'restricted synthetic text' });
    expect(sent.statusCode).toBe(200);
    const response = await openTestEngineSession(app, fixture.tokens.patient, id);
    expect(response.statusCode).toBe(201);
    const session = response.json<EjabberdSessionDto>();
    const restricted = await app.inject({ method: 'POST', url: `/v1/chat/messages/${sent.json().messageId}/visibility`, headers: auth(fixture.tokens.admin), payload: { visibility: 'RESTRICTED', reasonCategory: 'SPAM_OR_SCAM', safeNote: 'synthetic review' } });
    expect(restricted.statusCode).toBe(201);
    const delivery = await policy(session, 'DELIVER', { messageId: sent.json().messageId });
    expect(delivery.statusCode).toBe(200);
    expect(delivery.json()).toMatchObject({ allow: true, visibility: 'RESTRICTED' });
    expect(JSON.stringify(delivery.json())).not.toContain('restricted synthetic text');
    const durableSession = await fixture.prisma.session.findFirstOrThrow({ where: { userId: fixture.users.patient.id }, select: { id: true } });
    const revoked = await app.inject({ method: 'DELETE', url: `/v1/auth/sessions/${durableSession.id}`, headers: auth(fixture.tokens.patient) });
    expect(revoked.statusCode).toBe(204);
    expect((await policy(session, 'SEND', { clientMessageId: randomUUID(), body: 'must not persist' })).statusCode).toBe(403);
    expect(await fixture.prisma.chatMessage.count({ where: { conversationId: id } })).toBe(1);
  });

  it('keeps completed visits writable until an authorized explicit chat closure', async () => {
    await fixture.prisma.appointment.update({ where: { id: fixture.appointment.id }, data: { status: 'COMPLETED', completedAt: new Date() } });
    const sent = await sendEngineMessage(app, fixture.tokens.doctor, id, { clientMessageId: randomUUID(), body: 'follow-up synthetic text' });
    expect(sent.statusCode).toBe(200);
    expect((await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/close`, headers: auth(fixture.tokens.patient) })).statusCode).toBe(403);
    const closed = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/close`, headers: auth(fixture.tokens.doctor) });
    expect(closed.statusCode).toBe(200);
    const rejected = await sendEngineMessage(app, fixture.tokens.doctor, id, { clientMessageId: randomUUID(), body: 'after closure' });
    expect(rejected.statusCode).toBe(403);
    expect(rejected.json().code).toBe('CHAT_WINDOW_CLOSED');
    expect((await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient) })).statusCode).toBe(200);
  });
});
