import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createApiApplication } from '../src/app.factory';
import { auth, createChatFixture, destroyChatFixture, type ChatFixture } from './chat-test-support';

describe('chat moderation and conversation-scoped blocks (PostgreSQL API integration)', () => {
  let app: NestFastifyApplication;
  let fixture: ChatFixture | undefined;
  beforeAll(async () => { app = await createApiApplication(); await app.init(); }, 30_000);
  afterEach(async () => { if (fixture) await destroyChatFixture(fixture); fixture = undefined; });
  afterAll(async () => { await app.close(); });

  it('reports, blocks, restricts and audits without leaking restricted text to ordinary participants', async () => {
    fixture = await createChatFixture(app);
    const conversation = await app.inject({ method: 'GET', url: `/v1/chat/appointments/${fixture.appointment.id}/conversation`, headers: auth(fixture.tokens.patient) });
    const id = conversation.json().id;
    const doctorMessage = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.doctor), payload: { clientMessageId: 'c1000000-0000-4000-8000-000000000001', body: 'sensitive original body' } });
    const report = await app.inject({ method: 'POST', url: `/v1/chat/messages/${doctorMessage.json().id}/reports`, headers: auth(fixture.tokens.patient), payload: { reasonCategory: 'ABUSE_OR_HARASSMENT', requestImmediateBlock: true } });
    expect(report.statusCode).toBe(201);
    const blocked = await app.inject({ method: 'POST', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient), payload: { clientMessageId: 'c1000000-0000-4000-8000-000000000002', body: 'blocked reply' } });
    expect(blocked.statusCode).toBe(403); expect(blocked.json().code).toBe('CHAT_BLOCKED');
    const resolved = await app.inject({ method: 'POST', url: `/v1/chat/reports/${report.json().id}/resolve`, headers: auth(fixture.tokens.admin), payload: { resolution: 'UPHELD_POLICY_VIOLATION', action: 'RESTRICT_MESSAGE', safeNote: 'reviewed' } });
    expect(resolved.statusCode).toBe(200);
    const patientHistory = await app.inject({ method: 'GET', url: `/v1/chat/conversations/${id}/messages`, headers: auth(fixture.tokens.patient) });
    expect(patientHistory.json().items[0]).toMatchObject({ visibility: 'RESTRICTED', tombstone: expect.any(String) });
    expect(patientHistory.json().items[0].body).toBeUndefined();
    const reviewed = await app.inject({ method: 'GET', url: `/v1/chat/messages/${doctorMessage.json().id}/restricted-content`, headers: auth(fixture.tokens.admin) });
    expect(reviewed.statusCode).toBe(200); expect(reviewed.json().body).toBe('sensitive original body');
    expect(await fixture.prisma.chatAuditEvent.count({ where: { conversationId: id, action: 'RESTRICTED_CONTENT_REVIEWED' } })).toBeGreaterThan(0);
  });
});
